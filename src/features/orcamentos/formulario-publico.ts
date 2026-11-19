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
  return descreverEscolhas(item, [{ rotulo, opcao }]);
}

/**
 * Item com todas as escolhas, uma por grupo:
 * "Rondelle — Recheio de queijo · Molho pomodoro" (cada parte sem repetir o rótulo).
 */
export function descreverEscolhas(item: string, partes: { rotulo: string; opcao: string }[]) {
  if (!partes.length) return item;
  const texto = partes
    .map(({ rotulo, opcao }) =>
      normalizarBusca(opcao).startsWith(normalizarBusca(rotulo)) ? opcao : `${rotulo}: ${opcao}`,
    )
    .join(" · ");
  return `${item} — ${texto}`;
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
  /** Por item, a opção escolhida em cada grupo: { [servicoId]: { Recheio: id, Molho: id } }. */
  escolhas: Record<string, Record<string, string>>;
  adicionais: string[];
};

type ItemAntigo = {
  servicoId: string | null;
  descricao: string;
  opcoes: { id: string; nome: string; grupo: string }[];
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
  const escolhas: Record<string, Record<string, string>> = {};
  for (const item of dados.itens) {
    if (!item.servicoId || servicosIds.includes(item.servicoId)) continue;
    servicosIds.push(item.servicoId);
    // As escolhas ficam depois do " — " na descrição; reconhece uma opção por grupo.
    const descricao = normalizarBusca(item.descricao.split(" — ").slice(1).join(" — "));
    const doItem: Record<string, string> = {};
    for (const opcao of item.opcoes) {
      if (!doItem[opcao.grupo] && descricao.includes(normalizarBusca(opcao.nome))) {
        doItem[opcao.grupo] = opcao.id;
      }
    }
    if (Object.keys(doItem).length) escolhas[item.servicoId] = doItem;
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
