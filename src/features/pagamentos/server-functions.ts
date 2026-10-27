import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { Prisma } from "@/generated/prisma/client";
import { notificar, pagination, serialize } from "@/lib/domain.server";
import { getPrisma } from "@/lib/prisma.server";
import { requireAuth, requirePermission } from "@/lib/session.server";

const pagamento = z.object({
  eventoId: z.string().uuid(),
  numeroParcela: z.number().int().positive(),
  descricao: z.string().trim().max(300).nullable().optional(),
  valor: z.coerce.number().positive(),
  dataVencimento: z.coerce.date(),
  formaPagamento: z.string().trim().max(80).nullable().optional(),
  observacoes: z.string().trim().max(2000).nullable().optional(),
});
const id = z.object({ id: z.string().uuid() });

const STATUS_EVENTO_ENCERRADO = ["CANCELADO", "FINALIZADO"];
const STATUS_COM_PARCELAS = ["APROVADO", "PAGAMENTO"];

/**
 * Atualiza o status do evento conforme as parcelas: em aberto → Pagamento, quitado → Confirmado.
 * Um evento já confirmado não volta para Pagamento: a equipe pode confirmá-lo antes da quitação.
 */
async function sincronizarStatusEvento(tx: Prisma.TransactionClient, eventoId: string) {
  const evento = await tx.evento.findUnique({ where: { id: eventoId }, select: { status: true } });
  if (!evento || !["APROVADO", "PAGAMENTO"].includes(evento.status)) return;
  const [emAberto, pagas] = await Promise.all([
    tx.pagamento.count({ where: { eventoId, status: { in: ["PENDENTE", "ATRASADO"] } } }),
    tx.pagamento.count({ where: { eventoId, status: "PAGO" } }),
  ]);
  const status = emAberto ? "PAGAMENTO" : pagas ? "CONFIRMADO" : evento.status;
  if (status !== evento.status)
    await tx.evento.update({ where: { id: eventoId }, data: { status } });
}

/** Parcelas só podem ser lançadas depois da aprovação e antes da confirmação do evento. */
async function eventoDaEmpresa(tx: Prisma.TransactionClient, empresaId: string, eventoId: string) {
  const evento = await tx.evento.findFirst({ where: { id: eventoId, empresaId } });
  if (!evento || STATUS_EVENTO_ENCERRADO.includes(evento.status)) {
    throw new Error("Evento inválido para receber parcelas.");
  }
  if (!STATUS_COM_PARCELAS.includes(evento.status)) {
    throw new Error("Aprove o orçamento do evento antes de definir o pagamento.");
  }
  return evento;
}

export const listarPagamentos = createServerFn({ method: "GET" })
  .validator((value: unknown) =>
    z
      .object({
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().min(1).max(100).default(30),
        eventoId: z.string().uuid().optional(),
        clienteId: z.string().uuid().optional(),
      })
      .parse(value ?? {}),
  )
  .handler(async ({ data }) => {
    const auth = await requireAuth();
    const where = {
      empresaId: auth.empresaId,
      ...(data.eventoId ? { eventoId: data.eventoId } : {}),
      ...(data.clienteId ? { evento: { clienteId: data.clienteId } } : {}),
      ...(auth.role === "CLIENT" ? { evento: { cliente: { usuarioId: auth.usuarioId } } } : {}),
    };
    const [items, total] = await getPrisma().$transaction([
      getPrisma().pagamento.findMany({
        where,
        ...pagination(data.page, data.pageSize),
        include: { evento: { include: { cliente: { select: { nome: true } } } } },
        orderBy: [{ dataVencimento: "asc" }, { numeroParcela: "asc" }],
      }),
      getPrisma().pagamento.count({ where }),
    ]);
    return serialize({ items, total });
  });

export const criarPagamento = createServerFn({ method: "POST" })
  .validator((value: unknown) => pagamento.parse(value))
  .handler(async ({ data }) => {
    const auth = await requirePermission("pagamentos");
    return getPrisma().$transaction(async (tx) => {
      await eventoDaEmpresa(tx, auth.empresaId, data.eventoId);
      const criado = await tx.pagamento.create({
        data: { ...data, valor: data.valor.toFixed(2), empresaId: auth.empresaId },
      });
      await sincronizarStatusEvento(tx, data.eventoId);
      return serialize(criado);
    });
  });

const parcelasSchema = z.object({
  eventoId: z.string().uuid(),
  formaPagamento: z.string().trim().min(2, "Escolha a forma de pagamento.").max(80),
  parcelas: z
    .array(
      z.object({
        valor: z.coerce.number().positive(),
        dataVencimento: z.coerce.date(),
        descricao: z.string().trim().max(300).nullable().optional(),
      }),
    )
    .min(1)
    .max(60),
});

/** Cria várias parcelas de uma vez, continuando a numeração já existente do evento. */
export const criarParcelas = createServerFn({ method: "POST" })
  .validator((value: unknown) => parcelasSchema.parse(value))
  .handler(async ({ data }) => {
    const auth = await requirePermission("pagamentos");
    return getPrisma().$transaction(async (tx) => {
      await eventoDaEmpresa(tx, auth.empresaId, data.eventoId);
      const ultima = await tx.pagamento.findFirst({
        where: { eventoId: data.eventoId },
        orderBy: { numeroParcela: "desc" },
        select: { numeroParcela: true },
      });
      const inicio = ultima?.numeroParcela ?? 0;
      await tx.pagamento.createMany({
        data: data.parcelas.map((parcela, indice) => ({
          empresaId: auth.empresaId,
          eventoId: data.eventoId,
          numeroParcela: inicio + indice + 1,
          valor: parcela.valor.toFixed(2),
          dataVencimento: parcela.dataVencimento,
          descricao: parcela.descricao ?? null,
          formaPagamento: data.formaPagamento,
        })),
      });
      await sincronizarStatusEvento(tx, data.eventoId);
      return { criadas: data.parcelas.length };
    });
  });

export const atualizarPagamento = createServerFn({ method: "POST" })
  .validator((value: unknown) =>
    id.extend({ dados: pagamento.omit({ eventoId: true }).partial() }).parse(value),
  )
  .handler(async ({ data }) => {
    const auth = await requirePermission("pagamentos");
    const found = await getPrisma().pagamento.findFirst({
      where: { id: data.id, empresaId: auth.empresaId },
    });
    if (!found || found.status === "PAGO") throw new Error("Pagamento nao pode ser editado.");
    const dados = {
      ...data.dados,
      ...(data.dados.valor === undefined ? {} : { valor: data.dados.valor.toFixed(2) }),
    };
    return serialize(await getPrisma().pagamento.update({ where: { id: found.id }, data: dados }));
  });

/** Troca a forma de pagamento de uma parcela, inclusive de parcelas já recebidas. */
export const alterarFormaPagamento = createServerFn({ method: "POST" })
  .validator((value: unknown) =>
    id.extend({ formaPagamento: z.string().trim().min(2).max(80) }).parse(value),
  )
  .handler(async ({ data }) => {
    const auth = await requirePermission("pagamentos");
    const found = await getPrisma().pagamento.findFirst({
      where: { id: data.id, empresaId: auth.empresaId },
    });
    if (!found || found.status === "CANCELADO") throw new Error("Parcela não encontrada.");
    return serialize(
      await getPrisma().pagamento.update({
        where: { id: found.id },
        data: { formaPagamento: data.formaPagamento },
      }),
    );
  });

export const registrarPagamento = createServerFn({ method: "POST" })
  .validator((value: unknown) =>
    id
      .extend({
        dataPagamento: z.coerce.date(),
        // Sem informar, mantém a forma definida ao gerar as parcelas.
        formaPagamento: z.string().trim().min(2).max(80).optional(),
      })
      .parse(value),
  )
  .handler(async ({ data }) => {
    const auth = await requirePermission("pagamentos");
    return getPrisma().$transaction(async (tx) => {
      const found = await tx.pagamento.findFirst({
        where: { id: data.id, empresaId: auth.empresaId },
        include: { evento: { include: { cliente: true } } },
      });
      if (!found || found.status === "CANCELADO") throw new Error("Pagamento invalido.");
      const updated = await tx.pagamento.update({
        where: { id: found.id },
        data: {
          status: "PAGO",
          dataPagamento: data.dataPagamento,
          formaPagamento: data.formaPagamento ?? found.formaPagamento ?? "Não informada",
        },
      });
      await sincronizarStatusEvento(tx, found.eventoId);
      const usuarioId = found.evento.cliente.usuarioId;
      if (usuarioId)
        await notificar(tx, usuarioId, {
          tipo: "PAGAMENTO_CONFIRMADO",
          titulo: "Pagamento confirmado",
          mensagem: `A parcela ${found.numeroParcela} foi confirmada.`,
        });
      return serialize(updated);
    });
  });

export const excluirPagamento = createServerFn({ method: "POST" })
  .validator((value: unknown) => id.parse(value))
  .handler(async ({ data }) => {
    const auth = await requirePermission("pagamentos");
    return getPrisma().$transaction(async (tx) => {
      const found = await tx.pagamento.findFirst({
        where: { id: data.id, empresaId: auth.empresaId },
      });
      if (!found || found.status === "PAGO")
        throw new Error("Pagamentos já recebidos não podem ser excluídos.");
      await tx.pagamento.delete({ where: { id: found.id } });
      await sincronizarStatusEvento(tx, found.eventoId);
      return { ok: true };
    });
  });

export const atualizarPagamentosAtrasados = createServerFn({ method: "POST" }).handler(async () => {
  const auth = await requirePermission("pagamentos");
  const result = await getPrisma().pagamento.updateMany({
    where: { empresaId: auth.empresaId, status: "PENDENTE", dataVencimento: { lt: new Date() } },
    data: { status: "ATRASADO" },
  });
  return { atualizados: result.count };
});
