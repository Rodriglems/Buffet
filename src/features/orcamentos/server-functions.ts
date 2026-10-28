import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { calcularDescontoOrcamento } from "@/features/orcamentos/calculos";
import { valoresParaCliente } from "@/features/orcamentos/valores-cliente";
import { notificar, pagination, serialize } from "@/lib/domain.server";
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
  tipoDesconto: z.enum(["VALOR_FIXO", "PERCENTUAL"]).default("VALOR_FIXO"),
  desconto: z.coerce.number().nonnegative().default(0),
  observacoes: z.string().trim().max(5000).nullable().optional(),
  itens: z.array(item).min(1).max(200),
});
const id = z.object({ id: z.string().uuid() });
const money = (value: number) => value.toFixed(2);

export const listarOrcamentos = createServerFn({ method: "GET" })
  .validator((value: unknown) =>
    z
      .object({
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
        clienteId: z.string().uuid().optional(),
      })
      .parse(value ?? {}),
  )
  .handler(async ({ data }) => {
    const auth = await requireAuth();
    const where = {
      empresaId: auth.empresaId,
      ...(data.clienteId ? { evento: { clienteId: data.clienteId } } : {}),
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
    const lista = serialize({ items, total });
    return { ...lista, items: lista.items.map((entry) => valoresParaCliente(auth, entry)) };
  });

export const obterOrcamento = createServerFn({ method: "GET" })
  .validator((value: unknown) => id.parse(value))
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
      },
    });
    if (!result) throw new Error("Orcamento nao encontrado.");
    if (auth.role === "CLIENT" && result.status === "ENVIADO") {
      await getPrisma().orcamento.update({
        where: { id: result.id },
        data: { status: "VISUALIZADO" },
      });
    }
    return valoresParaCliente(auth, serialize(result));
  });

export const criarOrcamento = createServerFn({ method: "POST" })
  .validator((value: unknown) => orcamento.parse(value))
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
      const valores = calcularDescontoOrcamento(subtotal, data.tipoDesconto, data.desconto);
      const created = await tx.orcamento.create({
        data: {
          empresaId: auth.empresaId,
          eventoId: data.eventoId,
          numero: (ultimo?.numero ?? 0n) + 1n,
          validade: data.validade,
          subtotal: money(valores.subtotal),
          tipoDesconto: data.tipoDesconto,
          descontoValor: money(data.desconto),
          desconto: money(valores.desconto),
          total: money(valores.total),
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
      return serialize(created);
    });
  });

export const excluirOrcamento = createServerFn({ method: "POST" })
  .validator((value: unknown) => id.parse(value))
  .handler(async ({ data }) => {
    const auth = await requirePermission("orcamentos");
    const found = await getPrisma().orcamento.findFirst({
      where: { id: data.id, empresaId: auth.empresaId },
    });
    if (!found) throw new Error("Orcamento nao encontrado.");
    if (found.status !== "RASCUNHO") throw new Error("Somente rascunhos podem ser excluidos.");
    await getPrisma().orcamento.delete({ where: { id: found.id } });
    return { ok: true };
  });

export const atualizarDescontoOrcamento = createServerFn({ method: "POST" })
  .validator((value: unknown) =>
    id
      .extend({
        tipoDesconto: z.enum(["VALOR_FIXO", "PERCENTUAL"]),
        desconto: z.coerce.number().nonnegative(),
      })
      .parse(value),
  )
  .handler(async ({ data }) => {
    const auth = await requirePermission("orcamentos");
    return getPrisma().$transaction(async (tx) => {
      const found = await tx.orcamento.findFirst({
        where: { id: data.id, empresaId: auth.empresaId },
      });
      if (!found) throw new Error("Orçamento não encontrado.");
      // O desconto continua liberado após a aprovação: o administrador negocia pelo evento.
      if (["REJEITADO", "EXPIRADO", "CANCELADO"].includes(found.status)) {
        throw new Error("O desconto não pode ser alterado neste orçamento.");
      }

      const valores = calcularDescontoOrcamento(
        Number(found.subtotal),
        data.tipoDesconto,
        data.desconto,
      );
      const atualizado = await tx.orcamento.update({
        where: { id: found.id },
        data: {
          tipoDesconto: data.tipoDesconto,
          descontoValor: money(data.desconto),
          desconto: money(valores.desconto),
          total: money(valores.total),
        },
      });
      return serialize(atualizado);
    });
  });

/** Substitui os itens do orçamento (remover, adicionar ou alterar) e recalcula os totais. */
export const atualizarItensOrcamento = createServerFn({ method: "POST" })
  .validator((value: unknown) => id.extend({ itens: z.array(item).min(1).max(200) }).parse(value))
  .handler(async ({ data }) => {
    const auth = await requirePermission("orcamentos");
    return getPrisma().$transaction(async (tx) => {
      const found = await tx.orcamento.findFirst({
        where: { id: data.id, empresaId: auth.empresaId },
      });
      if (!found) throw new Error("Orçamento não encontrado.");
      if (["REJEITADO", "EXPIRADO", "CANCELADO"].includes(found.status)) {
        throw new Error("Este orçamento não pode mais ser editado.");
      }
      const servicoIds = data.itens.flatMap((entry) => (entry.servicoId ? [entry.servicoId] : []));
      const validos = await tx.servico.count({
        where: { empresaId: auth.empresaId, id: { in: servicoIds } },
      });
      if (validos !== new Set(servicoIds).size) {
        throw new Error("Um ou mais itens do cardápio são inválidos.");
      }

      const subtotal = data.itens.reduce(
        (sum, entry) => sum + entry.quantidade * entry.valorUnitario - entry.desconto,
        0,
      );
      // Mantém o desconto combinado; se ficar maior que o novo subtotal, o cálculo recusa.
      const valores = calcularDescontoOrcamento(
        subtotal,
        found.tipoDesconto,
        Number(found.descontoValor),
      );
      await tx.orcamentoItem.deleteMany({ where: { orcamentoId: found.id } });
      const atualizado = await tx.orcamento.update({
        where: { id: found.id },
        data: {
          subtotal: money(valores.subtotal),
          desconto: money(valores.desconto),
          total: money(valores.total),
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
      });
      return serialize(atualizado);
    });
  });

export const enviarOrcamento = createServerFn({ method: "POST" })
  .validator((value: unknown) =>
    id.extend({ mensagem: z.string().trim().max(2000).nullable().optional() }).parse(value),
  )
  .handler(async ({ data }) => {
    const auth = await requirePermission("orcamentos");
    return getPrisma().$transaction(async (tx) => {
      const found = await tx.orcamento.findFirst({
        where: { id: data.id, empresaId: auth.empresaId },
        include: { evento: { include: { cliente: true } } },
      });
      // Aprovados podem ser reenviados (ex.: após uma edição); só os encerrados não.
      if (!found || ["REJEITADO", "EXPIRADO", "CANCELADO"].includes(found.status))
        throw new Error("Este orçamento não pode ser enviado.");
      // A partir do primeiro envio o cliente passa a ver os valores, inclusive edições futuras.
      await tx.orcamento.update({
        where: { id: found.id },
        data: {
          enviadoEm: found.enviadoEm ?? new Date(),
          ...(["RASCUNHO", "EM_NEGOCIACAO"].includes(found.status) ? { status: "ENVIADO" } : {}),
        },
      });
      if (found.evento.cliente.usuarioId) {
        await notificar(tx, found.evento.cliente.usuarioId, {
          tipo: "ORCAMENTO_ENVIADO",
          titulo: "Novo orcamento",
          mensagem:
            data.mensagem || `O orçamento ${found.numero.toString()} está disponível para análise.`,
        });
      }
      return {
        ok: true,
        cliente: found.evento.cliente.nome,
        whatsapp: found.evento.cliente.whatsapp,
      };
    });
  });

export const criarVersaoOrcamento = createServerFn({ method: "POST" })
  .validator((value: unknown) => id.parse(value))
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
          tipoDesconto: anterior.tipoDesconto,
          descontoValor: anterior.descontoValor,
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
  .validator((value: unknown) => id.parse(value))
  .handler(async ({ data }) => {
    const auth = await requireAuth();
    return getPrisma().$transaction(async (tx) => {
      const found = await tx.orcamento.findFirst({
        where: {
          id: data.id,
          empresaId: auth.empresaId,
          ...(auth.role === "CLIENT" ? { evento: { cliente: { usuarioId: auth.usuarioId } } } : {}),
        },
        include: { evento: { select: { status: true } } },
      });
      // Aprovar é a primeira etapa: só vale enquanto o evento ainda está em "Orçamento".
      if (found && found.evento.status !== "ORCAMENTO") {
        throw new Error("Este evento já passou da etapa de aprovação.");
      }
      if (found && auth.role === "CLIENT" && !found.enviadoEm) {
        throw new Error("Seu orçamento ainda está sendo preparado pela nossa equipe.");
      }
      // A equipe pode aprovar direto do rascunho (pedidos do formulário público nascem assim).
      const aprovaveis = ["ENVIADO", "VISUALIZADO", "AGUARDANDO_APROVACAO", "EM_NEGOCIACAO"];
      if (auth.role === "ADMIN") aprovaveis.push("RASCUNHO");
      if (!found || !aprovaveis.includes(found.status))
        throw new Error("Orcamento nao pode ser aprovado.");
      const aprovado = await tx.orcamento.update({
        where: { id: found.id },
        data: { status: "APROVADO" },
      });
      await tx.evento.update({ where: { id: found.eventoId }, data: { status: "APROVADO" } });
      return serialize(aprovado);
    });
  });
