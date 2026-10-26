export const FORMAS_PAGAMENTO = [
  "PIX",
  "Dinheiro",
  "Cartão de crédito",
  "Cartão de débito",
  "Transferência",
  "Boleto",
] as const;

export type IntervaloParcelas = { tipo: "mensal" } | { tipo: "dias"; dias: number };

export type ParcelaPlanejada = {
  valor: number;
  /** Data no formato AAAA-MM-DD. */
  dataVencimento: string;
  descricao: string;
};

function paraIso(ano: number, mes: number, dia: number): string {
  return [ano, String(mes + 1).padStart(2, "0"), String(dia).padStart(2, "0")].join("-");
}

/** Soma o intervalo à data; no mensal, dias que não existem no mês caem no último dia (31/01 → 28/02). */
export function somarIntervalo(dataIso: string, intervalo: IntervaloParcelas, vezes: number) {
  const [ano, mes, dia] = dataIso.split("-").map(Number) as [number, number, number];
  if (intervalo.tipo === "dias") {
    const data = new Date(Date.UTC(ano, mes - 1, dia + intervalo.dias * vezes));
    return paraIso(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate());
  }
  const alvo = new Date(Date.UTC(ano, mes - 1 + vezes, 1));
  const ultimoDia = new Date(
    Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return paraIso(alvo.getUTCFullYear(), alvo.getUTCMonth(), Math.min(dia, ultimoDia));
}

/** Divide o total em parcelas iguais; os centavos que sobram vão para a última parcela. */
export function planejarParcelas(input: {
  total: number;
  quantidade: number;
  primeiroVencimento: string;
  intervalo: IntervaloParcelas;
}): ParcelaPlanejada[] {
  const quantidade = Math.max(1, Math.floor(input.quantidade));
  const totalCentavos = Math.round(input.total * 100);
  const base = Math.floor(totalCentavos / quantidade);
  return Array.from({ length: quantidade }, (_, indice) => {
    const centavos = indice === quantidade - 1 ? totalCentavos - base * (quantidade - 1) : base;
    return {
      valor: centavos / 100,
      dataVencimento: somarIntervalo(input.primeiroVencimento, input.intervalo, indice),
      descricao: quantidade === 1 ? "Parcela única" : `Parcela ${indice + 1} de ${quantidade}`,
    };
  });
}
