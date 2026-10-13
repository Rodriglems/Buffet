import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { notificar, pagination, registrarAtividade, serialize } from "@/lib/domain.server";
import { getPrisma } from "@/lib/prisma.server";
import { requireAuth } from "@/lib/session.server";

const pagamento = z.object({
  contratoId: z.string().uuid(),
  numeroParcela: z.number().int().positive(),
  descricao: z.string().trim().max(300).nullable().optional(),
  valor: z.coerce.number().positive(),
  dataVencimento: z.coerce.date(),
  formaPagamento: z.string().trim().max(80).nullable().optional(),
  observacoes: z.string().trim().max(2000).nullable().optional(),
});
const id = z.object({ id: z.string().uuid() });

export const listarPagamentos = createServerFn({ method: "GET" })
  .inputValidator((value: unknown) =>
    z
      .object({
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().min(1).max(100).default(30),
      })
      .parse(value ?? {}),
  )
  .handler(async ({ data }) => {
    const auth = await requireAuth();
    const where = {
      empresaId: auth.empresaId,
      ...(auth.role === "CLIENT"
        ? { contrato: { evento: { cliente: { usuarioId: auth.usuarioId } } } }
        : {}),
    };
    const [items, total] = await getPrisma().$transaction([
      getPrisma().pagamento.findMany({
        where,
        ...pagination(data.page, data.pageSize),
        include: {
          contrato: { include: { evento: { include: { cliente: { select: { nome: true } } } } } },
        },
        orderBy: { dataVencimento: "asc" },
      }),
      getPrisma().pagamento.count({ where }),
    ]);
    return serialize({ items, total });
  });

export const criarPagamento = createServerFn({ method: "POST" })
  .inputValidator((value: unknown) => pagamento.parse(value))
  .handler(async ({ data }) => {
    const auth = await requireAuth("ADMIN");
    const contrato = await getPrisma().contrato.findFirst({
      where: { id: data.contratoId, empresaId: auth.empresaId },
    });
    if (!contrato || contrato.status === "CANCELADO") throw new Error("Contrato invalido.");
    return serialize(
      await getPrisma().pagamento.create({
        data: { ...data, valor: data.valor.toFixed(2), empresaId: auth.empresaId },
      }),
    );
  });

export const atualizarPagamento = createServerFn({ method: "POST" })
  .inputValidator((value: unknown) =>
    id.extend({ dados: pagamento.omit({ contratoId: true }).partial() }).parse(value),
  )
  .handler(async ({ data }) => {
    const auth = await requireAuth("ADMIN");
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

export const registrarPagamento = createServerFn({ method: "POST" })
  .inputValidator((value: unknown) =>
    id
      .extend({ dataPagamento: z.coerce.date(), formaPagamento: z.string().trim().min(2).max(80) })
      .parse(value),
  )
  .handler(async ({ data }) => {
    const auth = await requireAuth("ADMIN");
    return getPrisma().$transaction(async (tx) => {
      const found = await tx.pagamento.findFirst({
        where: { id: data.id, empresaId: auth.empresaId },
        include: { contrato: { include: { evento: { include: { cliente: true } } } } },
      });
      if (!found || found.status === "CANCELADO") throw new Error("Pagamento invalido.");
      const updated = await tx.pagamento.update({
        where: { id: found.id },
        data: {
          status: "PAGO",
          dataPagamento: data.dataPagamento,
          formaPagamento: data.formaPagamento,
        },
      });
      const usuarioId = found.contrato.evento.cliente.usuarioId;
      if (usuarioId)
        await notificar(tx, usuarioId, {
          tipo: "PAGAMENTO_CONFIRMADO",
          titulo: "Pagamento confirmado",
          mensagem: `A parcela ${found.numeroParcela} foi confirmada.`,
        });
      await registrarAtividade(tx, auth, {
        tipo: "PAGAMENTO_REGISTRADO",
        descricao: `Pagamento da parcela ${found.numeroParcela} registrado.`,
        entidadeTipo: "PAGAMENTO",
        entidadeId: found.id,
      });
      return serialize(updated);
    });
  });

export const excluirPagamento = createServerFn({ method: "POST" })
  .inputValidator((value: unknown) => id.parse(value))
  .handler(async ({ data }) => {
    const auth = await requireAuth("ADMIN");
    const found = await getPrisma().pagamento.findFirst({
      where: { id: data.id, empresaId: auth.empresaId },
    });
    if (!found || found.status !== "PENDENTE")
      throw new Error("Somente pagamentos pendentes podem ser excluidos.");
    await getPrisma().pagamento.delete({ where: { id: found.id } });
    return { ok: true };
  });

export const atualizarPagamentosAtrasados = createServerFn({ method: "POST" }).handler(async () => {
  const auth = await requireAuth("ADMIN");
  const result = await getPrisma().pagamento.updateMany({
    where: { empresaId: auth.empresaId, status: "PENDENTE", dataVencimento: { lt: new Date() } },
    data: { status: "ATRASADO" },
  });
  return { atualizados: result.count };
});
