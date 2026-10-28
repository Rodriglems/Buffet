const CAMPOS_ORCAMENTO = ["subtotal", "descontoValor", "desconto", "total"];
const CAMPOS_ITEM = ["valorUnitario", "desconto", "valorTotal"];

/**
 * O cliente só vê valores depois que a equipe envia o orçamento (`enviadoEm`). Antes disso,
 * mesmo itens com preço fixo no cardápio chegam zerados. Recebe o objeto já serializado.
 */
export function valoresParaCliente<T extends { enviadoEm?: unknown }>(
  auth: { role: string },
  orcamento: T,
): T {
  if (auth.role !== "CLIENT" || orcamento.enviadoEm) return orcamento;
  const copia: Record<string, unknown> = { ...orcamento };
  for (const campo of CAMPOS_ORCAMENTO) if (campo in copia) copia[campo] = "0.00";
  const itens = copia["itens"];
  if (Array.isArray(itens)) {
    copia["itens"] = itens.map((item: Record<string, unknown>) => {
      const novo: Record<string, unknown> = { ...item };
      for (const campo of CAMPOS_ITEM) if (campo in novo) novo[campo] = "0.00";
      const servico = novo["servico"];
      if (servico && typeof servico === "object")
        novo["servico"] = { ...servico, precoBase: "0.00" };
      return novo;
    });
  }
  return copia as T;
}
