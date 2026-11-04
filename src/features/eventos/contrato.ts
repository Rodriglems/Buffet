/** Contrato fechado fora do sistema: o valor combinado e o que o cliente já pagou. */
export type DadosContrato = {
  valorTotal: number;
  valorPago: number;
  /** Data (AAAA-MM-DD) em que o valor já pago foi recebido. */
  pagoEm?: string | null;
  /** Data (AAAA-MM-DD) de vencimento do saldo. */
  vencimentoSaldo?: string | null;
};

const emCentavos = (valor: number) => Math.round(valor * 100);

export function saldoDoContrato(contrato: Pick<DadosContrato, "valorTotal" | "valorPago">): number {
  return (emCentavos(contrato.valorTotal) - emCentavos(contrato.valorPago)) / 100;
}

/** Primeiro problema dos dados do contrato, ou null. `hoje` no formato AAAA-MM-DD. */
export function problemaNoContrato(contrato: DadosContrato, hoje: string): string | null {
  if (contrato.valorTotal <= 0) return "Informe o valor total do contrato.";
  if (contrato.valorPago < 0) return "O valor já pago não pode ser negativo.";
  if (saldoDoContrato(contrato) < 0) return "O valor já pago é maior que o valor do contrato.";
  if (contrato.valorPago > 0) {
    // A data real importa: o financeiro soma o recebido no mês do pagamento.
    if (!contrato.pagoEm) return "Informe quando o valor já pago foi recebido.";
    if (contrato.pagoEm > hoje) return "A data do pagamento recebido não pode estar no futuro.";
  }
  if (saldoDoContrato(contrato) > 0 && !contrato.vencimentoSaldo) {
    return "Informe o vencimento do saldo.";
  }
  return null;
}
