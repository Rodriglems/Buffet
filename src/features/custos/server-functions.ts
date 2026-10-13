import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { pagination, serialize } from "@/lib/domain.server";
import { getPrisma } from "@/lib/prisma.server";
import { requireAuth } from "@/lib/session.server";

const custo = z.object({
  eventoId: z.string().uuid(),
  categoria: z.string().trim().min(2).max(100),
  descricao: z.string().trim().min(2).max(300),
  fornecedor: z.string().trim().max(160).nullable().optional(),
  valor: z.coerce.number().nonnegative(),
  data: z.coerce.date(),
  observacoes: z.string().trim().max(2000).nullable().optional(),
});
const id = z.object({ id: z.string().uuid() });

export const listarCustos = createServerFn({ method: "GET" })
  .inputValidator((value: unknown) =>
    z
      .object({
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().min(1).max(100).default(30),
        eventoId: z.string().uuid().optional(),
      })
      .parse(value ?? {}),
  )
  .handler(async ({ data }) => {
    const auth = await requireAuth("ADMIN");
    const where = {
      empresaId: auth.empresaId,
      ...(data.eventoId ? { eventoId: data.eventoId } : {}),
    };
    const [items, total, agregado] = await getPrisma().$transaction([
      getPrisma().custo.findMany({
        where,
        ...pagination(data.page, data.pageSize),
        include: { evento: { select: { nome: true } } },
        orderBy: { data: "desc" },
      }),
      getPrisma().custo.count({ where }),
      getPrisma().custo.aggregate({ where, _sum: { valor: true } }),
    ]);
    return serialize({ items, total, valorTotal: agregado._sum.valor ?? 0 });
  });

export const criarCusto = createServerFn({ method: "POST" })
  .inputValidator((value: unknown) => custo.parse(value))
  .handler(async ({ data }) => {
    const auth = await requireAuth("ADMIN");
    const evento = await getPrisma().evento.findFirst({
      where: { id: data.eventoId, empresaId: auth.empresaId },
    });
    if (!evento) throw new Error("Evento invalido.");
    return serialize(
      await getPrisma().custo.create({
        data: { ...data, valor: data.valor.toFixed(2), empresaId: auth.empresaId },
      }),
    );
  });

export const atualizarCusto = createServerFn({ method: "POST" })
  .inputValidator((value: unknown) => id.extend({ dados: custo.partial() }).parse(value))
  .handler(async ({ data }) => {
    const auth = await requireAuth("ADMIN");
    const found = await getPrisma().custo.findFirst({
      where: { id: data.id, empresaId: auth.empresaId },
    });
    if (!found) throw new Error("Custo nao encontrado.");
    const dados = {
      ...data.dados,
      ...(data.dados.valor === undefined ? {} : { valor: data.dados.valor.toFixed(2) }),
    };
    return serialize(await getPrisma().custo.update({ where: { id: found.id }, data: dados }));
  });

export const excluirCusto = createServerFn({ method: "POST" })
  .inputValidator((value: unknown) => id.parse(value))
  .handler(async ({ data }) => {
    const auth = await requireAuth("ADMIN");
    const result = await getPrisma().custo.deleteMany({
      where: { id: data.id, empresaId: auth.empresaId },
    });
    if (!result.count) throw new Error("Custo nao encontrado.");
    return { ok: true };
  });
