export const ETAPAS_FORMULARIO = [
  { numero: 1, label: "Seu evento" },
  { numero: 2, label: "Cardápio" },
  { numero: 3, label: "Revisão" },
] as const;

export type DadosFormularioOrcamento = {
  nome: string;
  email: string;
  telefone: string;
  whatsapp: string;
  tipoEvento: string;
  tipoEventoOutro: string;
  formatoServico: string;
  dataEvento: string;
  quantidadeConvidados: string;
  localNome: string;
  cidade: string;
  observacoes: string;
  senha: string;
  confirmarSenha: string;
};

export const DADOS_INICIAIS_FORMULARIO: DadosFormularioOrcamento = {
  nome: "",
  email: "",
  telefone: "",
  whatsapp: "",
  tipoEvento: "",
  tipoEventoOutro: "",
  formatoServico: "",
  dataEvento: "",
  quantidadeConvidados: "",
  localNome: "",
  cidade: "",
  observacoes: "",
  senha: "",
  confirmarSenha: "",
};

/** O evento pode ser marcado a partir do dia de hoje. */
export function obterDataMinimaEvento(dataAtual = new Date()): string {
  const data = new Date(dataAtual);

  return [
    data.getFullYear(),
    String(data.getMonth() + 1).padStart(2, "0"),
    String(data.getDate()).padStart(2, "0"),
  ].join("-");
}

/**
 * Descrição do item com a opção escolhida, sem repetir o rótulo:
 * "Conchiglioni — Recheio de bacalhau" em vez de "Recheio: Recheio de bacalhau".
 */
export function descreverEscolha(item: string, rotulo: string, opcao: string): string {
  return normalizarBusca(opcao).startsWith(normalizarBusca(rotulo))
    ? `${item} — ${opcao}`
    : `${item} — ${rotulo}: ${opcao}`;
}

export function normalizarBusca(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
