import { useEffect } from "react";

const SELETOR = "table.tabela-formulario";

/** Copia o texto de cada cabeçalho para o data-label das células da mesma coluna. */
export function rotularTabela(tabela: HTMLTableElement) {
  const titulos = [...tabela.querySelectorAll("thead th")].map((th) =>
    (th.textContent ?? "").trim(),
  );
  if (!titulos.length) return;
  for (const linha of tabela.querySelectorAll("tbody tr")) {
    const celulas = [...linha.children].filter((el) => el.tagName === "TD");
    // Linhas com células mescladas (ex.: "nenhum resultado") ficam sem rótulo.
    if (celulas.length !== titulos.length) continue;
    celulas.forEach((celula, indice) => {
      const titulo = titulos[indice] ?? "";
      if (celula.getAttribute("data-label") !== titulo) celula.setAttribute("data-label", titulo);
    });
  }
}

/**
 * Mantém os rótulos dos formulários em tabela (classe "tabela-formulario") em dia, inclusive quando
 * linhas são filtradas, adicionadas ou a página muda. Roda só no navegador, depois da hidratação.
 */
export function useRotulosDeTabelas() {
  useEffect(() => {
    let agendado = false;
    const rotularTudo = () => {
      agendado = false;
      document.querySelectorAll<HTMLTableElement>(SELETOR).forEach(rotularTabela);
    };
    const agendar = () => {
      if (agendado) return;
      agendado = true;
      requestAnimationFrame(rotularTudo);
    };
    rotularTudo();
    const observador = new MutationObserver(agendar);
    observador.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observador.disconnect();
  }, []);
}
