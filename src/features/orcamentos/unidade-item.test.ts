import { describe, expect, it } from "vitest";

import {
  cobrancaDasLinhas,
  comCobranca,
  ehFrete,
  ehServico,
  ehValorAParte,
  linhaComUnidadePadrao,
  quantidadePadrao,
  unidadeNoOrcamento,
} from "@/features/orcamentos/unidade-item";

describe("unidadeNoOrcamento", () => {
  it("troca por evento por por pessoa", () => {
    expect(unidadeNoOrcamento("por evento")).toBe("por pessoa");
    expect(unidadeNoOrcamento("Por Evento ")).toBe("por pessoa");
  });

  it("mantém unidades específicas do cardápio", () => {
    expect(unidadeNoOrcamento("cento")).toBe("cento");
    expect(unidadeNoOrcamento("por pessoa")).toBe("por pessoa");
  });
});

describe("quantidadePadrao", () => {
  it("usa os convidados quando é por pessoa", () => {
    expect(quantidadePadrao("por pessoa", 40)).toBe(40);
  });

  it("usa 1 nas outras unidades e nunca zero", () => {
    expect(quantidadePadrao("cento", 40)).toBe(1);
    expect(quantidadePadrao("por pessoa", 0)).toBe(1);
  });
});

describe("linhaComUnidadePadrao", () => {
  it("passa uma linha sob consulta para por pessoa com os convidados", () => {
    expect(
      linhaComUnidadePadrao({ unidade: "por evento", quantidade: 1, valorUnitario: 0 }, 40),
    ).toEqual({ unidade: "por pessoa", quantidade: 40, valorUnitario: 0 });
  });

  it("não mexe numa linha com preço já definido", () => {
    const linha = { unidade: "por evento", quantidade: 1, valorUnitario: 500 };
    expect(linhaComUnidadePadrao(linha, 40)).toBe(linha);
  });

  it("não mexe em outras unidades", () => {
    const linha = { unidade: "cento", quantidade: 2, valorUnitario: 0 };
    expect(linhaComUnidadePadrao(linha, 40)).toBe(linha);
  });
});

describe("cobrança do orçamento", () => {
  it("por pessoa usa os convidados e por prato usa 1", () => {
    expect(comCobranca("por evento", 1, "por pessoa", 40)).toEqual({
      unidade: "por pessoa",
      quantidade: 40,
    });
    expect(comCobranca("por pessoa", 40, "por prato", 40)).toEqual({
      unidade: "por prato",
      quantidade: 1,
    });
  });

  it("não mexe em unidades específicas como cento", () => {
    expect(comCobranca("cento", 3, "por pessoa", 40)).toEqual({ unidade: "cento", quantidade: 3 });
  });

  it("abre como por prato só quando alguma linha já está por prato", () => {
    expect(cobrancaDasLinhas(["por pessoa", "cento"])).toBe("por pessoa");
    expect(cobrancaDasLinhas(["por prato", "cento"])).toBe("por prato");
    expect(cobrancaDasLinhas([])).toBe("por pessoa");
  });
});

describe("ehFrete", () => {
  it("reconhece a linha de frete pela unidade", () => {
    expect(ehFrete("frete")).toBe(true);
    expect(ehFrete(" Frete ")).toBe(true);
    expect(ehFrete("por prato")).toBe(false);
  });
});

describe("serviços com valor", () => {
  it("reconhece serviço e frete como valores à parte dos itens", () => {
    expect(ehServico("serviço")).toBe(true);
    expect(ehServico(" Serviço ")).toBe(true);
    expect(ehValorAParte("frete")).toBe(true);
    expect(ehValorAParte("serviço")).toBe(true);
    expect(ehValorAParte("por pessoa")).toBe(false);
  });
});
