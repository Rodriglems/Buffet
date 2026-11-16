import assert from "node:assert/strict";
import { test } from "vitest";

import { formatarDataEvento, formatarHorarioEvento } from "@/features/documentos/pdf-evento.server";

const horario = (valor: string) => new Date(`1970-01-01T${valor}:00.000Z`);

test("formata no PDF o horário solicitado pelo cliente", () => {
  assert.equal(formatarHorarioEvento(horario("19:00"), horario("23:30")), "19:00 às 23:30");
  assert.equal(formatarHorarioEvento(horario("19:00"), null), "19:00");
  assert.equal(formatarHorarioEvento(null, null), null);
});

test("mostra a data do evento com dia, mês e ano, sem o dia da semana", () => {
  assert.equal(formatarDataEvento(new Date("2027-02-18T00:00:00.000Z")), "18/02/2027");
});
