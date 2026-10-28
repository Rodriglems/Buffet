import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  gerarPdfEvento,
  gerarPdfEventos,
  type DadosPdfEvento,
} from "@/features/documentos/pdf-evento.server";
import type { Prisma } from "@/generated/prisma/client";
import { serialize } from "@/lib/domain.server";
import { linhasEnderecoEmpresa, textoTelefonesEmpresa } from "@/lib/empresa-cabecalho";
import { getPrisma } from "@/lib/prisma.server";
import { assertAdminPermission, requireAuth } from "@/lib/session.server";
import { TAMANHO_MAXIMO_IMAGEM } from "@/lib/storage.server";

/** O PDF do evento fica disponível a partir da confirmação (todas as parcelas pagas). */
export const STATUS_COM_PDF = ["CONFIRMADO", "FINALIZADO"] as const;
/** Antes da confirmação, só a equipe baixa o PDF, como orçamento para enviar ao cliente. */
export const STATUS_COM_PDF_ORCAMENTO = ["ORCAMENTO", "APROVADO", "PAGAMENTO"] as const;

const ORCAMENTO_DO_PDF = {
  orderBy: [{ numero: "desc" }, { versao: "desc" }],
  include: { itens: { orderBy: { createdAt: "asc" } } },
} satisfies Prisma.OrcamentoFindFirstArgs;

function filtroCliente(auth: { role: string; usuarioId: string }) {
  return auth.role === "CLIENT" ? { cliente: { usuarioId: auth.usuarioId } } : {};
}

function montarEndereco(partes: {
  localNome?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
}): string | null {
  const rua = [partes.logradouro, partes.numero].filter(Boolean).join(", ");
  const cidade = [partes.cidade, partes.estado].filter(Boolean).join("/");
  const texto = [partes.localNome, rua, partes.bairro, cidade].filter(Boolean).join(" – ");
  return texto || null;
}

async function carregarLogo(url: string | null): Promise<Uint8Array | null> {
  if (!url) return null;
  if (url.startsWith("data:")) {
    return new Uint8Array(Buffer.from(url.slice(url.indexOf(",") + 1), "base64"));
  }
  if (!url.startsWith("https://")) return null;
  try {
    const resposta = await fetch(url, { signal: AbortSignal.timeout(5_000) });
    if (!resposta.ok) return null;
    const bytes = new Uint8Array(await resposta.arrayBuffer());
    return bytes.byteLength <= TAMANHO_MAXIMO_IMAGEM ? bytes : null;
  } catch {
    return null;
  }
}

export const listarEventosComPdf = createServerFn({ method: "GET" }).handler(async () => {
  const auth = await requireAuth();
  assertAdminPermission(auth, "documentos");
  const eventos = await getPrisma().evento.findMany({
    where: {
      empresaId: auth.empresaId,
      status: { in: [...STATUS_COM_PDF] },
      ...filtroCliente(auth),
    },
    include: {
      cliente: { select: { nome: true } },
      orcamentos: {
        where: { status: "APROVADO" },
        select: { total: true },
        orderBy: [{ numero: "desc" }, { versao: "desc" }],
        take: 1,
      },
    },
    orderBy: { dataEvento: "desc" },
    take: 300,
  });
  return serialize(eventos);
});

type Autenticacao = Awaited<ReturnType<typeof requireAuth>>;
type CacheLogos = Map<string, Promise<Uint8Array | null>>;

/** Reúne os dados do PDF de um evento confirmado (da empresa, ou do próprio cliente). */
async function dadosPdfDoEvento(auth: Autenticacao, id: string, logos: CacheLogos) {
  const evento = await getPrisma().evento.findFirst({
    where: { id, empresaId: auth.empresaId, ...filtroCliente(auth) },
    include: {
      cliente: true,
      empresa: true,
      orcamentos: { where: { status: "APROVADO" }, ...ORCAMENTO_DO_PDF, take: 1 },
    },
  });
  if (!evento) throw new Error("Evento não encontrado.");
  const confirmado = (STATUS_COM_PDF as readonly string[]).includes(evento.status);
  // O cliente só recebe o PDF depois da confirmação, quando os valores já foram combinados.
  const comoOrcamento =
    auth.role !== "CLIENT" &&
    (STATUS_COM_PDF_ORCAMENTO as readonly string[]).includes(evento.status);
  if (!confirmado && !comoOrcamento) {
    throw new Error(
      `O PDF de ${evento.cliente.nome} fica disponível quando o evento estiver confirmado.`,
    );
  }
  const orcamento =
    evento.orcamentos[0] ??
    (await getPrisma().orcamento.findFirst({
      where: { eventoId: evento.id, empresaId: auth.empresaId },
      ...ORCAMENTO_DO_PDF,
    }));
  if (comoOrcamento && !orcamento?.itens.length) {
    throw new Error("Crie o orçamento do evento antes de gerar o PDF.");
  }
  const { empresa } = evento;
  // A logo é a mesma para todos os eventos da empresa: baixa uma vez só.
  const urlLogo = empresa.logoOrcamentoUrl ?? empresa.logoUrl ?? "";
  if (!logos.has(urlLogo)) logos.set(urlLogo, carregarLogo(urlLogo || null));

  const dados: DadosPdfEvento = {
    empresa: {
      nome: empresa.nomeFantasia,
      cnpj: empresa.cnpj,
      linhasEndereco: linhasEnderecoEmpresa(empresa),
      telefones: textoTelefonesEmpresa(empresa),
      logo: await logos.get(urlLogo)!,
    },
    cliente: evento.cliente.nome,
    contato: evento.cliente.whatsapp ?? evento.cliente.telefone,
    convidados: evento.quantidadeConvidados,
    data: evento.dataEvento,
    horario: evento.horaInicio,
    endereco: montarEndereco(evento),
    itens: orcamento?.itens.map((item) => item.descricao) ?? [],
    formatoServico: evento.formatoServico,
    servicosAdicionais: evento.servicosAdicionais,
    subtotal: Number(orcamento?.subtotal ?? 0),
    desconto: Number(orcamento?.desconto ?? 0),
    total: Number(orcamento?.total ?? 0),
  };
  const dataArquivo = evento.dataEvento.toISOString().slice(0, 10);
  const prefixo = comoOrcamento ? "orcamento" : "evento";
  const nomeArquivo = `${prefixo}-${dataArquivo}-${evento.cliente.nome}`
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .toLowerCase();
  return { nomeArquivo: `${nomeArquivo}.pdf`, dados };
}

export const baixarPdfEvento = createServerFn({ method: "GET" })
  .validator((value: unknown) => z.object({ id: z.string().uuid() }).parse(value))
  .handler(async ({ data }) => {
    const auth = await requireAuth();
    assertAdminPermission(auth, "documentos");
    const { nomeArquivo, dados } = await dadosPdfDoEvento(auth, data.id, new Map());
    const bytes = await gerarPdfEvento(dados);
    return { nomeArquivo, base64: Buffer.from(bytes).toString("base64") };
  });

/**
 * Junta os cardápios escolhidos em um único PDF (um evento por página, em ordem de data),
 * para imprimir todos de uma vez.
 */
export const baixarPdfsEventos = createServerFn({ method: "POST" })
  .validator((value: unknown) =>
    z
      .object({
        ids: z
          .array(z.string().uuid())
          .min(1, "Selecione pelo menos um documento.")
          .max(50, "Selecione no máximo 50 documentos por vez."),
      })
      .parse(value),
  )
  .handler(async ({ data }) => {
    const auth = await requireAuth();
    assertAdminPermission(auth, "documentos");
    const logos: CacheLogos = new Map();
    const lista: DadosPdfEvento[] = [];
    for (const id of new Set(data.ids)) {
      lista.push((await dadosPdfDoEvento(auth, id, logos)).dados);
    }
    lista.sort((a, b) => a.data.getTime() - b.data.getTime());
    const bytes = await gerarPdfEventos(lista);
    const hoje = new Date().toISOString().slice(0, 10);
    return {
      nomeArquivo: `cardapios-eventos-${hoje}.pdf`,
      base64: Buffer.from(bytes).toString("base64"),
    };
  });

function baixarArquivo(nomeArquivo: string, base64: string, tipo: string) {
  const binario = Uint8Array.from(atob(base64), (letra) => letra.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([binario], { type: tipo }));
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Gera o PDF no servidor e abre o download no navegador. */
export async function baixarPdfDoEvento(id: string): Promise<void> {
  const { nomeArquivo, base64 } = await baixarPdfEvento({ data: { id } });
  baixarArquivo(nomeArquivo, base64, "application/pdf");
}

/** Baixa os cardápios escolhidos juntos, em um único PDF pronto para imprimir. */
export async function baixarPdfsDosEventos(ids: string[]): Promise<void> {
  const { nomeArquivo, base64 } = await baixarPdfsEventos({ data: { ids } });
  baixarArquivo(nomeArquivo, base64, "application/pdf");
}
