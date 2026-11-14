import assert from "node:assert/strict";
import { test } from "vitest";

import { dataEventoEhFutura, obterDataMinimaEvento } from "@/features/eventos/data-evento";

test("não permite cadastrar evento para hoje ou para uma data passada", () => {
  const agora = new Date(2026, 10, 14, 18, 30);

  assert.equal(obterDataMinimaEvento(agora), "2026-11-15");
  assert.equal(dataEventoEhFutura("2026-11-13", agora), false);
  assert.equal(dataEventoEhFutura("2026-11-14", agora), false);
  assert.equal(dataEventoEhFutura("2026-11-15", agora), true);
});
