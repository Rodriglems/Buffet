import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { notificar, pagination, registrarAtividade, serialize } from "@/lib/domain.server";
import { getPrisma } from "@/lib/prisma.server";
import { requireAuth } from "@/lib/session.server";

const id = z.object({ id: z.string().uuid() });

export const listarContratos = createServerFn({ method: "GET" })
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
      ...(auth.role === "CLIENT" ? { evento: { cliente: { usuarioId: auth.usuarioId } } } : {}),
    };
    const [items, total] = await getPrisma().$transaction([
      getPrisma().contrato.findMany({
        where,
        ...pagination(data.page, data.pageSize),
        include: {
          evento: { include: { cliente: { select: { nome: true } } } },
          assinaturas: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      getPrisma().contrato.count({ where }),
    ]);
    return serialize({ items, total });
  });

export const obterContrato = createServerFn({ method: "GET" })
  .inputValidator((value: unknown) => id.parse(value))
  .handler(async ({ data }) => {
    const auth = await requireAuth();
    const result = await getPrisma().contrato.findFirst({
      where: {
        id: data.id,
        empresaId: auth.empresaId,
        ...(auth.role === "CLIENT" ? { evento: { cliente: { usuarioId: auth.usuarioId } } } : {}),
      },
      include: {
        evento: { include: { cliente: true } },
        orcamento: { include: { itens: true } },
        assinaturas: true,
        pagamentos: true,
        documentos: true,
      },
    });
    if (!result) throw new Error("Contrato nao encontrado.");
    return serialize(result);
  });

export const atualizarConteudoContrato = createServerFn({ method: "POST" })
  .inputValidator((value: unknown) =>
    id
      .extend({
        conteudo: z.string().min(20).max(100000),
        documentoUrl: z.string().url().nullable().optional(),
      })
      .parse(value),
  )
  .handler(async ({ data }) => {
    const auth = await requireAuth("ADMIN");
    const found = await getPrisma().contrato.findFirst({
      where: { id: data.id, empresaId: auth.empresaId },
    });
    if (!found || found.status !== "RASCUNHO")
      throw new Error("Somente contratos em rascunho podem ser editados.");
    return serialize(
      await getPrisma().contrato.update({
        where: { id: found.id },
        data: { conteudo: data.conteudo, documentoUrl: data.documentoUrl },
      }),
    );
  });

export const enviarContrato = createServerFn({ method: "POST" })
  .inputValidator((value: unknown) => id.parse(value))
  .handler(async ({ data }) => {
    const auth = await requireAuth("ADMIN");
    return getPrisma().$transaction(async (tx) => {
      const found = await tx.contrato.findFirst({
        where: { id: data.id, empresaId: auth.empresaId },
        include: { evento: { include: { cliente: true } }, assinaturas: true },
      });
      const usuarioId = found?.evento.cliente.usuarioId;
      if (!found || found.status !== "RASCUNHO" || !usuarioId)
        throw new Error("Contrato sem cliente usuario apto para assinatura.");
      const now = new Date();
      await tx.contrato.update({
        where: { id: found.id },
        data: { status: "AGUARDANDO_ASSINATURA", enviadoEm: now },
      });
      if (!found.assinaturas.some((entry) => entry.usuarioId === usuarioId)) {
        await tx.assinatura.create({
          data: { contratoId: found.id, usuarioId, tipo: "CLIENTE", status: "PENDENTE" },
        });
      }
      await notificar(tx, usuarioId, {
        tipo: "CONTRATO_ENVIADO",
        titulo: "Contrato para assinatura",
        mensagem: `O contrato ${found.numero.toString()} aguarda sua assinatura.`,
      });
      await registrarAtividade(tx, auth, {
        tipo: "CONTRATO_ENVIADO",
        descricao: `Contrato ${found.numero.toString()} enviado.`,
        entidadeTipo: "CONTRATO",
        entidadeId: found.id,
      });
      return { ok: true };
    });
  });

export const assinarContrato = createServerFn({ method: "POST" })
  .inputValidator((value: unknown) =>
    id
      .extend({
        ip: z.string().max(64).nullable().optional(),
        userAgent: z.string().max(1000).nullable().optional(),
      })
      .parse(value),
  )
  .handler(async ({ data }) => {
    const auth = await requireAuth("CLIENT");
    return getPrisma().$transaction(async (tx) => {
      const found = await tx.contrato.findFirst({
        where: {
          id: data.id,
          empresaId: auth.empresaId,
          evento: { cliente: { usuarioId: auth.usuarioId } },
          status: "AGUARDANDO_ASSINATURA",
        },
      });
      if (!found) throw new Error("Contrato nao disponivel para assinatura.");
      const assinatura = await tx.assinatura.findFirst({
        where: { contratoId: found.id, usuarioId: auth.usuarioId, status: "PENDENTE" },
      });
      if (!assinatura) throw new Error("Solicitacao de assinatura nao encontrada.");
      const now = new Date();
      await tx.assinatura.update({
        where: { id: assinatura.id },
        data: { status: "ASSINADA", assinadoEm: now, ip: data.ip, userAgent: data.userAgent },
      });
      await tx.contrato.update({
        where: { id: found.id },
        data: { status: "ASSINADO", assinadoEm: now },
      });
      await tx.evento.update({ where: { id: found.eventoId }, data: { status: "ASSINADO" } });
      await registrarAtividade(tx, auth, {
        tipo: "CONTRATO_ASSINADO",
        descricao: `Contrato ${found.numero.toString()} assinado.`,
        entidadeTipo: "CONTRATO",
        entidadeId: found.id,
      });
      return { ok: true };
    });
  });

export const cancelarContrato = createServerFn({ method: "POST" })
  .inputValidator((value: unknown) => id.parse(value))
  .handler(async ({ data }) => {
    const auth = await requireAuth("ADMIN");
    const found = await getPrisma().contrato.findFirst({
      where: { id: data.id, empresaId: auth.empresaId },
    });
    if (!found || found.status === "ASSINADO") throw new Error("Contrato nao pode ser cancelado.");
    await getPrisma().$transaction([
      getPrisma().contrato.update({ where: { id: found.id }, data: { status: "CANCELADO" } }),
      getPrisma().assinatura.updateMany({
        where: { contratoId: found.id, status: "PENDENTE" },
        data: { status: "CANCELADA" },
      }),
    ]);
    return { ok: true };
  });
