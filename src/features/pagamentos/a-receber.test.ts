import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  agruparPorCliente,
  descreverPrazo,
  hojeIso,
  mensagemCobranca,
  situacaoDaParcela,
} from "./a-receber";

const HOJE = "2026-10-27";
const cliente = (id: string, nome: string) => ({ id, nome, whatsapp: null, telefone: null });
const parcela = (
  id: string,
  valor: string,
  vencimento: string,
  c = cliente("c1", "Ana Souza"),
) => ({
  id,
  valor,
  numeroParcela: Number(id.slice(-1)),
  dataVencimento: `${vencimento}T00:00:00.000Z`,
  evento: { nome: "Casamento Ana", cliente: c },
});

describe("situacaoDaParcela", () => {
  it("classifica pelo vencimento, sem depender de fuso", () => {
    assert.deepEqual(situacaoDaParcela("2026-10-20T00:00:00.000Z", HOJE), {
      dias: -7,
      situacao: "ATRASADA",
    });
    assert.equal(situacaoDaParcela("2026-10-27", HOJE).situacao, "VENCE_HOJE");
    assert.equal(situacaoDaParcela("2026-11-03", HOJE).situacao, "PROXIMOS_7_DIAS");
    assert.equal(situacaoDaParcela("2026-11-04", HOJE).situacao, "A_VENCER");
    assert.equal(situacaoDaParcela("2027-01-05", "2026-12-30").dias, 6, "virada de ano");
  });

  it("descreve o prazo", () => {
    assert.equal(descreverPrazo(-1), "Atrasada há 1 dia");
    assert.equal(descreverPrazo(-3), "Atrasada há 3 dias");
    assert.equal(descreverPrazo(0), "Vence hoje");
    assert.equal(descreverPrazo(1), "Vence em 1 dia");
  });

  it("monta a data local de hoje", () => {
    assert.equal(hojeIso(new Date(2026, 0, 5, 23, 59)), "2026-01-05");
  });
});

describe("agruparPorCliente", () => {
  it("soma por cliente e coloca quem está em atraso primeiro", () => {
    const bruno = cliente("c2", "Bruno Lima");
    const grupos = agruparPorCliente(
      [
        parcela("p1", "100.00", "2026-11-10"),
        parcela("p2", "50.00", "2026-10-30", bruno),
        parcela("p3", "200.00", "2026-10-20"),
      ],
      HOJE,
    );
    assert.equal(grupos[0]!.cliente.nome, "Ana Souza");
    assert.equal(grupos[0]!.total, 300);
    assert.equal(grupos[0]!.emAtraso, 200);
    assert.deepEqual(
      grupos[0]!.parcelas.map((p) => p.id),
      ["p3", "p1"],
      "parcelas do cliente em ordem de vencimento",
    );
    assert.equal(grupos[1]!.cliente.nome, "Bruno Lima");
    assert.equal(grupos[1]!.emAtraso, 0);
  });
});

describe("mensagemCobranca", () => {
  it("lista as parcelas com total e marca o atraso", () => {
    const texto = mensagemCobranca(
      "Ana Souza",
      [parcela("p1", "200.00", "2026-10-20"), parcela("p2", "100.00", "2026-11-10")],
      HOJE,
    );
    assert.match(texto, /^Olá, Ana!/);
    assert.match(texto, /parcela 1: R\$\s?200,00, vencimento 20\/10\/2026 \(em atraso\)/);
    assert.match(texto, /Total: R\$\s?300,00\./);
  });
});
