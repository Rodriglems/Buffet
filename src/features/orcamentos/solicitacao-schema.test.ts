import { describe, expect, it } from "vitest";

import { dataPermitidaNoBrasil, hojeNoBrasil, validarSolicitacao } from "./solicitacao-schema";

const UUID = "11111111-1111-4111-8111-111111111111";
const ITEM = "22222222-2222-4222-8222-222222222222";

/** Daqui a 30 dias, ao meio-dia local, como a página envia. */
const dataFutura = () => {
  const dia = new Date();
  dia.setDate(dia.getDate() + 30);
  dia.setHours(12, 0, 0, 0);
  return dia;
};

const pedidoValido = () => ({
  token: UUID,
  nome: "Maria Teste",
  email: "",
  telefone: "(86) 99999-1234",
  whatsapp: "(86) 99999-1234",
  tipoEvento: "Casamento",
  formatoServico: "Coquetel",
  dataEvento: dataFutura(),
  horaInicio: "19:07",
  horaFim: null,
  quantidadeConvidados: 40,
  servicosIds: [ITEM],
});

describe("validarSolicitacao", () => {
  it("aceita o pedido pelo WhatsApp sem e-mail, sem senha e sem horário de término", () => {
    const dados = validarSolicitacao(pedidoValido());
    expect(dados.email).toBe("");
    expect(dados.senha).toBe("");
    expect(dados.horaFim).toBeNull();
    expect(dados.whatsapp).toBe("+5586999991234");
    expect(dados.quantidades).toEqual({});
    expect(dados.escolhas).toEqual({});
  });

  it("aceita qualquer minuto no horário de início", () => {
    expect(validarSolicitacao({ ...pedidoValido(), horaInicio: "07:43" }).horaInicio).toBe("07:43");
  });

  it("normaliza o e-mail quando ele vem preenchido", () => {
    expect(validarSolicitacao({ ...pedidoValido(), email: " Maria@Email.COM " }).email).toBe(
      "maria@email.com",
    );
  });

  it("explica cada erro com uma frase para o cliente", () => {
    const erro = (alteracao: Record<string, unknown>) => () =>
      validarSolicitacao({ ...pedidoValido(), ...alteracao });
    expect(erro({ email: "maria@" })).toThrow("Informe um e-mail válido.");
    expect(erro({ whatsapp: "123" })).toThrow("Informe um telefone e WhatsApp válidos");
    expect(erro({ dataEvento: new Date(2020, 0, 1, 12) })).toThrow(
      "A data do evento deve ser a partir de amanhã.",
    );
    expect(erro({ horaInicio: "25:00" })).toThrow("Horário inválido.");
    expect(erro({ horaFim: "18:00" })).toThrow("O horário de término deve ser posterior");
    expect(erro({ nome: "M" })).toThrow("Informe seu nome.");
    expect(erro({ quantidadeConvidados: 0 })).toThrow("Informe o número de convidados.");
    expect(erro({ servicosIds: [] })).toThrow("Revise os campos do formulário");
  });

  it("recusa o campo escondido contra robôs preenchido", () => {
    expect(() => validarSolicitacao({ ...pedidoValido(), website: "spam" })).toThrow();
  });
});

describe("data do evento no horário de Brasília", () => {
  it("hoje é o dia do Brasil, mesmo quando em UTC já é o dia seguinte", () => {
    // 23/11 às 22h em Brasília = 24/11 01h em UTC.
    expect(hojeNoBrasil(new Date("2026-11-24T01:00:00Z"))).toBe("2026-11-23");
  });

  it("às 22h de Brasília, amanhã continua permitido", () => {
    const agora = new Date("2026-11-24T01:00:00Z");
    expect(dataPermitidaNoBrasil("2026-11-24", agora)).toBe(true);
    expect(dataPermitidaNoBrasil("2026-11-23", agora)).toBe(false);
  });
});
