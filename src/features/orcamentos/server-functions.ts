import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { notificar, pagination, registrarAtividade, serialize } from "@/lib/domain.server";
import { getPrisma } from "@/lib/prisma.server";
import { requireAuth, requirePermission } from "@/lib/session.server";

const item = z
  .object({
    servicoId: z.string().uuid().nullable().optional(),
    descricao: z.string().trim().min(2).max(300),
    quantidade: z.coerce.number().positive().max(999999999),
    unidade: z.string().trim().min(1).max(30),
    valorUnitario: z.coerce.number().nonnegative().max(999999999999),
    desconto: z.coerce.number().nonnegative().default(0),
  })
  .refine((value) => value.desconto <= value.quantidade * value.valorUnitario, {
    message: "Desconto do item invalido.",
    path: ["desconto"],
  });
const orcamento = z.object({
  eventoId: z.string().uuid(),
  validade: z.coerce.date().nullable().optional(),
  desconto: z.coerce.number().nonnegative().default(0),
  observacoes: z.string().trim().max(5000).nullable().optional(),
  itens: z.array(item).min(1).max(200),
});
const id = z.object({ id: z.string().uuid() });
const money = (value: number) => value.toFixed(2);

export const listarOrcamentos = createServerFn({ method: "GET" })
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
      getPrisma().orcamento.findMany({
        where,
        ...pagination(data.page, data.pageSize),
        include: {
          evento: { include: { cliente: { select: { nome: true } } } },
          _count: { select: { itens: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      getPrisma().orcamento.count({ where }),
    ]);
    return serialize({ items, total });
  });

export const obterOrcamento = createServerFn({ method: "GET" })
  .inputValidator((value: unknown) => id.parse(value))
  .handler(async ({ data }) => {
    const auth = await requireAuth();
    const result = await getPrisma().orcamento.findFirst({
      where: {
        id: data.id,
        empresaId: auth.empresaId,
        ...(auth.role === "CLIENT" ? { evento: { cliente: { usuarioId: auth.usuarioId } } } : {}),
      },
      include: {
        itens: { include: { servico: true } },
        evento: { include: { cliente: true } },
        contratos: true,
      },
    });
    if (!result) throw new Error("Orcamento nao encontrado.");
    if (auth.role === "CLIENT" && result.status === "ENVIADO") {
      await getPrisma().orcamento.update({
        where: { id: result.id },
        data: { status: "VISUALIZADO" },
      });
    }
    return serialize(result);
  });

export const criarOrcamento = createServerFn({ method: "POST" })
  .inputValidator((value: unknown) => orcamento.parse(value))
  .handler(async ({ data }) => {
    const auth = await requirePermission("orcamentos");
    return getPrisma().$transaction(async (tx) => {
      const evento = await tx.evento.findFirst({
        where: { id: data.eventoId, empresaId: auth.empresaId },
      });
      if (!evento) throw new Error("Evento invalido.");
      const servicoIds = data.itens.flatMap((entry) => (entry.servicoId ? [entry.servicoId] : []));
      const validos = await tx.servico.count({
        where: { empresaId: auth.empresaId, id: { in: servicoIds } },
      });
      if (validos !== new Set(servicoIds).size)
        throw new Error("Um ou mais servicos sao invalidos.");

      const ultimo = await tx.orcamento.findFirst({
        where: { empresaId: auth.empresaId },
        orderBy: { numero: "desc" },
        select: { numero: true },
      });
      const subtotal = data.itens.reduce(
        (sum, entry) => sum + entry.quantidade * entry.valorUnitario - entry.desconto,
        0,
      );
      if (data.desconto > subtotal) throw new Error("Desconto maior que o subtotal.");
      const created = await tx.orcamento.create({
        data: {
          empresaId: auth.empresaId,
          eventoId: data.eventoId,
          numero: (ultimo?.numero ?? 0n) + 1n,
          validade: data.validade,
          subtotal: money(subtotal),
          desconto: money(data.desconto),
          total: money(subtotal - data.desconto),
          observacoes: data.observacoes,
          itens: {
            create: data.itens.map((entry) => ({
              servicoId: entry.servicoId,
              descricao: entry.descricao,
              quantidade: entry.quantidade.toString(),
              unidade: entry.unidade,
              valorUnitario: money(entry.valorUnitario),
              desconto: money(entry.desconto),
              valorTotal: money(entry.quantidade * entry.valorUnitario - entry.desconto),
            })),
          },
        },
        include: { itens: true },
      });
      await tx.evento.update({ where: { id: evento.id }, data: { status: "ORCAMENTO" } });
      await registrarAtividade(tx, auth, {
        tipo: "ORCAMENTO_CRIADO",
        descricao: `Orcamento ${created.numero.toString()} criado.`,
        entidadeTipo: "ORCAMENTO",
        entidadeId: created.id,
      });
      return serialize(created);
    });
  });

export const excluirOrcamento = createServerFn({ method: "POST" })
  .inputValidator((value: unknown) => id.parse(value))
  .handler(async ({ data }) => {
    const auth = await requirePermission("orcamentos");
    const found = await getPrisma().orcamento.findFirst({
      where: { id: data.id, empresaId: auth.empresaId },
      include: { _count: { select: { contratos: true } } },
    });
    if (!found) throw new Error("Orcamento nao encontrado.");
    if (found.status !== "RASCUNHO" || found._count.contratos)
      throw new Error("Somente rascunhos sem contrato podem ser excluidos.");
    await getPrisma().orcamento.delete({ where: { id: found.id } });
    return { ok: true };
  });

export const enviarOrcamento = createServerFn({ method: "POST" })
  .inputValidator((value: unknown) =>
    id.extend({ mensagem: z.string().trim().max(2000).nullable().optional() }).parse(value),
  )
  .handler(async ({ data }) => {
    const auth = await requirePermission("orcamentos");
    return getPrisma().$transaction(async (tx) => {
      const found = await tx.orcamento.findFirst({
        where: { id: data.id, empresaId: auth.empresaId },
        include: { evento: { include: { cliente: true } } },
      });
      if (!found || ["APROVADO", "REJEITADO", "EXPIRADO", "CANCELADO"].includes(found.status))
        throw new Error("Orcamento nao pode ser enviado.");
      if (["RASCUNHO", "EM_NEGOCIACAO"].includes(found.status)) {
        await tx.orcamento.update({ where: { id: found.id }, data: { status: "ENVIADO" } });
      }
      if (found.evento.cliente.usuarioId) {
        await notificar(tx, found.evento.cliente.usuarioId, {
          tipo: "ORCAMENTO_ENVIADO",
          titulo: "Novo orcamento",
          mensagem:
            data.mensagem || `O orçamento ${found.numero.toString()} está disponível para análise.`,
        });
      }
      await registrarAtividade(tx, auth, {
        tipo: "ORCAMENTO_ENVIADO",
        descricao: `Orcamento enviado para ${found.evento.cliente.nome}.`,
        entidadeTipo: "ORCAMENTO",
        entidadeId: found.id,
      });
      return {
        ok: true,
        cliente: found.evento.cliente.nome,
        whatsapp: found.evento.cliente.whatsapp,
      };
    });
  });

export const criarVersaoOrcamento = createServerFn({ method: "POST" })
  .inputValidator((value: unknown) => id.parse(value))
  .handler(async ({ data }) => {
    const auth = await requirePermission("orcamentos");
    return getPrisma().$transaction(async (tx) => {
      const anterior = await tx.orcamento.findFirst({
        where: { id: data.id, empresaId: auth.empresaId },
        include: { itens: true },
      });
      if (!anterior || ["APROVADO", "CANCELADO"].includes(anterior.status)) {
        throw new Error("Nao e possivel versionar este orcamento.");
      }
      const ultima = await tx.orcamento.findFirst({
        where: { empresaId: auth.empresaId, eventoId: anterior.eventoId, numero: anterior.numero },
        orderBy: { versao: "desc" },
        select: { versao: true },
      });
      const nova = await tx.orcamento.create({
        data: {
          empresaId: auth.empresaId,
          eventoId: anterior.eventoId,
          numero: anterior.numero,
          versao: (ultima?.versao ?? anterior.versao) + 1,
          status: "RASCUNHO",
          validade: anterior.validade,
          subtotal: anterior.subtotal,
          desconto: anterior.desconto,
          total: anterior.total,
          observacoes: anterior.observacoes,
          itens: {
            create: anterior.itens.map((entry) => ({
              servicoId: entry.servicoId,
              descricao: entry.descricao,
              quantidade: entry.quantidade,
              unidade: entry.unidade,
              valorUnitario: entry.valorUnitario,
              desconto: entry.desconto,
              valorTotal: entry.valorTotal,
            })),
          },
        },
        include: { itens: true },
      });
      await tx.orcamento.update({ where: { id: anterior.id }, data: { status: "EM_NEGOCIACAO" } });
      return serialize(nova);
    });
  });

export const aprovarOrcamento = createServerFn({ method: "POST" })
  .inputValidator((value: unknown) => id.parse(value))
  .handler(async ({ data }) => {
    const auth = await requireAuth();
    return getPrisma().$transaction(async (tx) => {
      const found = await tx.orcamento.findFirst({
        where: {
          id: data.id,
          empresaId: auth.empresaId,
          ...(auth.role === "CLIENT" ? { evento: { cliente: { usuarioId: auth.usuarioId } } } : {}),
        },
        include: { evento: true, contratos: true },
      });
      if (
        !found ||
        !["ENVIADO", "VISUALIZADO", "AGUARDANDO_APROVACAO", "EM_NEGOCIACAO"].includes(found.status)
      )
        throw new Error("Orcamento nao pode ser aprovado.");
      if (found.contratos.length) throw new Error("Orcamento ja possui contrato.");
      const ultimo = await tx.contrato.findFirst({
        where: { empresaId: auth.empresaId },
        orderBy: { numero: "desc" },
        select: { numero: true },
      });
      await tx.orcamento.update({ where: { id: found.id }, data: { status: "APROVADO" } });
      const contrato = await tx.contrato.create({
        data: {
          empresaId: auth.empresaId,
          eventoId: found.eventoId,
          orcamentoId: found.id,
          numero: (ultimo?.numero ?? 0n) + 1n,
          valorTotal: found.total,
          conteudo: `Contrato referente ao orcamento ${found.numero.toString()}, versao ${found.versao}.`,
        },
      });
      await tx.evento.update({ where: { id: found.eventoId }, data: { status: "CONTRATO" } });
      await registrarAtividade(tx, auth, {
        tipo: "ORCAMENTO_APROVADO",
        descricao: `Orcamento ${found.numero.toString()} aprovado.`,
        entidadeTipo: "ORCAMENTO",
        entidadeId: found.id,
      });
      return serialize(contrato);
    });
  });
