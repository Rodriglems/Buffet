import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { pagination, serialize } from "@/lib/domain.server";
import { getPrisma } from "@/lib/prisma.server";
import { requireAuth } from "@/lib/session.server";

export const listarNotificacoes = createServerFn({ method: "GET" })
  .inputValidator((value: unknown) =>
    z
      .object({
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().min(1).max(100).default(30),
        apenasNaoLidas: z.boolean().default(false),
      })
      .parse(value ?? {}),
  )
  .handler(async ({ data }) => {
    const auth = await requireAuth();
    const where = { usuarioId: auth.usuarioId, ...(data.apenasNaoLidas ? { lida: false } : {}) };
    const [items, total, naoLidas] = await getPrisma().$transaction([
      getPrisma().notificacao.findMany({
        where,
        ...pagination(data.page, data.pageSize),
        orderBy: { createdAt: "desc" },
      }),
      getPrisma().notificacao.count({ where }),
      getPrisma().notificacao.count({ where: { usuarioId: auth.usuarioId, lida: false } }),
    ]);
    return serialize({ items, total, naoLidas });
  });

export const marcarNotificacaoLida = createServerFn({ method: "POST" })
  .inputValidator((value: unknown) => z.object({ id: z.string().uuid() }).parse(value))
  .handler(async ({ data }) => {
    const auth = await requireAuth();
    const result = await getPrisma().notificacao.updateMany({
      where: { id: data.id, usuarioId: auth.usuarioId },
      data: { lida: true, lidaEm: new Date() },
    });
    if (!result.count) throw new Error("Notificacao nao encontrada.");
    return { ok: true };
  });

export const marcarTodasLidas = createServerFn({ method: "POST" }).handler(async () => {
  const auth = await requireAuth();
  await getPrisma().notificacao.updateMany({
    where: { usuarioId: auth.usuarioId, lida: false },
    data: { lida: true, lidaEm: new Date() },
  });
  return { ok: true };
});
