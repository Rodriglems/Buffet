import { describe, expect, it } from "vitest";

import { motivoParaNaoExcluir, type AlvoExclusao } from "@/features/usuarios/regras-exclusao";

const AUTOR = "11111111-1111-4111-8111-111111111111";

const funcionario = (extra: Partial<AlvoExclusao> = {}): AlvoExclusao => ({
  id: "22222222-2222-4222-8222-222222222222",
  nome: "Ana",
  role: "ADMIN",
  administradorInstalacao: false,
  documentos: 0,
  ...extra,
});

describe("motivoParaNaoExcluir", () => {
  it("permite excluir um usuário da equipe sem histórico", () => {
    expect(motivoParaNaoExcluir(funcionario(), AUTOR)).toBeNull();
  });

  it("trata o administrador da instalação como inexistente", () => {
    expect(motivoParaNaoExcluir(funcionario({ administradorInstalacao: true }), AUTOR)).toBe(
      "Usuário não encontrado.",
    );
  });

  it("recusa usuário que não existe na empresa", () => {
    expect(motivoParaNaoExcluir(null, AUTOR)).toBe("Usuário não encontrado.");
  });

  it("recusa excluir o próprio usuário", () => {
    expect(motivoParaNaoExcluir(funcionario({ id: AUTOR }), AUTOR)).toBe(
      "Você não pode excluir o seu próprio usuário.",
    );
  });

  it("recusa acesso de cliente do portal, que é cuidado pela lista de clientes", () => {
    expect(motivoParaNaoExcluir(funcionario({ role: "CLIENT" }), AUTOR)).toBe(
      "O acesso de clientes é removido pela lista de clientes.",
    );
  });

  it("preserva o histórico de quem enviou documentos e sugere inativar", () => {
    expect(motivoParaNaoExcluir(funcionario({ documentos: 2 }), AUTOR)).toBe(
      "Ana enviou documentos ao sistema. Para manter o histórico, deixe o usuário como Inativo.",
    );
  });
});
