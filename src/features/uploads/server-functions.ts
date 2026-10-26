import { createServerFn } from "@tanstack/react-start";

import { requirePermission } from "@/lib/session.server";
import { enviarImagem } from "@/lib/storage.server";

const DESTINOS = {
  servico: { permissao: "servicos", pasta: "servicos" },
  logo: { permissao: "configuracoes", pasta: "logos" },
} as const;

type Destino = keyof typeof DESTINOS;

export const enviarImagemArmazenamento = createServerFn({ method: "POST" })
  .validator((value: unknown) => {
    if (!(value instanceof FormData)) throw new Error("Envio de imagem inválido.");
    const destino = value.get("destino");
    const arquivo = value.get("arquivo");
    if (typeof destino !== "string" || !(destino in DESTINOS)) {
      throw new Error("Destino da imagem inválido.");
    }
    if (!(arquivo instanceof File)) throw new Error("Selecione uma imagem.");
    return { destino: destino as Destino, arquivo };
  })
  .handler(async ({ data }) => {
    const { permissao, pasta } = DESTINOS[data.destino];
    const auth = await requirePermission(permissao);
    const bytes = new Uint8Array(await data.arquivo.arrayBuffer());
    const url = await enviarImagem(`empresas/${auth.empresaId}/${pasta}`, bytes);
    return { url };
  });

/** Envia a imagem escolhida no navegador e devolve a URL pública. */
export async function uploadImagem(destino: Destino, arquivo: File): Promise<string> {
  const formData = new FormData();
  formData.set("destino", destino);
  formData.set("arquivo", arquivo);
  const { url } = await enviarImagemArmazenamento({ data: formData });
  return url;
}
