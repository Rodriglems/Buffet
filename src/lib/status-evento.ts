export const STATUS_EVENTO = [
  "ORCAMENTO",
  "APROVADO",
  "CONFIRMADO",
  "CANCELADO",
  "FINALIZADO",
] as const;

export type StatusEvento = (typeof STATUS_EVENTO)[number];

export const ROTULOS_STATUS_EVENTO: Record<StatusEvento, string> = {
  ORCAMENTO: "Orçamento",
  APROVADO: "Aprovado",
  CONFIRMADO: "Confirmado",
  CANCELADO: "Cancelado",
  FINALIZADO: "Finalizado",
};

export const DESCRICOES_STATUS_EVENTO: Record<StatusEvento, string> = {
  ORCAMENTO: "Proposta em elaboração ou em análise pelo cliente.",
  APROVADO: "Orçamento aprovado; falta definir o pagamento.",
  CONFIRMADO: "Pagamento definido e evento confirmado; PDF do evento disponível.",
  CANCELADO: "O evento não vai mais acontecer.",
  FINALIZADO: "O evento aconteceu e foi encerrado.",
};

export function rotuloStatusEvento(status: string): string {
  return ROTULOS_STATUS_EVENTO[status as StatusEvento] ?? status;
}

/** Sequência do fluxo exibida no indicador de etapas (Cancelado fica fora da sequência). */
export const ETAPAS_EVENTO = [
  "ORCAMENTO",
  "APROVADO",
  "CONFIRMADO",
  "FINALIZADO",
] as const satisfies readonly StatusEvento[];

export type AcaoEtapa = "APROVAR" | "CONFIRMAR" | "FINALIZAR";

const ACAO_POR_STATUS: Partial<
  Record<StatusEvento, { acao: AcaoEtapa; rotulo: string; descricao: string }>
> = {
  ORCAMENTO: {
    acao: "APROVAR",
    rotulo: "Aprovar",
    descricao: "",
  },
  // Confirmar = definir o pagamento: ao lançar as parcelas o evento fica confirmado.
  APROVADO: {
    acao: "CONFIRMAR",
    rotulo: "Confirmar",
    descricao: "Defina o pagamento para confirmar o evento.",
  },
  CONFIRMADO: {
    acao: "FINALIZAR",
    rotulo: "Finalizar",
    descricao: "Finalize depois que o evento acontecer.",
  },
};

/** O único botão de avanço disponível em cada etapa; nulo quando o evento está encerrado. */
export function acaoDaEtapa(status: string) {
  return ACAO_POR_STATUS[status as StatusEvento] ?? null;
}
