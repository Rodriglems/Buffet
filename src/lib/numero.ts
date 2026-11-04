/** Remove zeros à esquerda do que foi digitado ("05" → "5", "007,5" → "7,5"), mantendo "0" e "0.5". */
export function limparNumeroDigitado(valor: string): string {
  return valor.replace(/^0+(?=\d)/, "");
}

/** Converte o texto de um campo numérico; vazio ou inválido vira 0. */
export function lerNumero(valor: string): number {
  const numero = Number(valor.replace(",", "."));
  return Number.isFinite(numero) ? numero : 0;
}

/**
 * Lê um valor em reais como as pessoas digitam: "30.000", "30.000,50", "30000,5" ou "30000.50".
 * Ponto seguido de exatamente 3 dígitos é separador de milhar. Vazio ou inválido vira 0.
 */
export function lerValorEmReais(valor: string): number {
  const texto = valor.replace(/[R$\s]/g, "");
  if (!texto) return 0;
  const normalizado = texto.includes(",")
    ? texto.replace(/\./g, "").replace(",", ".")
    : /^\d{1,3}(\.\d{3})+$/.test(texto)
      ? texto.replace(/\./g, "")
      : texto;
  const numero = Number(normalizado);
  return Number.isFinite(numero) && numero >= 0 ? Math.round(numero * 100) / 100 : 0;
}
