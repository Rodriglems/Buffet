import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { pagination, serialize } from "@/lib/domain.server";
import { getPrisma } from "@/lib/prisma.server";
import { requireAuth } from "@/lib/session.server";

export const listarAtividades = createServerFn({ method: "GET" })
  .inputValidator((value: unknown) =>
    z
      .object({
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().min(1).max(100).default(30),
        entidadeTipo: z.string().max(80).optional(),
        entidadeId: z.string().uuid().optional(),
      })
      .parse(value ?? {}),
  )
  .handler(async ({ data }) => {
    const auth = await requireAuth("ADMIN");
    const where = {
      empresaId: auth.empresaId,
      ...(data.entidadeTipo ? { entidadeTipo: data.entidadeTipo } : {}),
      ...(data.entidadeId ? { entidadeId: data.entidadeId } : {}),
    };
    const [items, total] = await getPrisma().$transaction([
      getPrisma().atividade.findMany({
        where,
        ...pagination(data.page, data.pageSize),
        include: { usuario: { select: { nome: true } } },
        orderBy: { createdAt: "desc" },
      }),
      getPrisma().atividade.count({ where }),
    ]);
    return serialize({ items, total });
  });
