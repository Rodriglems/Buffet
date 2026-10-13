export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

export function formatBRLShort(value: number): string {
  return `R$ ${value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}

/** Recebe uma data ou ISO e devolve dd/mm/aaaa. */
export function formatDate(value: string | Date): string {
  const iso = value instanceof Date ? value.toISOString() : value;
  const [y, m, rawDay] = iso.split("-");
  const d = rawDay?.slice(0, 2);
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function formatDateTime(iso: string, time: string): string {
  return `${formatDate(iso)} às ${time}`;
}

export function formatPercent(value: number): string {
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}
