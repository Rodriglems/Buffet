import { describe, expect, it } from "vitest";

import { lerNumero, limparNumeroDigitado } from "./numero";

describe("limparNumeroDigitado", () => {
  it("remove zeros à esquerda sem estragar decimais", () => {
    expect(limparNumeroDigitado("05")).toBe("5");
    expect(limparNumeroDigitado("00120")).toBe("120");
    expect(limparNumeroDigitado("0")).toBe("0");
    expect(limparNumeroDigitado("0.5")).toBe("0.5");
    expect(limparNumeroDigitado("")).toBe("");
  });
});

describe("lerNumero", () => {
  it("aceita vírgula e trata vazio como zero", () => {
    expect(lerNumero("7,5")).toBe(7.5);
    expect(lerNumero("")).toBe(0);
    expect(lerNumero("abc")).toBe(0);
  });
});
