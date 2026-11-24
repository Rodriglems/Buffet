import { describe, expect, it } from "vitest";

import {
  agruparOpcoes,
  gruposParaSalvar,
  gruposSemEscolha,
  listaDeEscolhas,
} from "@/features/servicos/grupos-opcoes";

describe("agruparOpcoes", () => {
  it("junta as opções por grupo, na ordem dos grupos", () => {
    expect(
      agruparOpcoes([
        { opcaoId: "m1", grupo: "Molho", grupoOrdem: 1 },
        { opcaoId: "r1", grupo: "Recheio", grupoOrdem: 0 },
        { opcaoId: "r2", grupo: "Recheio", grupoOrdem: 0 },
      ]),
    ).toEqual([
      { nome: "Recheio", ids: ["r1", "r2"] },
      { nome: "Molho", ids: ["m1"] },
    ]);
  });
});

describe("gruposParaSalvar", () => {
  it("tira grupos vazios, usa nome padrão e não repete opção entre grupos", () => {
    expect(
      gruposParaSalvar([
        { nome: " Recheio ", ids: ["a", "b"] },
        { nome: "", ids: ["b", "c"] },
        { nome: "Molho", ids: [] },
      ]),
    ).toEqual([
      { nome: "Recheio", ids: ["a", "b"] },
      { nome: "Opção", ids: ["c"] },
    ]);
  });

  it("recusa dois grupos com o mesmo nome", () => {
    expect(() =>
      gruposParaSalvar([
        { nome: "Molho", ids: ["a"] },
        { nome: "molho", ids: ["b"] },
      ]),
    ).toThrow(/nome diferente/);
  });
});

describe("gruposSemEscolha", () => {
  it("aponta os grupos sem opção válida escolhida", () => {
    const grupos = [
      { nome: "Recheio", ids: ["r1"] },
      { nome: "Molho", ids: ["m1"] },
    ];
    expect(gruposSemEscolha(grupos, { Recheio: "r1" })).toEqual(["Molho"]);
    expect(gruposSemEscolha(grupos, { Recheio: "r1", Molho: "m1" })).toEqual([]);
    expect(gruposSemEscolha(grupos, undefined)).toEqual(["Recheio", "Molho"]);
  });
});

describe("listaDeEscolhas", () => {
  it("escreve a lista como frase", () => {
    expect(listaDeEscolhas(["Recheio"])).toBe("o recheio");
    expect(listaDeEscolhas(["Recheio", "Molho"])).toBe("o recheio e o molho");
    expect(listaDeEscolhas(["Recheio", "Molho", "Sabor"])).toBe("o recheio, o molho e o sabor");
  });

  it("usa o artigo certo para nomes femininos e no plural", () => {
    expect(listaDeEscolhas(["Recheio", "massa"])).toBe("o recheio e a massa");
    expect(listaDeEscolhas(["Cobertura", "Opção"])).toBe("a cobertura e a opção");
    expect(listaDeEscolhas(["Molhos", "Massas"])).toBe("os molhos e as massas");
  });
});
