import { describe, expect, it } from "vitest";

import { calcularDescontoOrcamento } from "./calculos";

describe("calcularDescontoOrcamento", () => {
  it("aplica desconto percentual e arredonda valores monetários", () => {
    expect(calcularDescontoOrcamento(1999.99, "PERCENTUAL", 10)).toEqual({
      subtotal: 1999.99,
      desconto: 200,
      total: 1799.99,
    });
  });

  it("aplica desconto fixo sem permitir total negativo", () => {
    expect(calcularDescontoOrcamento(2000, "VALOR_FIXO", 200)).toEqual({
      subtotal: 2000,
      desconto: 200,
      total: 1800,
    });
    expect(() => calcularDescontoOrcamento(100, "VALOR_FIXO", 100.01)).toThrow(
      "O desconto não pode ser maior que o valor original.",
    );
  });

  it("rejeita percentual acima de 100", () => {
    expect(() => calcularDescontoOrcamento(100, "PERCENTUAL", 101)).toThrow(
      "O desconto percentual não pode ser maior que 100%.",
    );
  });
});
