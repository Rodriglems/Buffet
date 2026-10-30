import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { valoresParaCliente } from "@/features/orcamentos/valores-cliente";
import { pagination, serialize } from "@/lib/domain.server";
import { getPrisma } from "@/lib/prisma.server";
import { STATUS_EVENTO } from "@/lib/status-evento";
import { requireAuth, requirePermission } from "@/lib/session.server";

const eventoBase = z.object({
  clienteId: z.string().uuid(),
  nome: z.string().trim().min(2).max(180),
  tipo: z.string().trim().min(2).max(100),
  formatoServico: z.string().trim().min(2).max(100).nullable().optional(),
  servicosAdicionais: z.array(z.string().trim().min(2).max(160)).max(10).default([]),
  dataEvento: z.coerce.date(),
  horaInicio: z.coerce.date().nullable().optional(),
  horaFim: z.coerce.date().nullable().optional(),
  quantidadeConvidados: z.number().int().positive(),
  localNome: z.string().trim().max(160).nullable().optional(),
  cep: z
    .string()
    .regex(/^\d{8}$/)
    .nullable()
    .optional(),
  estado: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .nullable()
    .optional(),
  cidade: z.string().trim().max(120).nullable().optional(),
  bairro: z.string().trim().max(120).nullable().optional(),
  logradouro: z.string().trim().max(200).nullable().optional(),
  numero: z.string().trim().max(30).nullable().optional(),
  complemento: z.string().trim().max(120).nullable().optional(),
  status: z.enum(STATUS_EVENTO).default("ORCAMENTO"),
  observacoes: z.string().trim().max(4000).nullable().optional(),
});
const id = z.object({ id: z.string().uuid() });

export const listarEventos = createServerFn({ method: "GET" })
  .validator((value: unknown) =>
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
      ...(auth.role === "CLIENT" ? { cliente: { usuarioId: auth.usuarioId } } : {}),
    };
    const [items, total] = await getPrisma().$transaction([
      getPrisma().evento.findMany({
        where,
        ...pagination(data.page, data.pageSize),
        include: {
          cliente: { select: { nome: true, whatsapp: true, telefone: true, email: true } },
          orcamentos: {
            select: {
              id: true,
              numero: true,
              versao: true,
              status: true,
              total: true,
              enviadoEm: true,
            },
            orderBy: [{ numero: "desc" }, { versao: "desc" }],
            take: 1,
          },
        },
        orderBy: { dataEvento: "asc" },
      }),
      getPrisma().evento.count({ where }),
    ]);
    const lista = serialize({ items, total });
    return {
      ...lista,
      items: lista.items.map((evento) => ({
        ...evento,
        orcamentos: evento.orcamentos.map((entry) => valoresParaCliente(auth, entry)),
      })),
    };
  });

export const obterEvento = createServerFn({ method: "GET" })
  .validator((value: unknown) => id.parse(value))
  .handler(async ({ data }) => {
    const auth = await requireAuth();
    const result = await getPrisma().evento.findFirst({
      where: {
        id: data.id,
        empresaId: auth.empresaId,
        ...(auth.role === "CLIENT" ? { cliente: { usuarioId: auth.usuarioId } } : {}),
      },
      include: {
        cliente: true,
        orcamentos: {
          include: { itens: true },
          orderBy: [{ numero: "desc" }, { versao: "desc" }, { createdAt: "desc" }],
        },
        pagamentos: { orderBy: [{ dataVencimento: "asc" }, { numeroParcela: "asc" }] },
        custos: true,
        documentos: true,
      },
    });
    if (!result) throw new Error("Evento nao encontrado.");
    const evento = serialize(result);
    if (auth.role !== "CLIENT") return evento;
    // Custos são internos do buffet; valores do orçamento só depois do envio.
    return {
      ...evento,
      custos: [],
      orcamentos: evento.orcamentos.map((entry) => valoresParaCliente(auth, entry)),
    };
  });

// Eventos nascem só pelo formulário público de orçamento (solicitacao-publica.ts).

export const atualizarEvento = createServerFn({ method: "POST" })
  .validator((value: unknown) => id.extend({ dados: eventoBase.partial() }).parse(value))
  .handler(async ({ data }) => {
    const auth = await requirePermission("eventos");
    const found = await getPrisma().evento.findFirst({
      where: { id: data.id, empresaId: auth.empresaId },
    });
    if (!found) throw new Error("Evento nao encontrado.");
    if (data.dados.clienteId) {
      const cliente = await getPrisma().cliente.findFirst({
        where: { id: data.dados.clienteId, empresaId: auth.empresaId },
      });
      if (!cliente) throw new Error("Cliente invalido.");
    }
    return serialize(
      await getPrisma().evento.update({ where: { id: found.id }, data: data.dados }),
    );
  });

// As etapas só avançam a partir da etapa anterior esperada (o filtro de status garante isso).

/** Pagamento → Confirmado (libera o PDF do evento). */
export const confirmarEvento = createServerFn({ method: "POST" })
  .validator((value: unknown) => id.parse(value))
  .handler(async ({ data }) => {
    const auth = await requirePermission("eventos");
    const resultado = await getPrisma().evento.updateMany({
      where: { id: data.id, empresaId: auth.empresaId, status: "PAGAMENTO" },
      data: { status: "CONFIRMADO" },
    });
    if (!resultado.count) throw new Error("Defina o pagamento do evento antes de confirmá-lo.");
    return { ok: true };
  });

/** Confirmado → Finalizado (depois que o evento acontece). */
export const finalizarEvento = createServerFn({ method: "POST" })
  .validator((value: unknown) => id.parse(value))
  .handler(async ({ data }) => {
    const auth = await requirePermission("eventos");
    const resultado = await getPrisma().evento.updateMany({
      where: { id: data.id, empresaId: auth.empresaId, status: "CONFIRMADO" },
      data: { status: "FINALIZADO" },
    });
    if (!resultado.count) throw new Error("Só é possível finalizar um evento confirmado.");
    return { ok: true };
  });

export const excluirEvento = createServerFn({ method: "POST" })
  .validator((value: unknown) => id.parse(value))
  .handler(async ({ data }) => {
    const auth = await requirePermission("eventos");
    const found = await getPrisma().evento.findFirst({
      where: { id: data.id, empresaId: auth.empresaId },
      include: { _count: { select: { orcamentos: true, pagamentos: true, custos: true } } },
    });
    if (!found) throw new Error("Evento nao encontrado.");
    if (found._count.orcamentos || found._count.pagamentos || found._count.custos)
      throw new Error("Evento possui historico e nao pode ser excluido.");
    await getPrisma().evento.delete({ where: { id: found.id } });
    return { ok: true };
  });
