import { describe, expect, it } from "vitest";

import { caminhoDoConvite, statusAcessoCliente } from "@/lib/acesso-cliente";

describe("statusAcessoCliente", () => {
  it("fica sem acesso enquanto não houver conta", () => {
    expect(statusAcessoCliente({ usuario: null })).toBe("SEM_ACESSO");
  });

  it("fica sem acesso com conta criada que nunca entrou", () => {
    expect(statusAcessoCliente({ usuario: { ultimoLogin: null, ativo: true } })).toBe("SEM_ACESSO");
  });

  it("fica ativo depois do primeiro acesso", () => {
    expect(statusAcessoCliente({ usuario: { ultimoLogin: "2026-11-03", ativo: true } })).toBe(
      "ATIVO",
    );
  });

  it("volta a ficar sem acesso se a conta for desativada", () => {
    expect(statusAcessoCliente({ usuario: { ultimoLogin: "2026-11-03", ativo: false } })).toBe(
      "SEM_ACESSO",
    );
  });
});

describe("caminhoDoConvite", () => {
  it("monta o link com o token", () => {
    expect(caminhoDoConvite("abc")).toBe("/ativar-acesso?token=abc");
  });
});
