/** Só os dígitos do telefone, sem o código do país (o formulário público guarda "+55..."). */
export function digitosDoTelefone(valor: string | null | undefined): string {
  const digitos = (valor ?? "").replace(/\D/g, "");
  return digitos.startsWith("55") && digitos.length > 11 ? digitos.slice(2) : digitos;
}

/**
 * Parte do telefone usada para reconhecer o mesmo número em formatos diferentes: os 8 últimos
 * dígitos não mudam com DDD, código do país ou o nono dígito. Vazio se o número for curto demais.
 */
export function chaveDoTelefone(valor: string | null | undefined): string {
  const digitos = digitosDoTelefone(valor);
  return digitos.length >= 8 ? digitos.slice(-8) : "";
}

export function mesmoTelefone(a: string | null | undefined, b: string | null | undefined): boolean {
  const chave = chaveDoTelefone(a);
  return chave !== "" && chave === chaveDoTelefone(b);
}
