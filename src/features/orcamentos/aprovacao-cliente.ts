import { formatBRL } from "@/lib/format";

/**
 * Aprovação do orçamento pelo cliente, no portal. Mesma regra do servidor (aprovarOrcamento):
 * o orçamento foi enviado pela equipe, está num status que aceita aprovação e o evento ainda
 * está na etapa "Orçamento".
 */
export const STATUS_AGUARDANDO_CLIENTE = [
  "ENVIADO",
  "VISUALIZADO",
  "AGUARDANDO_APROVACAO",
  "EM_NEGOCIACAO",
] as const;

export function aguardaAprovacaoDoCliente(orcamento: {
  status: string;
  enviadoEm?: unknown;
  evento: { status: string };
}): boolean {
  return (
    Boolean(orcamento.enviadoEm) &&
    orcamento.evento.status === "ORCAMENTO" &&
    (STATUS_AGUARDANDO_CLIENTE as readonly string[]).includes(orcamento.status)
  );
}

/**
 * Status que o cliente vê no orçamento: a etapa do evento (o que a equipe muda na tela do
 * evento), e não o controle interno do orçamento (Enviado, Visualizado...). Se o próprio
 * orçamento foi encerrado (recusado, expirado, cancelado), isso é o que importa mostrar.
 */
export function statusParaCliente(orcamento: {
  status: string;
  evento: { status: string };
}): string {
  return ["REJEITADO", "EXPIRADO", "CANCELADO"].includes(orcamento.status)
    ? orcamento.status
    : orcamento.evento.status;
}

type DadosOrcamento = { numero: string; tipoEvento: string; data: string };

/** Mensagem pronta do "Pedir alteração": a equipe já sabe de qual orçamento se trata. */
export function mensagemPedirAlteracao(dados: DadosOrcamento): string {
  return `Olá! Quero alterar o orçamento #${dados.numero} (${dados.tipoEvento}, ${dados.data}): `;
}

/** Mensagem pronta depois de aprovar: avisa o buffet e já puxa a conversa do pagamento. */
export function mensagemAvisarAprovacao(dados: DadosOrcamento & { total: number }): string {
  return `Olá! Aprovei o orçamento #${dados.numero} (${dados.tipoEvento}, ${dados.data}) no valor de ${formatBRL(dados.total)}. Como faço o pagamento?`;
}

/**
 * Data e hora da aprovação no fuso do Brasil ("20/11/2026 às 14:32"). O fuso é fixo para o
 * servidor e o navegador mostrarem o mesmo texto.
 */
export function formatarMomento(valor: string | Date): string {
  const data = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(data.getTime())) return "";
  const fuso = { timeZone: "America/Sao_Paulo" } as const;
  const dia = data.toLocaleDateString("pt-BR", fuso);
  const hora = data.toLocaleTimeString("pt-BR", { ...fuso, hour: "2-digit", minute: "2-digit" });
  return `${dia} às ${hora}`;
}
