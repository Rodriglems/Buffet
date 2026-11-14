import assert from "node:assert/strict";
import { test } from "vitest";

import {
  descreverEscolha,
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

test("permite eventos a partir do dia de hoje", () => {
  assert.equal(obterDataMinimaEvento(new Date(2026, 9, 24, 23, 30)), "2026-10-24");
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
