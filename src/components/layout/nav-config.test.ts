import { describe, expect, it } from "vitest";

import { rotaAtiva, trilhaDoCaminho, visibleAdminNav } from "./nav-config";

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
    expect(rotaAtiva(eventos!, "/admin/orcamentos")).toBe(true);
    expect(
      visibleAdminNav({}).flatMap((group) => group.items.map((entry) => entry.to)),
    ).not.toContain("/admin/orcamentos");
  });

  it("mantém clientes no menu quando eventos está desligado", () => {
    const clientes = item({ eventos: false, contatos: true }, "/admin/clientes");
    expect(clientes?.label).toBe("Clientes");
    expect(clientes?.to).toBe("/admin/clientes");
    expect(item({ eventos: false, contatos: true }, "/admin/eventos")).toBeUndefined();
  });

  it("exibe documentos no lugar de contratos", () => {
    expect(item({}, "/admin/documentos")?.label).toBe("Documentos");
    expect(item({}, "/admin/contratos")).toBeUndefined();
    expect(item({ documentos: false }, "/admin/documentos")).toBeUndefined();
  });

  it("esconde o item quando a permissão da área está desligada", () => {
    const nav = visibleAdminNav({ agenda: false });
    const destinos = nav.flatMap((group) => group.items.map((entry) => entry.to));
    expect(destinos).not.toContain("/admin/leads");
    expect(destinos).not.toContain("/admin/agenda");
    expect(destinos).not.toContain("/admin/atividades");
  });
});

describe("trilha de navegação", () => {
  it("troca o identificador interno por um nome legível", () => {
    expect(trilhaDoCaminho("/admin/eventos/ee25416e-8dbb-49a3-978a-14226624dc07")).toEqual([
      "Painel",
      "Eventos",
      "Detalhes do evento",
    ]);
    expect(trilhaDoCaminho("/cliente/orcamentos/ee25416e-8dbb-49a3-978a-14226624dc07")).toEqual([
      "Meu portal",
      "Orçamentos",
      "Orçamento",
    ]);
  });

  it("usa os nomes com acento", () => {
    expect(trilhaDoCaminho("/admin/servicos")).toEqual(["Painel", "Cardápio"]);
    expect(trilhaDoCaminho("/admin/configuracoes")[1]).toBe("Configurações");
  });
});
