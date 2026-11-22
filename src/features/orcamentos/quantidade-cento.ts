import { normalizarBusca } from "@/features/orcamentos/formulario-publico";

/**
 * Quantidade dos itens vendidos por cento (salgadinhos), escolhida pelo cliente no formulário:
 * um número de porções e o tamanho de cada uma (cento ou meio cento). No orçamento tudo vira
 * centos: 3 × meio cento = 1,5 cento.
 */
export type TamanhoPorcao = "cento" | "meio";
export type QuantidadeCento = { porcoes: number; tamanho: TamanhoPorcao };

/** Teto por item, para um erro de toque não virar um pedido absurdo. */
export const MAXIMO_PORCOES = 99;

export function ehVendidoPorCento(unidade: string): boolean {
  return normalizarBusca(unidade).includes("cento");
}

export function totalEmCentos({ porcoes, tamanho }: QuantidadeCento): number {
  return tamanho === "meio" ? porcoes / 2 : porcoes;
}

/** "meio cento", "1 cento", "1½ cento", "2 centos", "2½ centos". */
export function textoCentos(centos: number): string {
  if (centos === 0.5) return "meio cento";
  const inteiros = Math.floor(centos);
  const meio = centos - inteiros >= 0.5;
  const numero = `${inteiros}${meio ? "½" : ""}`;
  return `${numero} ${inteiros >= 2 ? "centos" : "cento"}`;
}

/** Centos inteiros voltam como centos; com meio, como meios centos (ex.: 1,5 → 3 meios). */
export function quantidadeDeCentos(centos: number): QuantidadeCento {
  return Number.isInteger(centos)
    ? { porcoes: centos, tamanho: "cento" }
    : { porcoes: Math.round(centos * 2), tamanho: "meio" };
}

/** Aceita só múltiplos de meio cento, entre meio cento e o teto. */
export function centosValidos(centos: number): boolean {
  return (
    Number.isFinite(centos) &&
    centos >= 0.5 &&
    centos <= MAXIMO_PORCOES &&
    Number.isInteger(centos * 2)
  );
}
