/** Remove zeros à esquerda do que foi digitado ("05" → "5", "007,5" → "7,5"), mantendo "0" e "0.5". */
export function limparNumeroDigitado(valor: string): string {
  return valor.replace(/^0+(?=\d)/, "");
}

/** Converte o texto de um campo numérico; vazio ou inválido vira 0. */
export function lerNumero(valor: string): number {
  const numero = Number(valor.replace(",", "."));
  return Number.isFinite(numero) ? numero : 0;
}
