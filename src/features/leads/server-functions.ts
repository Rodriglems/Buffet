import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { pagination, registrarAtividade, serialize } from "@/lib/domain.server";
import { getPrisma } from "@/lib/prisma.server";
import { requirePermission } from "@/lib/session.server";

const status = z.enum([
  "NOVO",
  "CONTATO_REALIZADO",
  "QUALIFICADO",
  "PROPOSTA",
  "CONVERTIDO",
  "PERDIDO",
]);
const leadSchema = z.object({
  nome: z.string().trim().min(2).max(160),
  email: z.string().email().toLowerCase().nullable().optional(),
  telefone: z
    .string()
    .regex(/^\d{10,11}$/)
    .nullable()
    .optional(),
  whatsapp: z
    .string()
    .regex(/^\d{10,11}$/)
    .nullable()
    .optional(),
  tipoEvento: z.string().trim().max(100).nullable().optional(),
  dataEvento: z.coerce.date().nullable().optional(),
  quantidadeConvidados: z.number().int().positive().nullable().optional(),
  origem: z.string().trim().max(100).nullable().optional(),
  observacoes: z.string().trim().max(4000).nullable().optional(),
  status: status.default("NOVO"),
});
const id = z.object({ id: z.string().uuid() });

export const listarLeads = createServerFn({ method: "GET" })
  .inputValidator((value: unknown) =>
    z
      .object({
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
        status: status.optional(),
      })
      .parse(value ?? {}),
  )
  .handler(async ({ data }) => {
    const auth = await requirePermission("leads");
    const where = { empresaId: auth.empresaId, ...(data.status ? { status: data.status } : {}) };
    const [items, total] = await getPrisma().$transaction([
      getPrisma().lead.findMany({
        where,
        ...pagination(data.page, data.pageSize),
        orderBy: { createdAt: "desc" },
      }),
      getPrisma().lead.count({ where }),
    ]);
    return serialize({ items, total });
  });

export const criarLead = createServerFn({ method: "POST" })
  .inputValidator((value: unknown) => leadSchema.parse(value))
  .handler(async ({ data }) => {
    const auth = await requirePermission("leads");
    const lead = await getPrisma().lead.create({ data: { ...data, empresaId: auth.empresaId } });
    return serialize(lead);
  });

export const atualizarLead = createServerFn({ method: "POST" })
  .inputValidator((value: unknown) => id.extend({ dados: leadSchema.partial() }).parse(value))
  .handler(async ({ data }) => {
    const auth = await requirePermission("leads");
    const result = await getPrisma().lead.updateMany({
      where: { id: data.id, empresaId: auth.empresaId },
      data: data.dados,
    });
    if (!result.count) throw new Error("Lead nao encontrado.");
    return { ok: true };
  });

export const excluirLead = createServerFn({ method: "POST" })
  .inputValidator((value: unknown) => id.parse(value))
  .handler(async ({ data }) => {
    const auth = await requirePermission("leads");
    const lead = await getPrisma().lead.findFirst({
      where: { id: data.id, empresaId: auth.empresaId },
    });
    if (!lead) throw new Error("Lead nao encontrado.");
    if (lead.status === "CONVERTIDO") throw new Error("Lead convertido nao pode ser excluido.");
    await getPrisma().lead.delete({ where: { id: lead.id } });
    return { ok: true };
  });

export const converterLead = createServerFn({ method: "POST" })
  .inputValidator((value: unknown) =>
    id
      .extend({
        tipoPessoa: z.enum(["FISICA", "JURIDICA"]),
        cpfCnpj: z
          .string()
          .regex(/^\d{11}(\d{3})?$/)
          .nullable()
          .optional(),
      })
      .parse(value),
  )
  .handler(async ({ data }) => {
    const auth = await requirePermission("leads");
    return getPrisma().$transaction(async (tx) => {
      const lead = await tx.lead.findFirst({ where: { id: data.id, empresaId: auth.empresaId } });
      if (!lead || lead.status === "CONVERTIDO") throw new Error("Lead invalido para conversao.");
      const cliente = await tx.cliente.create({
        data: {
          empresaId: auth.empresaId,
          nome: lead.nome,
          tipoPessoa: data.tipoPessoa,
          cpfCnpj: data.cpfCnpj,
          email: lead.email,
          telefone: lead.telefone,
          whatsapp: lead.whatsapp,
          observacoes: lead.observacoes,
        },
      });
      await tx.lead.update({ where: { id: lead.id }, data: { status: "CONVERTIDO" } });
      await registrarAtividade(tx, auth, {
        tipo: "LEAD_CONVERTIDO",
        descricao: `${lead.nome} convertido em cliente.`,
        entidadeTipo: "CLIENTE",
        entidadeId: cliente.id,
      });
      return serialize(cliente);
    });
  });
export type LeadStatus = "Novo" | "Em contato" | "Qualificado" | "Convertido";

export interface Lead {
  id: string;
  nome: string;
  contato: string;
  interesse: string;
  origem: string;
  status: LeadStatus;
  criadoEm: string;
}

export type CreateLeadInput = Omit<Lead, "id" | "criadoEm">;

const leadStatusToDb = {
  Novo: "NOVO",
  "Em contato": "CONTATO_REALIZADO",
  Qualificado: "QUALIFICADO",
  Convertido: "CONVERTIDO",
} as const;
const leadStatusFromDb: Record<string, LeadStatus> = {
  NOVO: "Novo",
  CONTATO_REALIZADO: "Em contato",
  QUALIFICADO: "Qualificado",
  CONVERTIDO: "Convertido",
};

export async function listLeads(): Promise<Lead[]> {
  const result = await listarLeads({ data: { page: 1, pageSize: 100 } });
  return result.items.map((entry) => ({
    id: entry.id,
    nome: entry.nome,
    contato: entry.email ?? entry.whatsapp ?? entry.telefone ?? "—",
    interesse: entry.tipoEvento ?? entry.observacoes ?? "Não informado",
    origem: entry.origem ?? "Não informada",
    status: leadStatusFromDb[entry.status] ?? "Novo",
    criadoEm: new Date(entry.createdAt).toISOString().slice(0, 10),
  }));
}

export async function createLead(input: CreateLeadInput): Promise<Lead> {
  const email = input.contato.includes("@") ? input.contato : null;
  const telefone = email ? null : input.contato.replace(/\D/g, "") || null;
  const created = await criarLead({
    data: {
      nome: input.nome,
      email,
      telefone,
      tipoEvento: input.interesse,
      origem: input.origem || null,
      status: leadStatusToDb[input.status],
    },
  });
  return {
    ...input,
    id: created.id,
    criadoEm: new Date(created.createdAt).toISOString().slice(0, 10),
  };
}
