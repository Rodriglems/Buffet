import { describe, expect, it } from "vitest";

import { problemaNoContrato, saldoDoContrato } from "@/features/eventos/contrato";

const HOJE = "2026-11-03";

describe("saldoDoContrato", () => {
  it("calcula em centavos, sem erro de arredondamento", () => {
    expect(saldoDoContrato({ valorTotal: 0.3, valorPago: 0.1 })).toBe(0.2);
    expect(saldoDoContrato({ valorTotal: 30000, valorPago: 10000.5 })).toBe(19999.5);
  });
});

describe("problemaNoContrato", () => {
  it("aceita contrato sem pagamento, com vencimento do saldo", () => {
    expect(
      problemaNoContrato({ valorTotal: 1000, valorPago: 0, vencimentoSaldo: "2027-03-01" }, HOJE),
    ).toBeNull();
  });

  it("aceita contrato quitado sem vencimento de saldo", () => {
    expect(
      problemaNoContrato({ valorTotal: 1000, valorPago: 1000, pagoEm: "2026-10-01" }, HOJE),
    ).toBeNull();
  });

  it("exige valor total", () => {
    expect(problemaNoContrato({ valorTotal: 0, valorPago: 0 }, HOJE)).toMatch(/valor total/);
  });

  it("recusa pagamento maior que o contrato", () => {
    expect(
      problemaNoContrato({ valorTotal: 100, valorPago: 100.01, pagoEm: "2026-10-01" }, HOJE),
    ).toMatch(/maior/);
  });

  it("exige a data do pagamento recebido e recusa data futura", () => {
    expect(problemaNoContrato({ valorTotal: 100, valorPago: 100 }, HOJE)).toMatch(/recebido/);
    expect(
      problemaNoContrato({ valorTotal: 100, valorPago: 100, pagoEm: "2026-11-04" }, HOJE),
    ).toMatch(/futuro/);
  });

  it("exige o vencimento quando sobra saldo", () => {
    expect(
      problemaNoContrato({ valorTotal: 100, valorPago: 50, pagoEm: "2026-10-01" }, HOJE),
    ).toMatch(/saldo/);
  });
});
