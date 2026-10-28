import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { valoresParaCliente } from "./valores-cliente";

const orcamento = {
  enviadoEm: null as string | null,
  subtotal: "500.00",
  descontoValor: "10.00",
  desconto: "50.00",
  total: "450.00",
  itens: [
    {
      descricao: "Bolo",
      valorUnitario: "500.00",
      desconto: "0.00",
      valorTotal: "500.00",
      servico: { nome: "Bolo", precoBase: "500.00" },
    },
  ],
};

describe("valoresParaCliente", () => {
  it("zera os valores para o cliente antes do envio", () => {
    const visto = valoresParaCliente({ role: "CLIENT" }, orcamento);
    assert.equal(visto.total, "0.00");
    assert.equal(visto.subtotal, "0.00");
    assert.equal(visto.desconto, "0.00");
    assert.equal(visto.itens[0]!.valorTotal, "0.00");
    assert.equal(visto.itens[0]!.servico.precoBase, "0.00");
    assert.equal(visto.itens[0]!.descricao, "Bolo");
    assert.equal(orcamento.total, "450.00", "não altera o objeto original");
  });

  it("mostra os valores depois do envio", () => {
    const enviado = { ...orcamento, enviadoEm: "2026-10-27T12:00:00.000Z" };
    assert.equal(valoresParaCliente({ role: "CLIENT" }, enviado).total, "450.00");
  });

  it("não altera nada para a equipe", () => {
    assert.equal(valoresParaCliente({ role: "ADMIN" }, orcamento).total, "450.00");
  });
});
