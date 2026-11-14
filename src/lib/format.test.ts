import assert from "node:assert/strict";
import { test } from "vitest";

import { formatTime, formatTimeRange } from "@/lib/format";

test("formata horários do evento sem deslocamento de fuso", () => {
  const inicio = "1970-01-01T19:00:00.000Z";
  const fim = "1970-01-01T23:30:00.000Z";
  assert.equal(formatTime(inicio), "19:00");
  assert.equal(formatTimeRange(inicio, fim), "19:00 às 23:30");
});
