import assert from "node:assert/strict";
import { test } from "vitest";

import { observacaoDoCliente } from "@/features/eventos/observacoes";

test("mostra somente a observação preenchida pelo cliente", () => {
  const aviso =
    "Atenção: o formulário informou dados diferentes do cadastro do cliente (telefone). Confirme antes de atualizar o cadastro.";
  assert.equal(observacaoDoCliente(`Sem glúten.\n\n${aviso}`), "Sem glúten.");
  assert.equal(observacaoDoCliente(aviso), null);
  assert.equal(observacaoDoCliente(null), null);
});
