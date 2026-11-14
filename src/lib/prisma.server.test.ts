import assert from "node:assert/strict";
import { test } from "vitest";

import { erroTransitorioDoBanco } from "@/lib/prisma.server";

test("reconhece somente falhas transitórias do PostgreSQL para uma nova tentativa", () => {
  assert.equal(erroTransitorioDoBanco({ code: "P1001" }), true);
  assert.equal(erroTransitorioDoBanco({ code: "P2024" }), true);
  assert.equal(erroTransitorioDoBanco({ name: "PrismaClientInitializationError" }), true);
  assert.equal(erroTransitorioDoBanco(new Error("connection terminated unexpectedly")), true);
  assert.equal(erroTransitorioDoBanco({ code: "P2002" }), false);
  assert.equal(erroTransitorioDoBanco(new Error("Empresa não encontrada.")), false);
});
