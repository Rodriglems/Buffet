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

/** Pedido antigo do cliente, para "Refazer pedido" abrir o formulário já preenchido. */
export type PedidoParaRefazer = {
  numero: string;
  tipoEvento: string;
  tipoEventoOutro: string;
  formatoServico: string;
  quantidadeConvidados: string;
  localNome: string;
  cidade: string;
  servicosIds: string[];
  escolhas: Record<string, string>;
  adicionais: string[];
};

type ItemAntigo = {
  servicoId: string | null;
  descricao: string;
  opcoes: { id: string; nome: string }[];
};

/**
 * Monta o pedido a partir do orçamento antigo: só itens que ainda existem no cardápio, a opção
 * escolhida (ex.: recheio) quando dá para reconhecê-la pela descrição, e o tipo de evento fora da
 * lista vira "Outros". A data fica de fora: o cliente escolhe a nova.
 */
export function montarPedidoParaRefazer(dados: {
  numero: string;
  tipo: string;
  tiposConhecidos: readonly string[];
  formatoServico: string | null;
  quantidadeConvidados: number;
  localNome: string | null;
  cidade: string | null;
  servicosAdicionais: string[];
  itens: ItemAntigo[];
}): PedidoParaRefazer {
  const servicosIds: string[] = [];
  const escolhas: Record<string, string> = {};
  for (const item of dados.itens) {
    if (!item.servicoId || servicosIds.includes(item.servicoId)) continue;
    servicosIds.push(item.servicoId);
    const descricao = normalizarBusca(item.descricao);
    const opcao = item.opcoes.find((possivel) =>
      descricao.endsWith(normalizarBusca(possivel.nome)),
    );
    if (opcao) escolhas[item.servicoId] = opcao.id;
  }
  const conhecido = dados.tiposConhecidos.includes(dados.tipo);
  return {
    numero: dados.numero,
    tipoEvento: conhecido ? dados.tipo : "Outros",
    tipoEventoOutro: conhecido ? "" : dados.tipo,
    formatoServico: dados.formatoServico ?? "",
    quantidadeConvidados: String(dados.quantidadeConvidados),
    localNome: dados.localNome ?? "",
    cidade: dados.cidade ?? "",
    servicosIds,
    escolhas,
    adicionais: dados.servicosAdicionais,
  };
}
