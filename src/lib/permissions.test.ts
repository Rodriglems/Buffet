import { describe, expect, it } from "vitest";

import { hasPermission, permissionForPath } from "./permissions";

describe("permissoes", () => {
  it("libera o acesso quando a chave ainda não foi gravada", () => {
    expect(hasPermission({}, "eventos")).toBe(true);
  });

  it("bloqueia somente o que foi desmarcado", () => {
    expect(hasPermission({ eventos: false, contatos: true }, "eventos")).toBe(false);
    expect(hasPermission({ eventos: false }, "contatos")).toBe(true);
  });

  it("reconhece cada aba pelo caminho", () => {
    expect(permissionForPath("/admin/clientes/novo")).toBe("contatos");
    expect(permissionForPath("/admin/eventos/novo")).toBe("eventos");
    expect(permissionForPath("/admin/financeiro")).toBe("financeiro");
    expect(permissionForPath("/admin/pagamentos")).toBe("pagamentos");
    expect(permissionForPath("/admin/custos")).toBe("custos");
    expect(permissionForPath("/admin")).toBeNull();
  });

  it("herda pagamentos e custos da permissão antiga de financeiro", () => {
    expect(hasPermission({ financeiro: false }, "pagamentos")).toBe(false);
    expect(hasPermission({ financeiro: false }, "custos")).toBe(false);
    expect(hasPermission({ financeiro: true, pagamentos: false }, "pagamentos")).toBe(false);
    expect(hasPermission({ financeiro: false, custos: true }, "custos")).toBe(true);
  });
});
