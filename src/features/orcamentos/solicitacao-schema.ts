import { z } from "zod";

import { dataEventoEhFutura } from "@/features/eventos/data-evento";
import { phoneSchema, whatsappSchema } from "@/features/shared/validation/primitives";
import { SERVICOS_ADICIONAIS } from "@/lib/catalogo";

/** Fuso do buffet: "hoje" e "amanhã" do formulário são os do Brasil, não os do servidor (UTC). */
const FUSO_BRASIL = "America/Sao_Paulo";

/** Dia de hoje (AAAA-MM-DD) no horário de Brasília. */
export function hojeNoBrasil(agora = new Date()): string {
  // en-CA formata como AAAA-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO_BRASIL }).format(agora);
}

/**
 * A data do evento vale a partir de amanhã no Brasil. O servidor costuma rodar em UTC: entre 21h
 * e meia-noite ele já estaria "no dia seguinte" e recusaria a data de amanhã que o calendário
 * liberou para o cliente.
 */
export function dataPermitidaNoBrasil(dataEvento: string, agora = new Date()): boolean {
  return dataEventoEhFutura(dataEvento.slice(0, 10), new Date(`${hojeNoBrasil(agora)}T12:00:00`));
}

export const tokenSchema = z.object({ token: z.string().uuid() });
const horarioSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido.");

export const solicitacaoSchema = tokenSchema
  .extend({
    nome: z.string().trim().min(2).max(160),
    // Vazio só no pedido pelo WhatsApp (sem conta); no modo normal o servidor exige o e-mail.
    email: z.union([z.literal(""), z.string().trim().email().toLowerCase()]).default(""),
    telefone: phoneSchema,
    whatsapp: whatsappSchema,
    tipoEvento: z.string().trim().min(2).max(100),
    formatoServico: z.string().trim().min(2).max(100),
    servicosAdicionais: z
      .array(z.enum(SERVICOS_ADICIONAIS))
      .max(SERVICOS_ADICIONAIS.length)
      .default([]),
    dataEvento: z.coerce.date(),
    horaInicio: horarioSchema,
    horaFim: horarioSchema.nullable().optional(),
    quantidadeConvidados: z.coerce.number().int().positive().max(100000),
    localNome: z.string().trim().max(160).nullable().optional(),
    cidade: z.string().trim().max(120).nullable().optional(),
    observacoes: z.string().trim().max(4000).nullable().optional(),
    servicosIds: z.array(z.string().uuid()).min(1).max(300),
    // Centos escolhidos nos itens vendidos por cento (ex.: { bolinhoId: 1.5 }).
    quantidades: z.record(z.string().uuid(), z.number()).default({}),
    // Por item, a opção escolhida em cada grupo ({ Recheio: id, Molho: id }). Um id solto é o
    // formato antigo (um grupo só), aceito para páginas abertas antes da mudança.
    escolhas: z
      .record(
        z.string().uuid(),
        z.union([z.string().uuid(), z.record(z.string().max(60), z.string().uuid())]),
      )
      .default({}),
    // Senha curta (a partir de 4 dígitos) é aceita porque o login bloqueia tentativas repetidas.
    // Cliente já conectado não envia senha: o pedido vai para a conta da sessão.
    senha: z.string().max(200).default(""),
    website: z.string().max(0).optional(),
  })
  .superRefine((dados, contexto) => {
    // A página manda a data ao meio-dia local, então o dia em UTC é o mesmo do Brasil.
    if (!dataPermitidaNoBrasil(dados.dataEvento.toISOString())) {
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dataEvento"],
        message: "A data do evento deve ser a partir de amanhã.",
      });
    }
    if (dados.horaFim && dados.horaFim <= dados.horaInicio) {
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["horaFim"],
        message: "O horário de término deve ser posterior ao início do evento.",
      });
    }
  });

export type Solicitacao = z.infer<typeof solicitacaoSchema>;

/** Valida o pedido e troca o erro técnico por uma frase que o cliente entende. */
export function validarSolicitacao(value: unknown): Solicitacao {
  const resultado = solicitacaoSchema.safeParse(value);
  if (resultado.success) return resultado.data;

  const camposInvalidos = new Set(resultado.error.issues.map((issue) => issue.path[0]));
  if (camposInvalidos.has("email")) {
    throw new Error("Informe um e-mail válido.");
  }
  if (camposInvalidos.has("senha")) {
    throw new Error("Crie uma senha com pelo menos 4 caracteres.");
  }
  if (camposInvalidos.has("telefone") || camposInvalidos.has("whatsapp")) {
    throw new Error("Informe um telefone e WhatsApp válidos, incluindo o DDD.");
  }
  if (camposInvalidos.has("dataEvento")) {
    throw new Error("A data do evento deve ser a partir de amanhã.");
  }
  if (camposInvalidos.has("horaInicio") || camposInvalidos.has("horaFim")) {
    throw new Error(
      resultado.error.issues.find((issue) =>
        ["horaInicio", "horaFim"].includes(String(issue.path[0])),
      )?.message ?? "Informe um horário válido para o evento.",
    );
  }
  if (camposInvalidos.has("nome")) {
    throw new Error("Informe seu nome.");
  }
  if (camposInvalidos.has("quantidadeConvidados")) {
    throw new Error("Informe o número de convidados.");
  }

  throw new Error("Revise os campos do formulário e tente novamente.");
}
