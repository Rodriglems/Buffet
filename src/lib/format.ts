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

/** Colunas TIME chegam serializadas em UTC; não aplica o fuso local do navegador. */
export function formatTime(value: string | Date): string {
  const data = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(data.getTime())) return String(value);
  return data.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

export function formatTimeRange(inicio: string | Date, fim?: string | Date | null): string {
  const inicioFormatado = formatTime(inicio);
  return fim ? `${inicioFormatado} às ${formatTime(fim)}` : inicioFormatado;
}

export function formatPercent(value: number): string {
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}
