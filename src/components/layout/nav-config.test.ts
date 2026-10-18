import { describe, expect, it } from "vitest";

import { rotaAtiva, visibleAdminNav } from "./nav-config";

function item(permissoes: unknown, to: string) {
  return visibleAdminNav(permissoes)
    .flatMap((group) => group.items)
    .find((entry) => entry.to === to || entry.activePrefixes?.includes(to));
}

describe("menu com permissões", () => {
  it("mostra só as abas financeiras permitidas e abre a primeira", () => {
    const financeiro = item(
      { financeiro: false, pagamentos: true, custos: false },
      "/admin/pagamentos",
    );
    expect(financeiro?.to).toBe("/admin/pagamentos");
    expect(financeiro?.activePrefixes).toEqual(["/admin/pagamentos"]);
    expect(
      item({ financeiro: false, pagamentos: false, custos: false }, "/admin/financeiro"),
    ).toBeUndefined();
  });

  it("mantém clientes e eventos como itens independentes", () => {
    const eventos = item({}, "/admin/eventos");
    const clientes = item({}, "/admin/clientes");
    expect(eventos?.to).toBe("/admin/eventos");
    expect(clientes?.label).toBe("Clientes");
    expect(clientes?.to).toBe("/admin/clientes");
    expect(rotaAtiva(eventos!, "/admin/clientes/novo")).toBe(false);
    expect(rotaAtiva(clientes!, "/admin/clientes/novo")).toBe(true);
    expect(rotaAtiva(eventos!, "/admin/orcamentos")).toBe(false);
  });

  it("mantém clientes no menu quando eventos está desligado", () => {
    const clientes = item({ eventos: false, contatos: true }, "/admin/clientes");
    expect(clientes?.label).toBe("Clientes");
    expect(clientes?.to).toBe("/admin/clientes");
    expect(item({ eventos: false, contatos: true }, "/admin/eventos")).toBeUndefined();
  });

  it("esconde o item quando a permissão da área está desligada", () => {
    const nav = visibleAdminNav({ leads: false, agenda: false });
    const destinos = nav.flatMap((group) => group.items.map((entry) => entry.to));
    expect(destinos).not.toContain("/admin/leads");
    expect(destinos).not.toContain("/admin/agenda");
  });
});
