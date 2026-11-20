import { describe, expect, it } from "vitest";

import { mensagemEnvioOrcamento } from "@/features/orcamentos/mensagem-envio";

const base = {
  nomeCliente: "Rodrigo Lemos",
  tipoEvento: "Aniversário infantil",
  data: "18/02/2027",
  convidados: 40,
  link: "https://site/?proximo=/cliente/orcamentos/1",
};

const normalizar = (texto: string) => texto.replace(/\s/g, " ");

describe("mensagemEnvioOrcamento", () => {
  it("mostra o frete à parte quando existe", () => {
    const texto = normalizar(mensagemEnvioOrcamento({ ...base, total: 516, frete: 444 }));
    expect(texto).toContain("Olá, Rodrigo! Seu orçamento está pronto 🎉");
    expect(texto).toContain("Aniversário infantil · 18/02/2027 · 40 convidados");
    expect(texto).toContain("Valor total: R$ 72,00");
    expect(texto).toContain("+ frete de R$ 444,00");
  });

  it("não fala de frete quando não há", () => {
    const texto = normalizar(mensagemEnvioOrcamento({ ...base, total: 516, frete: 0 }));
    expect(texto).toContain("Valor total: R$ 516,00");
    expect(texto).not.toContain("frete");
  });

  it("leva ao link em linha própria e convida a pedir alterações", () => {
    const texto = mensagemEnvioOrcamento({ ...base, total: 516, frete: 0 });
    expect(texto).toContain(
      "Para visualizar todos os detalhes do orçamento, acesse:\n\nhttps://site/?proximo=/cliente/orcamentos/1",
    );
    expect(texto).toContain("responda esta mensagem ou fale conosco pelo WhatsApp.");
  });

  it("mostra o aviso logo abaixo do link quando há", () => {
    const texto = mensagemEnvioOrcamento({
      ...base,
      total: 516,
      frete: 0,
      avisoLink: "(o link vale por 6 horas)",
    });
    expect(texto).toContain(
      "https://site/?proximo=/cliente/orcamentos/1\n(o link vale por 6 horas)",
    );
  });
});
