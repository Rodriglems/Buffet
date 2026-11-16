/**
 * Unidade e quantidade das linhas do orçamento. Padrão do buffet: cobrar por pessoa, para todos
 * os convidados. Itens do cardápio "por evento" entram como "por pessoa"; unidades específicas,
 * como "cento", continuam como foram cadastradas.
 */
export const POR_PESSOA = "por pessoa";
export const POR_EVENTO = "por evento";

export function unidadeNoOrcamento(unidadeDoCardapio: string): string {
  const unidade = unidadeDoCardapio.trim();
  return !unidade || unidade.toLowerCase() === POR_EVENTO ? POR_PESSOA : unidade;
}

export function quantidadePadrao(unidade: string, convidados: number): number {
  return unidade.toLowerCase().includes("pessoa") ? Math.max(1, convidados) : 1;
}

/**
 * Linha já salva como "por evento" e ainda sem preço (sob consulta) passa a "por pessoa" com os
 * convidados. Com preço definido ela fica como está, para não mudar um total já combinado.
 */
export function linhaComUnidadePadrao<
  T extends { unidade: string; quantidade: number; valorUnitario: number },
>(linha: T, convidados: number): T {
  if (linha.unidade.trim().toLowerCase() !== POR_EVENTO || linha.valorUnitario > 0) return linha;
  return { ...linha, unidade: POR_PESSOA, quantidade: quantidadePadrao(POR_PESSOA, convidados) };
}

/** Cobrança escolhida para o orçamento inteiro, num select só acima da tabela. */
export const POR_PRATO = "por prato";
export type Cobranca = typeof POR_PESSOA | typeof POR_PRATO;

/** Unidades que seguem a cobrança do orçamento; "cento", "kg" etc. ficam como cadastradas. */
export function segueACobranca(unidade: string): boolean {
  return [POR_PESSOA, POR_PRATO, POR_EVENTO].includes(unidade.trim().toLowerCase());
}

/** Por prato quando alguma linha já está assim; senão por pessoa (padrão do buffet). */
export function cobrancaDasLinhas(unidades: string[]): Cobranca {
  return unidades.some((unidade) => unidade.trim().toLowerCase() === POR_PRATO)
    ? POR_PRATO
    : POR_PESSOA;
}

/** Unidade e quantidade da linha na cobrança escolhida: por pessoa = convidados, por prato = 1. */
export function comCobranca(
  unidade: string,
  quantidade: number,
  cobranca: Cobranca,
  convidados: number,
): { unidade: string; quantidade: number } {
  if (!segueACobranca(unidade)) return { unidade, quantidade };
  return { unidade: cobranca, quantidade: quantidadePadrao(cobranca, convidados) };
}

/** Frete: linha fixa no fim do orçamento quando a cobrança é por prato. */
export const UNIDADE_FRETE = "frete";
export const DESCRICAO_FRETE = "Frete";

export function ehFrete(unidade: string): boolean {
  return unidade.trim().toLowerCase() === UNIDADE_FRETE;
}
