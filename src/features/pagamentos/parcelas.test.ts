import { describe, expect, it } from "vitest";

import { planejarParcelas, somarIntervalo } from "./parcelas";

describe("planejarParcelas", () => {
  it("divide o total e coloca a sobra de centavos na última parcela", () => {
    const parcelas = planejarParcelas({
      total: 1000,
      quantidade: 3,
      primeiroVencimento: "2026-11-10",
      intervalo: { tipo: "mensal" },
    });
    expect(parcelas.map((parcela) => parcela.valor)).toEqual([333.33, 333.33, 333.34]);
    expect(parcelas.map((parcela) => parcela.dataVencimento)).toEqual([
      "2026-11-10",
      "2026-12-10",
      "2027-01-10",
    ]);
    expect(parcelas[2]?.descricao).toBe("Parcela 3 de 3");
  });

  it("usa intervalos em dias", () => {
    const parcelas = planejarParcelas({
      total: 620,
      quantidade: 2,
      primeiroVencimento: "2026-10-27",
      intervalo: { tipo: "dias", dias: 15 },
    });
    expect(parcelas).toEqual([
      { valor: 310, dataVencimento: "2026-10-27", descricao: "Parcela 1 de 2" },
      { valor: 310, dataVencimento: "2026-11-11", descricao: "Parcela 2 de 2" },
    ]);
  });
});

describe("somarIntervalo", () => {
  it("leva o dia 31 para o último dia de meses mais curtos", () => {
    expect(somarIntervalo("2027-01-31", { tipo: "mensal" }, 1)).toBe("2027-02-28");
    expect(somarIntervalo("2027-01-31", { tipo: "mensal" }, 2)).toBe("2027-03-31");
  });
});
