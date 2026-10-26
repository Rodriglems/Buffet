/**
 * Tradução de erros técnicos (banco, validação) em mensagens para quem usa o sistema.
 * Erros lançados de propósito pelo nosso código (`new Error("Evento não encontrado.")`)
 * já são mensagens para o usuário e passam como estão.
 */

const MENSAGEM_PADRAO =
  "Não foi possível concluir a ação agora. Tente novamente em instantes; se o problema continuar, avise o suporte.";

type ErroComCodigo = { name?: unknown; code?: unknown; meta?: unknown; issues?: unknown };

const MENSAGENS_PRISMA: Record<string, string> = {
  // Valor único repetido (ex.: e-mail, CNPJ ou nome já cadastrado).
  P2002: "Já existe um cadastro com esses dados. Confira campos como e-mail, CNPJ ou nome.",
  // Registro não encontrado (apagado por outra pessoa, por exemplo).
  P2025: "Este registro não foi encontrado. Atualize a página e tente novamente.",
  // Registro em uso por outro (chave estrangeira).
  P2003: "Este registro está ligado a outros dados e não pode ser alterado ou removido.",
  P2000: "Um dos campos passou do tamanho permitido. Encurte o texto e tente novamente.",
};

const PADRAO_EM_INGLES =
  /^(Invalid|Expected|Required|String must|Number must|Array must|Too (small|big)|Unrecognized)/;

function ehErroDoBanco(erro: ErroComCodigo) {
  return typeof erro.name === "string" && erro.name.startsWith("PrismaClient");
}

function ehErroDeValidacao(erro: ErroComCodigo) {
  return erro.name === "ZodError" && Array.isArray(erro.issues);
}

/** Retorna a mensagem que o usuário deve ver, ou null se o erro já for amigável. */
export function mensagemAmigavel(erro: unknown): string | null {
  if (erro == null || typeof erro !== "object") return MENSAGEM_PADRAO;
  const dados = erro as ErroComCodigo;

  if (ehErroDoBanco(dados)) {
    if (typeof dados.code === "string" && MENSAGENS_PRISMA[dados.code]) {
      return MENSAGENS_PRISMA[dados.code]!;
    }
    if (dados.name === "PrismaClientInitializationError") {
      return "Não foi possível conectar ao banco de dados. Tente novamente em instantes.";
    }
    return MENSAGEM_PADRAO;
  }

  if (ehErroDeValidacao(dados)) {
    const mensagens = (dados.issues as { message?: unknown }[])
      .map((issue) => (typeof issue.message === "string" ? issue.message : null))
      .filter((mensagem): mensagem is string => Boolean(mensagem));
    // Mensagens padrão da biblioteca de validação vêm em inglês; só as nossas (em português) aparecem.
    const legiveis = [...new Set(mensagens)].filter((m) => !PADRAO_EM_INGLES.test(m));
    return legiveis.length
      ? `Confira os dados informados: ${legiveis.slice(0, 3).join(" ")}`
      : "Alguns campos estão inválidos. Confira os dados informados e tente novamente.";
  }

  if (!(erro instanceof Error)) return MENSAGEM_PADRAO;
  return null;
}
