import { useState } from "react";

import { totalDePaginas } from "@/lib/paginacao";

/**
 * Pagina na tela uma lista que já veio inteira e filtrada (clientes, eventos). Volta para a
 * página 1 sempre que a chave dos filtros muda, e nunca passa da última página (ex.: depois de
 * excluir o último item da página).
 */
export function usePaginacaoLocal<T>(itens: T[], porPagina: number, chaveFiltros: string) {
  const [pagina, setPagina] = useState(1);
  const [chaveAnterior, setChaveAnterior] = useState(chaveFiltros);
  if (chaveFiltros !== chaveAnterior) {
    setChaveAnterior(chaveFiltros);
    setPagina(1);
  }
  const paginaAtual = Math.min(pagina, totalDePaginas(itens.length, porPagina));
  const inicio = (paginaAtual - 1) * porPagina;
  return {
    pagina: paginaAtual,
    setPagina,
    itensDaPagina: itens.slice(inicio, inicio + porPagina),
    total: itens.length,
  };
}
