import { describe, expect, it } from "vitest";

import { faixaDaPagina, totalDePaginas } from "@/lib/paginacao";

describe("paginação", () => {
  it("conta as páginas, com pelo menos uma", () => {
    expect(totalDePaginas(0, 20)).toBe(1);
    expect(totalDePaginas(20, 20)).toBe(1);
    expect(totalDePaginas(21, 20)).toBe(2);
  });

  it("mostra a faixa de itens da página", () => {
    expect(faixaDaPagina(1, 20, 57)).toBe("1–20 de 57");
    expect(faixaDaPagina(3, 20, 57)).toBe("41–57 de 57");
    expect(faixaDaPagina(1, 20, 0)).toBe("0 de 0");
  });
});
