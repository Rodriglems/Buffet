const PREFIXO_DIVERGENCIA =
  "Atenção: o formulário informou dados diferentes do cadastro do cliente";

/** Remove avisos internos antigos e devolve somente o texto escrito no campo de observações. */
export function observacaoDoCliente(valor: string | null | undefined): string | null {
  const texto = valor
    ?.split(/\n{2,}/)
    .map((trecho) => trecho.trim())
    .filter((trecho) => trecho && !trecho.startsWith(PREFIXO_DIVERGENCIA))
    .join("\n\n")
    .trim();
  return texto || null;
}
