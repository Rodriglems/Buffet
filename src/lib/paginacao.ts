/** Quantas páginas cabem no total (no mínimo 1, para "1 de 1" numa lista vazia). */
export function totalDePaginas(total: number, porPagina: number): number {
  return Math.max(1, Math.ceil(total / Math.max(1, porPagina)));
}

/** "21–40 de 57": a faixa de itens que a página mostra. */
export function faixaDaPagina(pagina: number, porPagina: number, total: number): string {
  if (!total) return "0 de 0";
  const inicio = (pagina - 1) * porPagina + 1;
  const fim = Math.min(total, pagina * porPagina);
  return `${inicio}–${fim} de ${total}`;
}
