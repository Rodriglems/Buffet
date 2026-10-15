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

  it("mantém o menu de eventos ativo na aba de contatos", () => {
    const eventos = item({}, "/admin/eventos");
    expect(eventos?.to).toBe("/admin/eventos");
    expect(rotaAtiva(eventos!, "/admin/clientes/novo")).toBe(true);
    expect(rotaAtiva(eventos!, "/admin/orcamentos")).toBe(false);
  });

  it("troca o menu para contatos quando eventos está desligado", () => {
    const contatos = item({ eventos: false, contatos: true }, "/admin/clientes");
    expect(contatos?.label).toBe("Contatos");
    expect(contatos?.to).toBe("/admin/clientes");
  });

  it("esconde o item quando a permissão da área está desligada", () => {
    const nav = visibleAdminNav({ leads: false, agenda: false });
    const destinos = nav.flatMap((group) => group.items.map((entry) => entry.to));
    expect(destinos).not.toContain("/admin/leads");
    expect(destinos).not.toContain("/admin/agenda");
  });
});
