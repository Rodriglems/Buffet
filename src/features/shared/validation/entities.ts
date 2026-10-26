import { z } from "zod";

import { STATUS_EVENTO } from "@/lib/status-evento";

import {
  cepSchema,
  cnpjSchema,
  cpfCnpjSchema,
  dateSchema,
  dateTimeSchema,
  decimalToScaledBigInt,
  emailSchema,
  emptyStringToUndefined,
  moneySchema,
  phoneSchema,
  positiveBigIntSchema,
  positiveIntegerSchema,
  positiveMoneySchema,
  quantityDecimalSchema,
  timeSchema,
  ufSchema,
  uuidSchema,
  whatsappSchema,
} from "./primitives";

const requiredText = (label: string, max = 255) =>
  z.string().trim().min(1, `${label} é obrigatório`).max(max);
const optionalText = (max = 2_000) =>
  z.preprocess(emptyStringToUndefined, z.string().trim().max(max).optional());
const optionalUrl = z.preprocess(
  emptyStringToUndefined,
  z.string().trim().url("URL inválida").max(2_048).optional(),
);
const optionalUuid = z.preprocess(emptyStringToUndefined, uuidSchema.optional());
const optionalEmail = z.preprocess(emptyStringToUndefined, emailSchema.optional());
const optionalPhone = z.preprocess(emptyStringToUndefined, phoneSchema.optional());
const optionalWhatsapp = z.preprocess(emptyStringToUndefined, whatsappSchema.optional());
const optionalCep = z.preprocess(emptyStringToUndefined, cepSchema.optional());
const optionalUf = z.preprocess(emptyStringToUndefined, ufSchema.optional());
const optionalDate = z.preprocess(emptyStringToUndefined, dateSchema.optional());
const optionalDateTime = z.preprocess(emptyStringToUndefined, dateTimeSchema.optional());

const addressShape = {
  cep: optionalCep,
  estado: optionalUf,
  cidade: optionalText(120),
  bairro: optionalText(120),
  logradouro: optionalText(255),
  numero: optionalText(30),
  complemento: optionalText(255),
};

export const roleUsuarioSchema = z.enum(["ADMIN", "CLIENT"]);
export const tipoPessoaSchema = z.enum(["FISICA", "JURIDICA"]);
export const statusLeadSchema = z.enum([
  "NOVO",
  "CONTATO_REALIZADO",
  "QUALIFICADO",
  "PROPOSTA",
  "CONVERTIDO",
  "PERDIDO",
]);
export const statusEventoSchema = z.enum(STATUS_EVENTO);
export const statusOrcamentoSchema = z.enum([
  "RASCUNHO",
  "ENVIADO",
  "VISUALIZADO",
  "EM_NEGOCIACAO",
  "AGUARDANDO_APROVACAO",
  "APROVADO",
  "REJEITADO",
  "EXPIRADO",
  "CANCELADO",
]);
export const statusPagamentoSchema = z.enum(["PENDENTE", "PAGO", "ATRASADO", "CANCELADO"]);
export const tipoDocumentoSchema = z.enum([
  "CONTRATO",
  "COMPROVANTE",
  "DOCUMENTO_CLIENTE",
  "OUTRO",
]);

const empresaFields = z.object({
  razaoSocial: requiredText("Razão social"),
  nomeFantasia: requiredText("Nome fantasia"),
  cnpj: cnpjSchema,
  email: emailSchema,
  telefone: optionalPhone,
  whatsapp: optionalWhatsapp,
  ...addressShape,
  logoUrl: optionalUrl,
});
export const empresaCreateSchema = empresaFields.strict();
export const empresaUpdateSchema = empresaFields.partial().strict();

const usuarioFields = z.object({
  empresaId: uuidSchema,
  nome: requiredText("Nome"),
  email: emailSchema,
  senhaHash: requiredText("Senha", 255).min(8, "Senha muito curta"),
  role: roleUsuarioSchema,
  ativo: z.boolean().optional(),
  ultimoLogin: optionalDateTime,
});
export const usuarioCreateSchema = usuarioFields.strict();
export const usuarioUpdateSchema = usuarioFields.partial().strict();

const clienteFields = z.object({
  empresaId: uuidSchema,
  usuarioId: optionalUuid,
  nome: requiredText("Nome"),
  tipoPessoa: tipoPessoaSchema,
  cpfCnpj: z.preprocess(emptyStringToUndefined, cpfCnpjSchema.optional()),
  email: optionalEmail,
  telefone: optionalPhone,
  whatsapp: optionalWhatsapp,
  ...addressShape,
  observacoes: optionalText(5_000),
});

function validateCliente(
  value: { tipoPessoa?: "FISICA" | "JURIDICA"; cpfCnpj?: string },
  ctx: z.RefinementCtx,
) {
  if (
    value.tipoPessoa &&
    value.cpfCnpj &&
    ((value.tipoPessoa === "FISICA" && value.cpfCnpj.length !== 11) ||
      (value.tipoPessoa === "JURIDICA" && value.cpfCnpj.length !== 14))
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["cpfCnpj"],
      message: `Documento incompatível com pessoa ${
        value.tipoPessoa === "FISICA" ? "física" : "jurídica"
      }`,
    });
  }
}
export const clienteCreateSchema = clienteFields.strict().superRefine(validateCliente);
export const clienteUpdateSchema = clienteFields.partial().strict().superRefine(validateCliente);

const leadFields = z.object({
  empresaId: uuidSchema,
  nome: requiredText("Nome"),
  email: optionalEmail,
  telefone: optionalPhone,
  whatsapp: optionalWhatsapp,
  tipoEvento: optionalText(120),
  dataEvento: optionalDate,
  quantidadeConvidados: positiveIntegerSchema.optional(),
  origem: optionalText(120),
  observacoes: optionalText(5_000),
  status: statusLeadSchema.optional(),
});
export const leadCreateSchema = leadFields.strict();
export const leadUpdateSchema = leadFields.partial().strict();

const eventoFields = z.object({
  empresaId: uuidSchema,
  clienteId: uuidSchema,
  nome: requiredText("Nome"),
  tipo: requiredText("Tipo"),
  dataEvento: dateSchema,
  horaInicio: z.preprocess(emptyStringToUndefined, timeSchema.optional()),
  horaFim: z.preprocess(emptyStringToUndefined, timeSchema.optional()),
  quantidadeConvidados: positiveIntegerSchema,
  localNome: optionalText(255),
  ...addressShape,
  status: statusEventoSchema.optional(),
  observacoes: optionalText(5_000),
});
function validateEventTimes(
  value: { horaInicio?: string; horaFim?: string },
  ctx: z.RefinementCtx,
) {
  if (value.horaInicio && value.horaFim && value.horaFim <= value.horaInicio) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["horaFim"],
      message: "A hora final deve ser posterior à hora inicial",
    });
  }
}
export const eventoCreateSchema = eventoFields.strict().superRefine(validateEventTimes);
export const eventoUpdateSchema = eventoFields.partial().strict().superRefine(validateEventTimes);

const servicoFields = z.object({
  empresaId: uuidSchema,
  nome: requiredText("Nome"),
  descricao: optionalText(2_000),
  unidade: requiredText("Unidade", 50),
  precoBase: positiveMoneySchema,
  ativo: z.boolean().optional(),
});
export const servicoCreateSchema = servicoFields.strict();
export const servicoUpdateSchema = servicoFields.partial().strict();

const orcamentoFields = z.object({
  empresaId: uuidSchema,
  eventoId: uuidSchema,
  numero: positiveBigIntSchema,
  versao: positiveIntegerSchema.optional(),
  status: statusOrcamentoSchema.optional(),
  validade: optionalDate,
  subtotal: moneySchema,
  desconto: moneySchema,
  total: moneySchema,
  observacoes: optionalText(5_000),
});
function validateBudgetTotals(
  value: { subtotal?: string; desconto?: string; total?: string },
  ctx: z.RefinementCtx,
) {
  if (value.subtotal && value.desconto && value.total) {
    const subtotal = decimalToScaledBigInt(value.subtotal);
    const desconto = decimalToScaledBigInt(value.desconto);
    const total = decimalToScaledBigInt(value.total);
    if (desconto > subtotal) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["desconto"],
        message: "O desconto não pode superar o subtotal",
      });
    }
    if (subtotal - desconto !== total) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["total"],
        message: "Total deve ser igual ao subtotal menos o desconto",
      });
    }
  }
}
export const orcamentoCreateSchema = orcamentoFields.strict().superRefine(validateBudgetTotals);
export const orcamentoUpdateSchema = orcamentoFields
  .partial()
  .strict()
  .superRefine(validateBudgetTotals);

const orcamentoItemFields = z.object({
  orcamentoId: uuidSchema,
  servicoId: optionalUuid,
  descricao: requiredText("Descrição", 1_000),
  quantidade: quantityDecimalSchema,
  unidade: requiredText("Unidade", 50),
  valorUnitario: moneySchema,
  desconto: moneySchema,
  valorTotal: moneySchema,
});
function validateItemTotal(
  value: {
    quantidade?: string;
    valorUnitario?: string;
    desconto?: string;
    valorTotal?: string;
  },
  ctx: z.RefinementCtx,
) {
  if (value.quantidade && value.valorUnitario && value.desconto && value.valorTotal) {
    const gross =
      decimalToScaledBigInt(value.quantidade, 3) * decimalToScaledBigInt(value.valorUnitario);
    const expected =
      (decimalToScaledBigInt(value.valorTotal) + decimalToScaledBigInt(value.desconto)) * 1_000n;
    if (gross !== expected) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["valorTotal"],
        message: "Total do item não corresponde à quantidade e aos valores",
      });
    }
  }
}
export const orcamentoItemCreateSchema = orcamentoItemFields
  .strict()
  .superRefine(validateItemTotal);
export const orcamentoItemUpdateSchema = orcamentoItemFields
  .partial()
  .strict()
  .superRefine(validateItemTotal);

const pagamentoFields = z.object({
  empresaId: uuidSchema,
  eventoId: uuidSchema,
  numeroParcela: positiveIntegerSchema,
  descricao: optionalText(1_000),
  valor: positiveMoneySchema,
  dataVencimento: dateSchema,
  dataPagamento: optionalDate,
  status: statusPagamentoSchema.optional(),
  formaPagamento: optionalText(120),
  observacoes: optionalText(5_000),
});
function validatePayment(
  value: {
    status?: z.infer<typeof statusPagamentoSchema>;
    dataPagamento?: string;
  },
  ctx: z.RefinementCtx,
) {
  if (value.status === "PAGO" && !value.dataPagamento) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["dataPagamento"],
      message: "Pagamento concluído exige data de pagamento",
    });
  }
  if (value.status && value.status !== "PAGO" && value.dataPagamento !== undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["dataPagamento"],
      message: "Somente pagamentos concluídos podem ter data de pagamento",
    });
  }
}
export const pagamentoCreateSchema = pagamentoFields.strict().superRefine(validatePayment);
export const pagamentoUpdateSchema = pagamentoFields
  .partial()
  .strict()
  .superRefine(validatePayment);

const custoFields = z.object({
  empresaId: uuidSchema,
  eventoId: uuidSchema,
  categoria: requiredText("Categoria", 120),
  descricao: requiredText("Descrição", 1_000),
  fornecedor: optionalText(255),
  valor: positiveMoneySchema,
  data: dateSchema,
  observacoes: optionalText(5_000),
});
export const custoCreateSchema = custoFields.strict();
export const custoUpdateSchema = custoFields.partial().strict();

const notificacaoFields = z.object({
  usuarioId: uuidSchema,
  tipo: requiredText("Tipo", 120),
  titulo: requiredText("Título", 255),
  mensagem: requiredText("Mensagem", 5_000),
  lida: z.boolean().optional(),
  lidaEm: optionalDateTime,
});
function validateNotification(value: { lida?: boolean; lidaEm?: Date }, ctx: z.RefinementCtx) {
  if (value.lida === true && !value.lidaEm) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["lidaEm"],
      message: "Notificação lida exige data de leitura",
    });
  }
  if (value.lida === false && value.lidaEm) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["lidaEm"],
      message: "Notificação não lida não pode ter data de leitura",
    });
  }
}
export const notificacaoCreateSchema = notificacaoFields.strict().superRefine(validateNotification);
export const notificacaoUpdateSchema = notificacaoFields
  .partial()
  .strict()
  .superRefine(validateNotification);

const documentoFields = z.object({
  empresaId: uuidSchema,
  usuarioId: optionalUuid,
  clienteId: optionalUuid,
  eventoId: optionalUuid,
  nome: requiredText("Nome"),
  tipo: tipoDocumentoSchema,
  url: z.string().trim().url("URL inválida").max(2_048),
  tamanho: z
    .union([z.bigint(), z.string().trim().regex(/^\d+$/)])
    .transform((value) => BigInt(value))
    .refine((value) => value >= 0n, "Tamanho inválido")
    .optional(),
});
export const documentoCreateSchema = documentoFields.strict();
export const documentoUpdateSchema = documentoFields.partial().strict();

export type EmpresaCreate = z.output<typeof empresaCreateSchema>;
export type UsuarioCreate = z.output<typeof usuarioCreateSchema>;
export type ClienteCreate = z.output<typeof clienteCreateSchema>;
export type LeadCreate = z.output<typeof leadCreateSchema>;
export type EventoCreate = z.output<typeof eventoCreateSchema>;
export type ServicoCreate = z.output<typeof servicoCreateSchema>;
export type OrcamentoCreate = z.output<typeof orcamentoCreateSchema>;
export type OrcamentoItemCreate = z.output<typeof orcamentoItemCreateSchema>;
export type PagamentoCreate = z.output<typeof pagamentoCreateSchema>;
export type CustoCreate = z.output<typeof custoCreateSchema>;
export type NotificacaoCreate = z.output<typeof notificacaoCreateSchema>;
export type DocumentoCreate = z.output<typeof documentoCreateSchema>;
export type EmpresaUpdate = z.output<typeof empresaUpdateSchema>;
export type UsuarioUpdate = z.output<typeof usuarioUpdateSchema>;
export type ClienteUpdate = z.output<typeof clienteUpdateSchema>;
export type LeadUpdate = z.output<typeof leadUpdateSchema>;
export type EventoUpdate = z.output<typeof eventoUpdateSchema>;
export type ServicoUpdate = z.output<typeof servicoUpdateSchema>;
export type OrcamentoUpdate = z.output<typeof orcamentoUpdateSchema>;
export type OrcamentoItemUpdate = z.output<typeof orcamentoItemUpdateSchema>;
export type PagamentoUpdate = z.output<typeof pagamentoUpdateSchema>;
export type CustoUpdate = z.output<typeof custoUpdateSchema>;
export type NotificacaoUpdate = z.output<typeof notificacaoUpdateSchema>;
export type DocumentoUpdate = z.output<typeof documentoUpdateSchema>;
