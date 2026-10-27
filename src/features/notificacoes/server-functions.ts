import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { pagination, serialize } from "@/lib/domain.server";
import { getPrisma } from "@/lib/prisma.server";
import { requireAuth, requirePermission } from "@/lib/session.server";

export const listarNotificacoes = createServerFn({ method: "GET" })
  .validator((value: unknown) =>
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
  .validator((value: unknown) => z.object({ id: z.string().uuid() }).parse(value))
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

export const gerarLembretesOperacionais = createServerFn({ method: "POST" }).handler(async () => {
  const auth = await requirePermission("notificacoes");
  const inicio = new Date();
  inicio.setHours(0, 0, 0, 0);
  const limite = new Date(inicio);
  limite.setDate(limite.getDate() + 7);

  return getPrisma().$transaction(async (tx) => {
    await tx.pagamento.updateMany({
      where: {
        empresaId: auth.empresaId,
        status: "PENDENTE",
        dataVencimento: { lt: inicio },
      },
      data: { status: "ATRASADO" },
    });

    const [eventos, pagamentos, admins] = await Promise.all([
      tx.evento.count({
        where: {
          empresaId: auth.empresaId,
          dataEvento: { gte: inicio, lte: limite },
          status: { notIn: ["CANCELADO", "FINALIZADO"] },
        },
      }),
      tx.pagamento.count({
        where: { empresaId: auth.empresaId, status: "ATRASADO" },
      }),
      tx.usuario.findMany({
        where: { empresaId: auth.empresaId, role: "ADMIN", ativo: true },
        select: { id: true },
      }),
    ]);

    const existentes = await tx.notificacao.findMany({
      where: {
        usuarioId: { in: admins.map((admin) => admin.id) },
        tipo: { in: ["RESUMO_EVENTOS_PROXIMOS", "RESUMO_PAGAMENTOS_ATRASADOS"] },
        createdAt: { gte: inicio },
      },
      select: { usuarioId: true, tipo: true },
    });
    const keys = new Set(existentes.map((item) => `${item.usuarioId}:${item.tipo}`));
    const novas = admins.flatMap((admin) => {
      const data: Array<{
        usuarioId: string;
        tipo: string;
        titulo: string;
        mensagem: string;
      }> = [];
      if (eventos && !keys.has(`${admin.id}:RESUMO_EVENTOS_PROXIMOS`)) {
        data.push({
          usuarioId: admin.id,
          tipo: "RESUMO_EVENTOS_PROXIMOS",
          titulo: "Eventos nos próximos 7 dias",
          mensagem: `${eventos} evento(s) precisam de acompanhamento nesta semana.`,
        });
      }
      if (pagamentos && !keys.has(`${admin.id}:RESUMO_PAGAMENTOS_ATRASADOS`)) {
        data.push({
          usuarioId: admin.id,
          tipo: "RESUMO_PAGAMENTOS_ATRASADOS",
          titulo: "Pagamentos em atraso",
          mensagem: `${pagamentos} pagamento(s) estão vencidos.`,
        });
      }
      return data;
    });
    if (novas.length) await tx.notificacao.createMany({ data: novas });
    return { eventos, pagamentos, notificacoesCriadas: novas.length };
  });
});
