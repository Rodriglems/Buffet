export type TipoDesconto = "VALOR_FIXO" | "PERCENTUAL";

const arredondarMoeda = (valor: number) => Math.round((valor + Number.EPSILON) * 100) / 100;

export function calcularDescontoOrcamento(
  subtotalInformado: number,
  tipo: TipoDesconto,
  valorInformado: number,
) {
  const subtotal = arredondarMoeda(subtotalInformado);
  const valor = arredondarMoeda(valorInformado);

  if (!Number.isFinite(subtotal) || subtotal < 0) {
    throw new Error("Subtotal inválido.");
  }
  if (!Number.isFinite(valor) || valor < 0) {
    throw new Error("Desconto inválido.");
  }
  if (tipo === "PERCENTUAL" && valor > 100) {
    throw new Error("O desconto percentual não pode ser maior que 100%.");
  }

  const desconto = arredondarMoeda(tipo === "PERCENTUAL" ? subtotal * (valor / 100) : valor);
  if (desconto > subtotal) {
    throw new Error("O desconto não pode ser maior que o valor original.");
  }

  return {
    subtotal,
    desconto,
    total: arredondarMoeda(Math.max(0, subtotal - desconto)),
  };
}
