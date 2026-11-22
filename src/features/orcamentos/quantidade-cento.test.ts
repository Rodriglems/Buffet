import { describe, expect, it } from "vitest";

import {
  centosValidos,
  ehVendidoPorCento,
  quantidadeDeCentos,
  textoCentos,
  totalEmCentos,
} from "@/features/orcamentos/quantidade-cento";

describe("quantidade por cento", () => {
  it("reconhece itens vendidos por cento", () => {
    expect(ehVendidoPorCento("cento")).toBe(true);
    expect(ehVendidoPorCento("Por cento")).toBe(true);
    expect(ehVendidoPorCento("por pessoa")).toBe(false);
  });

  it("converte porções em centos", () => {
    expect(totalEmCentos({ porcoes: 3, tamanho: "meio" })).toBe(1.5);
    expect(totalEmCentos({ porcoes: 2, tamanho: "cento" })).toBe(2);
  });

  it("escreve a quantidade como as pessoas falam", () => {
    expect(textoCentos(0.5)).toBe("meio cento");
    expect(textoCentos(1)).toBe("1 cento");
    expect(textoCentos(1.5)).toBe("1½ cento");
    expect(textoCentos(2)).toBe("2 centos");
    expect(textoCentos(2.5)).toBe("2½ centos");
  });

  it("volta dos centos para as porções (refazer pedido)", () => {
    expect(quantidadeDeCentos(2)).toEqual({ porcoes: 2, tamanho: "cento" });
    expect(quantidadeDeCentos(1.5)).toEqual({ porcoes: 3, tamanho: "meio" });
  });

  it("só aceita múltiplos de meio cento", () => {
    expect(centosValidos(1.5)).toBe(true);
    expect(centosValidos(0.5)).toBe(true);
    expect(centosValidos(0.3)).toBe(false);
    expect(centosValidos(0)).toBe(false);
    expect(centosValidos(500)).toBe(false);
  });
});
