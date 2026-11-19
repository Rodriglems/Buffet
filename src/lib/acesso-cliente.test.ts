import { describe, expect, it } from "vitest";

import {
  caminhoDoConvite,
  caminhoDoLoginDoOrcamento,
  destinoDoClienteSeguro,
  statusAcessoCliente,
} from "@/lib/acesso-cliente";

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

describe("destinoDoClienteSeguro", () => {
  it("aceita só caminhos da área do cliente", () => {
    expect(destinoDoClienteSeguro("/cliente/orcamentos/abc-123")).toBe(
      "/cliente/orcamentos/abc-123",
    );
    expect(destinoDoClienteSeguro("/cliente")).toBe("/cliente");
    expect(destinoDoClienteSeguro("https://outro.site")).toBeUndefined();
    expect(destinoDoClienteSeguro("//outro.site")).toBeUndefined();
    expect(destinoDoClienteSeguro("/admin")).toBeUndefined();
    expect(destinoDoClienteSeguro("/cliente/../admin")).toBeUndefined();
    expect(destinoDoClienteSeguro(undefined)).toBeUndefined();
  });
});

describe("caminhoDoLoginDoOrcamento", () => {
  it("leva ao orçamento depois do login, com o e-mail preenchido", () => {
    const caminho = caminhoDoLoginDoOrcamento("abc-123", "cliente@x.com");
    const busca = new URLSearchParams(caminho.slice(2));
    expect(caminho.startsWith("/?")).toBe(true);
    expect(busca.get("proximo")).toBe("/cliente/orcamentos/abc-123");
    expect(busca.get("email")).toBe("cliente@x.com");
  });
});
