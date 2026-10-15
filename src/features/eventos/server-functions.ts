import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { pagination, registrarAtividade, serialize } from "@/lib/domain.server";
import { getPrisma } from "@/lib/prisma.server";
import { requireAuth, requirePermission } from "@/lib/session.server";

const eventoBase = z.object({
  clienteId: z.string().uuid(),
  nome: z.string().trim().min(2).max(180),
  tipo: z.string().trim().min(2).max(100),
  dataEvento: z.coerce.date(),
  horaInicio: z.coerce.date().nullable().optional(),
  horaFim: z.coerce.date().nullable().optional(),
  quantidadeConvidados: z.number().int().positive(),
  localNome: z.string().trim().max(160).nullable().optional(),
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
  status: z
    .enum([
      "PLANEJAMENTO",
      "ORCAMENTO",
      "NEGOCIACAO",
      "APROVADO",
      "CONTRATO",
      "ASSINADO",
      "CONFIRMADO",
      "REALIZADO",
      "FINALIZADO",
      "CANCELADO",
    ])
    .default("PLANEJAMENTO"),
  observacoes: z.string().trim().max(4000).nullable().optional(),
});
const evento = eventoBase.refine(
  (data) => !data.horaInicio || !data.horaFim || data.horaFim > data.horaInicio,
  { message: "Hora final deve ser posterior a inicial.", path: ["horaFim"] },
);
const id = z.object({ id: z.string().uuid() });

export const listarEventos = createServerFn({ method: "GET" })
  .inputValidator((value: unknown) =>
    z
      .object({
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      })
      .parse(value ?? {}),
  )
  .handler(async ({ data }) => {
    const auth = await requireAuth();
    const where = {
      empresaId: auth.empresaId,
      ...(auth.role === "CLIENT" ? { cliente: { usuarioId: auth.usuarioId } } : {}),
    };
    const [items, total] = await getPrisma().$transaction([
      getPrisma().evento.findMany({
        where,
        ...pagination(data.page, data.pageSize),
        include: { cliente: { select: { nome: true } } },
        orderBy: { dataEvento: "asc" },
      }),
      getPrisma().evento.count({ where }),
    ]);
    return serialize({ items, total });
  });

export const obterEvento = createServerFn({ method: "GET" })
  .inputValidator((value: unknown) => id.parse(value))
  .handler(async ({ data }) => {
    const auth = await requireAuth();
    const result = await getPrisma().evento.findFirst({
      where: {
        id: data.id,
        empresaId: auth.empresaId,
        ...(auth.role === "CLIENT" ? { cliente: { usuarioId: auth.usuarioId } } : {}),
      },
      include: { cliente: true, orcamentos: true, contratos: true, custos: true, documentos: true },
    });
    if (!result) throw new Error("Evento nao encontrado.");
    return serialize(result);
  });

export const criarEvento = createServerFn({ method: "POST" })
  .inputValidator((value: unknown) => evento.parse(value))
  .handler(async ({ data }) => {
    const auth = await requirePermission("eventos");
    const cliente = await getPrisma().cliente.findFirst({
      where: { id: data.clienteId, empresaId: auth.empresaId },
    });
    if (!cliente) throw new Error("Cliente invalido.");
    return getPrisma().$transaction(async (tx) => {
      const result = await tx.evento.create({ data: { ...data, empresaId: auth.empresaId } });
      await registrarAtividade(tx, auth, {
        tipo: "EVENTO_CRIADO",
        descricao: `Evento ${result.nome} criado.`,
        entidadeTipo: "EVENTO",
        entidadeId: result.id,
      });
      return serialize(result);
    });
  });

export const atualizarEvento = createServerFn({ method: "POST" })
  .inputValidator((value: unknown) => id.extend({ dados: eventoBase.partial() }).parse(value))
  .handler(async ({ data }) => {
    const auth = await requirePermission("eventos");
    const found = await getPrisma().evento.findFirst({
      where: { id: data.id, empresaId: auth.empresaId },
    });
    if (!found) throw new Error("Evento nao encontrado.");
    if (data.dados.clienteId) {
      const cliente = await getPrisma().cliente.findFirst({
        where: { id: data.dados.clienteId, empresaId: auth.empresaId },
      });
      if (!cliente) throw new Error("Cliente invalido.");
    }
    return serialize(
      await getPrisma().evento.update({ where: { id: found.id }, data: data.dados }),
    );
  });

export const excluirEvento = createServerFn({ method: "POST" })
  .inputValidator((value: unknown) => id.parse(value))
  .handler(async ({ data }) => {
    const auth = await requirePermission("eventos");
    const found = await getPrisma().evento.findFirst({
      where: { id: data.id, empresaId: auth.empresaId },
      include: { _count: { select: { orcamentos: true, contratos: true, custos: true } } },
    });
    if (!found) throw new Error("Evento nao encontrado.");
    if (found._count.orcamentos || found._count.contratos || found._count.custos)
      throw new Error("Evento possui historico e nao pode ser excluido.");
    await getPrisma().evento.delete({ where: { id: found.id } });
    return { ok: true };
  });
