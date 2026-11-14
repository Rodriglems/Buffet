import { describe, expect, it } from "vitest";

import {
  alteracoesDoCardapio,
  itemComMesmoNome,
  itensParecidos,
  mensagemNomeRepetido,
  textoDoPreco,
} from "@/features/servicos/regras-cardapio";

const itens = [
  { id: "1", nome: "Bolinho de bacalhau", categoria: "Salgadinhos", cardapios: ["Coquetel"] },
  { id: "2", nome: "Feijoada completa", categoria: "Pratos", cardapios: [] },
  { id: "3", nome: "Farofa", categoria: "Acompanhamentos", cardapios: ["Feijoada", "Buffet"] },
];

describe("itemComMesmoNome", () => {
  it("encontra o item mesmo com maiúsculas, acentos e espaços diferentes", () => {
    expect(itemComMesmoNome(itens, "  bolinho de BACALHAU ", null)?.id).toBe("1");
    expect(itemComMesmoNome(itens, "feijoáda completa", null)?.id).toBe("2");
  });

  it("ignora o próprio item em edição", () => {
    expect(itemComMesmoNome(itens, "Farofa", "3")).toBeNull();
  });

  it("não acusa nomes só parecidos nem campo vazio", () => {
    expect(itemComMesmoNome(itens, "Farofa de bacon", null)).toBeNull();
    expect(itemComMesmoNome(itens, "   ", null)).toBeNull();
  });
});

describe("itensParecidos", () => {
  const cardapio = [
    { id: "a", nome: "Arroz com fava", categoria: "Acompanhamentos", cardapios: [] },
    { id: "b", nome: "Torresmo com farofa", categoria: "Botequim", cardapios: [] },
    { id: "c", nome: "Arroz branco", categoria: "Arroz", cardapios: [] },
    { id: "d", nome: "Feijoada completa", categoria: "Pratos", cardapios: [] },
  ];

  it("dá mais peso à palavra mais rara: 'farofa' diferencia mais que 'arroz'", () => {
    expect(itensParecidos(cardapio, "arroz com farofa", null).map((item) => item.id)).toEqual([
      "b",
      "a",
      "c",
    ]);
  });

  it("ignora acentos e palavras curtas como 'com' e 'de'", () => {
    expect(itensParecidos(cardapio, "feijoáda", null).map((item) => item.id)).toEqual(["d"]);
    expect(itensParecidos(cardapio, "com de", null)).toEqual([]);
  });

  it("não repete o próprio item nem o de nome idêntico, que já tem aviso próprio", () => {
    expect(itensParecidos(cardapio, "Arroz branco", "c").map((item) => item.id)).toEqual(["a"]);
    expect(itensParecidos(cardapio, "arroz branco", null).map((item) => item.id)).toEqual(["a"]);
  });

  it("limita a quantidade de sugestões", () => {
    expect(itensParecidos(cardapio, "arroz farofa", null, 2)).toHaveLength(2);
  });
});

describe("mensagemNomeRepetido", () => {
  it("diz qual item e em que categoria ele está", () => {
    expect(
      mensagemNomeRepetido({ nome: "Farofa", categoria: "Acompanhamentos", ativo: true }),
    ).toBe(
      "Já existe “Farofa” na categoria Acompanhamentos. Para colocá-lo em outro cardápio, edite esse item e marque o cardápio.",
    );
  });

  it("avisa quando o item existente está inativo", () => {
    expect(
      mensagemNomeRepetido({ nome: "Farofa", categoria: "Acompanhamentos", ativo: false }),
    ).toContain("na categoria Acompanhamentos (inativo)");
  });
});

describe("alteracoesDoCardapio", () => {
  it("lista só o que entra e o que sai do cardápio", () => {
    expect(alteracoesDoCardapio(itens, "Feijoada", ["2", "3"])).toEqual({
      adicionar: ["2"],
      remover: [],
    });
    expect(alteracoesDoCardapio(itens, "Feijoada", ["1"])).toEqual({
      adicionar: ["1"],
      remover: ["3"],
    });
  });

  it("não muda nada quando a seleção é a mesma", () => {
    expect(alteracoesDoCardapio(itens, "Coquetel", ["1"])).toEqual({ adicionar: [], remover: [] });
  });
});

describe("textoDoPreco", () => {
  it("mostra o campo vazio para valor sob consulta", () => {
    expect(textoDoPreco(0)).toBe("");
  });

  it("mostra o valor cadastrado com vírgula", () => {
    expect(textoDoPreco(110)).toBe("110");
    expect(textoDoPreco(12.5)).toBe("12,5");
  });
});
