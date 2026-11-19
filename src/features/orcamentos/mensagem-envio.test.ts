import { describe, expect, it } from "vitest";

import { mensagemEnvioOrcamento } from "@/features/orcamentos/mensagem-envio";

const base = {
  nomeCliente: "Rodrigo Lemos",
  tipoEvento: "Aniversário infantil",
  data: "18/02/2027",
  convidados: 40,
  comoAcessar: "Para ver o cardápio completo e aprovar, acesse: https://site/",
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
});
