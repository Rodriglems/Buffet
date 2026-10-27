import { randomUUID } from "node:crypto";

import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export const TAMANHO_MAXIMO_IMAGEM = 2 * 1024 * 1024;

const EXTENSOES = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" } as const;
type TipoImagem = keyof typeof EXTENSOES;

type ConfigR2 = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl: string;
};

function lerConfig(): ConfigR2 | null {
  const accountId = process.env["R2_ACCOUNT_ID"]?.trim();
  const accessKeyId = process.env["R2_ACCESS_KEY_ID"]?.trim();
  const secretAccessKey = process.env["R2_SECRET_ACCESS_KEY"]?.trim();
  const bucket = process.env["R2_BUCKET"]?.trim();
  const publicUrl = process.env["R2_PUBLIC_URL"]?.trim().replace(/\/+$/, "");
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket, publicUrl };
}

let cliente: { config: ConfigR2; s3: S3Client } | null = null;

function obterR2() {
  if (cliente) return cliente;
  const config = lerConfig();
  if (!config) {
    throw new Error(
      "Armazenamento de imagens não configurado. Defina as variáveis R2_* no arquivo .env.",
    );
  }
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  });
  cliente = { config, s3 };
  return cliente;
}

/** Identifica o tipo real pelo conteúdo do arquivo, sem confiar no tipo informado pelo navegador. */
export function detectarTipoImagem(bytes: Uint8Array): TipoImagem | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  const ascii = (inicio: number, fim: number) => String.fromCharCode(...bytes.slice(inicio, fim));
  if (bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") {
    return "image/webp";
  }
  return null;
}

export async function enviarImagem(pasta: string, bytes: Uint8Array): Promise<string> {
  if (bytes.byteLength > TAMANHO_MAXIMO_IMAGEM) {
    throw new Error("A imagem deve ter no máximo 2 MB.");
  }
  const tipo = detectarTipoImagem(bytes);
  if (!tipo) throw new Error("Escolha uma imagem PNG, JPG ou WebP.");

  const { config, s3 } = obterR2();
  const chave = `${pasta}/${randomUUID()}.${EXTENSOES[tipo]}`;
  await s3.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: chave,
      Body: bytes,
      ContentType: tipo,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  return `${config.publicUrl}/${chave}`;
}

/** Retorna se a URL aponta para um arquivo deste bucket. */
export function ehUrlDoArmazenamento(url: string | null | undefined): url is string {
  const config = lerConfig();
  return Boolean(config && url?.startsWith(`${config.publicUrl}/`));
}

/** Remove o arquivo antigo sem interromper a operação principal se o R2 falhar. */
export async function removerImagem(url: string | null | undefined): Promise<void> {
  if (!ehUrlDoArmazenamento(url)) return;
  const { config, s3 } = obterR2();
  const chave = url.slice(config.publicUrl.length + 1);
  await s3
    .send(new DeleteObjectCommand({ Bucket: config.bucket, Key: chave }))
    .catch((error: unknown) => console.error("Falha ao remover imagem do R2.", error));
}
