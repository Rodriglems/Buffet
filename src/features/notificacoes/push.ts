import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { enderecoPushPermitido } from "@/lib/push-endereco";
import { getPrisma } from "@/lib/prisma.server";
import { chavePublicaPush, enviarPush } from "@/lib/push.server";
import { requireAuth } from "@/lib/session.server";

const MAXIMO_APARELHOS = 10;
const endpoint = z.string().max(2000).refine(enderecoPushPermitido, "Aparelho não suportado.");

/** Chave pública usada pelo navegador; null quando o servidor não tem push configurado. */
export const obterChavePush = createServerFn({ method: "GET" }).handler(async () => {
  await requireAuth();
  return { chave: chavePublicaPush() };
});

/** Liga este aparelho à conta conectada; se outra pessoa usava o aparelho, ele passa para esta. */
export const salvarInscricaoPush = createServerFn({ method: "POST" })
  .validator((value: unknown) =>
    z
      .object({
        endpoint,
        keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
      })
      .parse(value),
  )
  .handler(async ({ data }) => {
    const auth = await requireAuth();
    const dados = { usuarioId: auth.usuarioId, p256dh: data.keys.p256dh, auth: data.keys.auth };
    await getPrisma().$transaction(async (tx) => {
      await tx.pushInscricao.upsert({
        where: { endpoint: data.endpoint },
        update: dados,
        create: { ...dados, endpoint: data.endpoint },
      });
      const excedentes = await tx.pushInscricao.findMany({
        where: { usuarioId: auth.usuarioId },
        orderBy: { updatedAt: "desc" },
        skip: MAXIMO_APARELHOS,
        select: { id: true },
      });
      if (excedentes.length) {
        await tx.pushInscricao.deleteMany({
          where: { id: { in: excedentes.map((inscricao) => inscricao.id) } },
        });
      }
    });
    return { ok: true };
  });

export const removerInscricaoPush = createServerFn({ method: "POST" })
  .validator((value: unknown) => z.object({ endpoint: z.string().max(2000) }).parse(value))
  .handler(async ({ data }) => {
    const auth = await requireAuth();
    await getPrisma().pushInscricao.deleteMany({
      where: { endpoint: data.endpoint, usuarioId: auth.usuarioId },
    });
    return { ok: true };
  });

/** Confirma na hora se a notificação chega nos aparelhos da própria conta. */
export const enviarPushDeTeste = createServerFn({ method: "POST" }).handler(async () => {
  const auth = await requireAuth();
  return enviarPush([auth.usuarioId], {
    titulo: "Notificações ativadas",
    mensagem: "Tudo certo! Você vai receber os avisos do Mesly neste aparelho.",
    url: auth.role === "ADMIN" ? "/admin/notificacoes" : "/cliente",
    etiqueta: "teste",
  });
});
