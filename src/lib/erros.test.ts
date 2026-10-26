import { describe, expect, it } from "vitest";
import { z } from "zod";

import { mensagemAmigavel } from "./erros";

function erroDoBanco(name: string, code?: string) {
  return Object.assign(new Error("Invalid `prisma.empresa.update()` invocation: ..."), {
    name,
    code,
  });
}

describe("mensagemAmigavel", () => {
  it("esconde a mensagem técnica do banco", () => {
    const mensagem = mensagemAmigavel(erroDoBanco("PrismaClientValidationError"));
    expect(mensagem).toMatch(/Não foi possível concluir a ação/);
    expect(mensagem).not.toMatch(/prisma/i);
  });

  it("explica erros conhecidos do banco", () => {
    expect(mensagemAmigavel(erroDoBanco("PrismaClientKnownRequestError", "P2002"))).toMatch(
      /Já existe um cadastro/,
    );
    expect(mensagemAmigavel(erroDoBanco("PrismaClientInitializationError"))).toMatch(
      /conectar ao banco/,
    );
  });

  it("resume erros de validação sem o JSON técnico", () => {
    const resultado = z
      .object({ nome: z.string().min(2, "Informe o nome.") })
      .safeParse({ nome: "" });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(mensagemAmigavel(resultado.error)).toBe(
        "Confira os dados informados: Informe o nome.",
      );
    }
  });

  it("não mostra as mensagens padrão em inglês da validação", () => {
    const resultado = z.object({ itens: z.array(z.string()).min(1) }).safeParse({ itens: [] });
    if (!resultado.success) {
      expect(mensagemAmigavel(resultado.error)).toBe(
        "Alguns campos estão inválidos. Confira os dados informados e tente novamente.",
      );
    }
  });

  it("mantém as mensagens escritas para o usuário", () => {
    expect(mensagemAmigavel(new Error("Evento não encontrado."))).toBeNull();
  });
});
