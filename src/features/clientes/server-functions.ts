import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { pagination, registrarAtividade, serialize } from "@/lib/domain.server";
import { getPrisma } from "@/lib/prisma.server";
import { requireAuth } from "@/lib/session.server";

const clienteSchema = z.object({
  nome: z.string().trim().min(2).max(160),
  tipoPessoa: z.enum(["FISICA", "JURIDICA"]),
  cpfCnpj: z
    .string()
    .regex(/^\d{11}(\d{3})?$/)
    .nullable()
    .optional(),
  email: z.string().trim().email().toLowerCase().nullable().optional(),
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
  cep: z
    .string()
    .regex(/^\d{8}$/)
    .nullable()
    .optional(),
  estado: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .nullable()
    .optional(),
  cidade: z.string().trim().max(120).nullable().optional(),
  bairro: z.string().trim().max(120).nullable().optional(),
  logradouro: z.string().trim().max(200).nullable().optional(),
  numero: z.string().trim().max(30).nullable().optional(),
  complemento: z.string().trim().max(120).nullable().optional(),
  observacoes: z.string().trim().max(4000).nullable().optional(),
  usuarioId: z.string().uuid().nullable().optional(),
});
const idSchema = z.object({ id: z.string().uuid() });
const listSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  busca: z.string().trim().max(100).default(""),
});

export const listarClientes = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => listSchema.parse(input ?? {}))
  .handler(async ({ data }) => {
    const auth = await requireAuth("ADMIN");
    const where = {
      empresaId: auth.empresaId,
      ...(data.busca
        ? {
            OR: [
              { nome: { contains: data.busca, mode: "insensitive" as const } },
              { email: { contains: data.busca, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
    const [items, total] = await getPrisma().$transaction([
      getPrisma().cliente.findMany({
        where,
        ...pagination(data.page, data.pageSize),
        orderBy: { nome: "asc" },
      }),
      getPrisma().cliente.count({ where }),
    ]);
    return serialize({ items, total, page: data.page, pageSize: data.pageSize });
  });

export const obterCliente = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data }) => {
    const auth = await requireAuth();
    const cliente = await getPrisma().cliente.findFirst({
      where: {
        id: data.id,
        empresaId: auth.empresaId,
        ...(auth.role === "CLIENT" ? { usuarioId: auth.usuarioId } : {}),
      },
      include: { eventos: { orderBy: { dataEvento: "desc" } } },
    });
    if (!cliente) throw new Error("Cliente nao encontrado.");
    return serialize(cliente);
  });

export const criarCliente = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => clienteSchema.parse(input))
  .handler(async ({ data }) => {
    const auth = await requireAuth("ADMIN");
    return getPrisma().$transaction(async (tx) => {
      const cliente = await tx.cliente.create({ data: { ...data, empresaId: auth.empresaId } });
      await registrarAtividade(tx, auth, {
        tipo: "CLIENTE_CRIADO",
        descricao: `Cliente ${cliente.nome} cadastrado.`,
        entidadeTipo: "CLIENTE",
        entidadeId: cliente.id,
      });
      return serialize(cliente);
    });
  });

export const atualizarCliente = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    idSchema.extend({ dados: clienteSchema.partial() }).parse(input),
  )
  .handler(async ({ data }) => {
    const auth = await requireAuth("ADMIN");
    const existing = await getPrisma().cliente.findFirst({
      where: { id: data.id, empresaId: auth.empresaId },
    });
    if (!existing) throw new Error("Cliente nao encontrado.");
    return serialize(
      await getPrisma().cliente.update({ where: { id: data.id }, data: data.dados }),
    );
  });

export const excluirCliente = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data }) => {
    const auth = await requireAuth("ADMIN");
    const existing = await getPrisma().cliente.findFirst({
      where: { id: data.id, empresaId: auth.empresaId },
      include: { _count: { select: { eventos: true, documentos: true } } },
    });
    if (!existing) throw new Error("Cliente nao encontrado.");
    if (existing._count.eventos || existing._count.documentos) {
      throw new Error("Cliente possui historico e nao pode ser excluido.");
    }
    await getPrisma().cliente.delete({ where: { id: data.id } });
    return { ok: true };
  });
