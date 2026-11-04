import { describe, expect, it } from "vitest";

import { lerNumero, lerValorEmReais, limparNumeroDigitado } from "./numero";

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

describe("lerValorEmReais", () => {
  it("entende o ponto como separador de milhar", () => {
    expect(lerValorEmReais("30.000")).toBe(30000);
    expect(lerValorEmReais("1.250.000")).toBe(1250000);
    expect(lerValorEmReais("30.000,50")).toBe(30000.5);
  });

  it("aceita vírgula ou ponto como decimal", () => {
    expect(lerValorEmReais("30000,5")).toBe(30000.5);
    expect(lerValorEmReais("30000.50")).toBe(30000.5);
    expect(lerValorEmReais("R$ 1.500,00")).toBe(1500);
  });

  it("devolve 0 para vazio, texto ou negativo", () => {
    expect(lerValorEmReais("")).toBe(0);
    expect(lerValorEmReais("abc")).toBe(0);
    expect(lerValorEmReais("-10")).toBe(0);
  });
});
