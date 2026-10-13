import assert from "node:assert/strict";
import { test } from "vitest";

import {
  cepSchema,
  cnpjSchema,
  cpfSchema,
  dateSchema,
  moneySchema,
  paginationSchema,
  phoneSchema,
  timeSchema,
  ufSchema,
} from "./primitives";

test("valida e normaliza documentos brasileiros", () => {
  assert.equal(cpfSchema.parse("529.982.247-25"), "52998224725");
  assert.equal(cnpjSchema.parse("11.222.333/0001-81"), "11222333000181");
  assert.equal(cpfSchema.safeParse("111.111.111-11").success, false);
  assert.equal(cnpjSchema.safeParse("11.222.333/0001-82").success, false);
});

test("normaliza dados de contato e endereço", () => {
  assert.equal(phoneSchema.parse("(11) 91234-5678"), "+5511912345678");
  assert.equal(cepSchema.parse("01310-100"), "01310100");
  assert.equal(ufSchema.parse("sp"), "SP");
});

test("rejeita datas e horas inexistentes", () => {
  assert.equal(dateSchema.safeParse("2025-02-29").success, false);
  assert.equal(dateSchema.parse("2024-02-29"), "2024-02-29");
  assert.equal(timeSchema.parse("09:30"), "09:30:00");
  assert.equal(timeSchema.safeParse("24:00").success, false);
});

test("mantém dinheiro como decimal textual exato", () => {
  assert.equal(moneySchema.parse("0010,50"), "10.50");
  assert.equal(moneySchema.safeParse(10.5).success, false);
  assert.equal(moneySchema.safeParse("10.999").success, false);
});

test("aplica limites e defaults de paginação", () => {
  assert.deepEqual(paginationSchema.parse({}), { page: 1, pageSize: 20 });
  assert.deepEqual(paginationSchema.parse({ page: "2", pageSize: "50" }), {
    page: 2,
    pageSize: 50,
  });
  assert.equal(paginationSchema.safeParse({ pageSize: 101 }).success, false);
});
