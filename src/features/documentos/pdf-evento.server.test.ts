import assert from "node:assert/strict";
import { test } from "vitest";

import { formatarHorarioEvento } from "@/features/documentos/pdf-evento.server";

const horario = (valor: string) => new Date(`1970-01-01T${valor}:00.000Z`);

test("formata no PDF o horário solicitado pelo cliente", () => {
  assert.equal(formatarHorarioEvento(horario("19:00"), horario("23:30")), "19:00 às 23:30");
  assert.equal(formatarHorarioEvento(horario("19:00"), null), "19:00");
  assert.equal(formatarHorarioEvento(null, null), null);
});
