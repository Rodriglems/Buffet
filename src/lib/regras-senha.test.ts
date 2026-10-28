import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { gerarSenha, problemaNaSenha } from "./regras-senha";

describe("regras de senha", () => {
  it("exige 4 caracteres para clientes e 12 para a equipe", () => {
    assert.equal(problemaNaSenha("CLIENT", "1234"), null);
    assert.match(problemaNaSenha("CLIENT", "123") ?? "", /pelo menos 4/);
    assert.match(problemaNaSenha("ADMIN", "12345678901") ?? "", /pelo menos 12/);
    assert.equal(problemaNaSenha("ADMIN", "senha-forte-12"), null);
  });

  it("gera senhas que respeitam o mínimo de cada perfil", () => {
    const aleatorio = (limite: number) => Math.floor(Math.random() * limite);
    const cliente = gerarSenha("CLIENT", aleatorio);
    const equipe = gerarSenha("ADMIN", aleatorio);
    assert.match(cliente, /^\d{6}$/);
    assert.equal(equipe.length, 16);
    assert.equal(problemaNaSenha("ADMIN", equipe), null);
  });
});
