import assert from "node:assert/strict";
import { test } from "vitest";

import {
  clienteCreateSchema,
  clienteUpdateSchema,
  documentoUpdateSchema,
  empresaUpdateSchema,
  eventoCreateSchema,
  eventoUpdateSchema,
  leadUpdateSchema,
  notificacaoUpdateSchema,
  orcamentoCreateSchema,
  orcamentoItemUpdateSchema,
  orcamentoItemCreateSchema,
  orcamentoUpdateSchema,
  pagamentoCreateSchema,
  pagamentoUpdateSchema,
  servicoUpdateSchema,
  usuarioUpdateSchema,
  custoUpdateSchema,
} from "./entities";

const id = "d9428888-122b-4e1c-8ad1-2cc6274810f7";

test("disponibiliza update parcial para todas as 12 entidades", () => {
  const updateSchemas = [
    empresaUpdateSchema,
    usuarioUpdateSchema,
    clienteUpdateSchema,
    leadUpdateSchema,
    eventoUpdateSchema,
    servicoUpdateSchema,
    orcamentoUpdateSchema,
    orcamentoItemUpdateSchema,
    pagamentoUpdateSchema,
    custoUpdateSchema,
    notificacaoUpdateSchema,
    documentoUpdateSchema,
  ];
  assert.equal(updateSchemas.length, 12);
  for (const schema of updateSchemas) {
    assert.equal(schema.safeParse({}).success, true);
  }
});

test("valida documento conforme o tipo de pessoa", () => {
  const result = clienteCreateSchema.safeParse({
    empresaId: id,
    nome: "Cliente",
    tipoPessoa: "JURIDICA",
    cpfCnpj: "529.982.247-25",
  });
  assert.equal(result.success, false);
});

test("valida a ordem dos horários do evento", () => {
  const result = eventoCreateSchema.safeParse({
    empresaId: id,
    clienteId: id,
    nome: "Casamento",
    tipo: "Casamento",
    dataEvento: "2026-12-10",
    horaInicio: "20:00",
    horaFim: "19:00",
    quantidadeConvidados: 100,
  });
  assert.equal(result.success, false);
});

test("calcula totais monetários sem ponto flutuante", () => {
  assert.equal(
    orcamentoCreateSchema.safeParse({
      empresaId: id,
      eventoId: id,
      numero: "1",
      subtotal: "100.10",
      desconto: "0.20",
      total: "99.89",
    }).success,
    false,
  );
  assert.equal(
    orcamentoCreateSchema.safeParse({
      empresaId: id,
      eventoId: id,
      numero: "1",
      subtotal: "100.10",
      desconto: "0.20",
      total: "99.90",
    }).success,
    true,
  );
  assert.equal(
    orcamentoItemCreateSchema.safeParse({
      orcamentoId: id,
      descricao: "Buffet",
      quantidade: "1.500",
      unidade: "pessoa",
      valorUnitario: "10.00",
      desconto: "0.00",
      valorTotal: "15.00",
    }).success,
    true,
  );
});

test("exige datas coerentes para pagamentos", () => {
  assert.equal(
    pagamentoCreateSchema.safeParse({
      empresaId: id,
      eventoId: id,
      numeroParcela: 1,
      valor: "100.00",
      dataVencimento: "2026-10-10",
      status: "PAGO",
    }).success,
    false,
  );
});
