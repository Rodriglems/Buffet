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
  horaInicio: string;
  horaFim: string;
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
  horaInicio: "",
  horaFim: "",
  quantidadeConvidados: "",
  localNome: "",
  cidade: "",
  observacoes: "",
  senha: "",
  confirmarSenha: "",
};

export { obterDataMinimaEvento } from "@/features/eventos/data-evento";

export function intervaloHorarioValido(inicio: string, fim: string): boolean {
  return !fim || fim > inicio;
}

export function textoHorarioEvento(inicio: string, fim: string): string {
  if (!inicio) return "Horário a definir";
  return fim ? `${inicio} às ${fim}` : inicio;
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
