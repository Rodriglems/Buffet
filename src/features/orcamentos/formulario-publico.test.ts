import assert from "node:assert/strict";
import { test } from "vitest";

import {
  descreverEscolha,
  descreverEscolhas,
  montarPedidoParaRefazer,
  intervaloHorarioValido,
  normalizarBusca,
  obterDataMinimaEvento,
  textoHorarioEvento,
} from "./formulario-publico";

test("descreve a opção escolhida sem repetir o rótulo", () => {
  assert.equal(
    descreverEscolha("Conchiglioni", "Recheio", "Recheio de bacalhau"),
    "Conchiglioni — Recheio de bacalhau",
  );
  assert.equal(
    descreverEscolha("Rondelle", "Recheio", "Quatro queijos"),
    "Rondelle — Recheio: Quatro queijos",
  );
});

test("permite eventos somente a partir de amanhã", () => {
  assert.equal(obterDataMinimaEvento(new Date(2026, 9, 24, 23, 30)), "2026-10-25");
  assert.equal(obterDataMinimaEvento(new Date(2026, 11, 31, 10, 0)), "2027-01-01");
});

test("normaliza textos do catálogo para busca", () => {
  assert.equal(normalizarBusca("Café À Bolonhesa"), "cafe a bolonhesa");
});

test("valida e descreve o horário solicitado para o evento", () => {
  assert.equal(intervaloHorarioValido("19:00", "23:00"), true);
  assert.equal(intervaloHorarioValido("19:00", "18:30"), false);
  assert.equal(intervaloHorarioValido("19:00", ""), true);
  assert.equal(textoHorarioEvento("19:00", "23:00"), "19:00 às 23:00");
  assert.equal(textoHorarioEvento("19:00", ""), "19:00");
});

const basePedido = {
  numero: "5",
  tiposConhecidos: ["Casamento", "Aniversário", "Outros"],
  formatoServico: "Almoço",
  quantidadeConvidados: 40,
  localNome: "Salão",
  cidade: "Teresina",
  servicosAdicionais: ["Serviço de garçom"],
};

test("refazer pedido repete os itens do cardápio com a opção escolhida, sem itens livres", () => {
  const pedido = montarPedidoParaRefazer({
    ...basePedido,
    tipo: "Casamento",
    itens: [
      {
        servicoId: "massa",
        descricao: "Conchiglioni — Recheio de bacalhau",
        opcoes: [
          { id: "r1", nome: "Recheio de queijo", grupo: "Recheio" },
          { id: "r2", nome: "Recheio de bacalhau", grupo: "Recheio" },
        ],
      },
      { servicoId: "bolinho", descricao: "Bolinho de bacalhau", opcoes: [] },
      { servicoId: null, descricao: "Frete", opcoes: [] },
    ],
  });
  assert.deepEqual(pedido.servicosIds, ["massa", "bolinho"]);
  assert.deepEqual(pedido.escolhas, { massa: { Recheio: "r2" } });
  assert.equal(pedido.tipoEvento, "Casamento");
  assert.equal(pedido.quantidadeConvidados, "40");
  assert.deepEqual(pedido.adicionais, ["Serviço de garçom"]);
});

test("refazer pedido: tipo de evento fora da lista vira Outros com o nome digitado", () => {
  const pedido = montarPedidoParaRefazer({ ...basePedido, tipo: "Chá revelação", itens: [] });
  assert.equal(pedido.tipoEvento, "Outros");
  assert.equal(pedido.tipoEventoOutro, "Chá revelação");
});

test("descreve o item com uma escolha de cada grupo", () => {
  assert.equal(
    descreverEscolhas("Rondelle", [
      { rotulo: "Recheio", opcao: "Recheio de queijo" },
      { rotulo: "Molho", opcao: "Pomodoro" },
    ]),
    "Rondelle — Recheio de queijo · Molho: Pomodoro",
  );
  assert.equal(descreverEscolhas("Penne", []), "Penne");
});

test("refazer pedido reconhece recheio e molho na mesma massa", () => {
  const pedido = montarPedidoParaRefazer({
    ...basePedido,
    tipo: "Casamento",
    itens: [
      {
        servicoId: "rondelle",
        descricao: "Rondelle — Recheio de queijo · Molho: Pomodoro",
        opcoes: [
          { id: "r1", nome: "Recheio de queijo", grupo: "Recheio" },
          { id: "m1", nome: "Pomodoro", grupo: "Molho" },
          { id: "m2", nome: "Bolonhesa", grupo: "Molho" },
        ],
      },
    ],
  });
  assert.deepEqual(pedido.escolhas, { rondelle: { Recheio: "r1", Molho: "m1" } });
});
