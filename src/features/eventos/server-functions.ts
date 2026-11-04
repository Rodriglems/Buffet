import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { buscarClientesParecidos } from "@/features/clientes/duplicados.server";
import { problemaNoContrato, saldoDoContrato } from "@/features/eventos/contrato";
import { valoresParaCliente } from "@/features/orcamentos/valores-cliente";
import { hojeIso } from "@/features/pagamentos/a-receber";
import { isValidIsoDate } from "@/features/shared/validation/primitives";
import { statusAcessoCliente } from "@/lib/acesso-cliente";
import { serialize } from "@/lib/domain.server";
import { hasPermission, type PermissionKey } from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma.server";
import { STATUS_EVENTO } from "@/lib/status-evento";
import { requireAuth, requirePermission } from "@/lib/session.server";
import { digitosDoTelefone } from "@/lib/telefone";

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
        // Telas do painel carregam a lista inteira: contratos futuros não podem ficar de fora.
        pageSize: z.number().int().min(1).max(2000).default(20),
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
        skip: (data.page - 1) * data.pageSize,
        take: data.pageSize,
        include: {
          cliente: {
            select: {
              nome: true,
              whatsapp: true,
              telefone: true,
              email: true,
              usuario: { select: { ultimoLogin: true, ativo: true } },
            },
          },
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
      items: lista.items.map(({ cliente: { usuario, ...cliente }, ...evento }) => ({
        ...evento,
        cliente: { ...cliente, acesso: statusAcessoCliente({ usuario }) },
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
        cliente: { include: { usuario: { select: { ultimoLogin: true, ativo: true } } } },
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
    const {
      cliente: { usuario, ...cliente },
      ...resto
    } = serialize(result);
    const evento = { ...resto, cliente: { ...cliente, acesso: statusAcessoCliente({ usuario }) } };
    if (auth.role !== "CLIENT") return evento;
    // Custos são internos do buffet; valores do orçamento só depois do envio.
    return {
      ...evento,
      custos: [],
      orcamentos: evento.orcamentos.map((entry) => valoresParaCliente(auth, entry)),
    };
  });

const dataIso = z.string().refine(isValidIsoDate, "Data inválida.");
const horario = z
  .string()
  .regex(/^\d{2}:\d{2}$/, "Horário inválido.")
  .nullable()
  .optional();

const novoEventoSchema = z.object({
  cliente: z.union([
    z.object({ id: z.string().uuid() }),
    z.object({
      novo: z.object({
        nome: z.string().trim().min(2, "Informe o nome do cliente.").max(160),
        telefone: z
          .string()
          .transform(digitosDoTelefone)
          .refine(
            (valor) => /^\d{10,11}$/.test(valor),
            "Telefone deve ter DDD e 10 ou 11 dígitos.",
          ),
        email: z.preprocess(
          (valor) => (typeof valor === "string" && valor.trim() === "" ? null : valor),
          z.string().trim().toLowerCase().email("E-mail inválido.").nullable().optional(),
        ),
      }),
      ignorarParecidos: z.boolean().default(false),
    }),
  ]),
  tipo: z.string().trim().min(2, "Selecione o tipo do evento.").max(100),
  formatoServico: z.string().trim().min(2).max(100).nullable().optional(),
  dataEvento: dataIso,
  horaInicio: horario,
  horaFim: horario,
  quantidadeConvidados: z
    .number()
    .int()
    .positive("Informe a quantidade de convidados.")
    .max(100000),
  localNome: z.string().trim().max(160).nullable().optional(),
  cidade: z.string().trim().max(120).nullable().optional(),
  observacoes: z.string().trim().max(4000).nullable().optional(),
  // Sem contrato, o evento nasce como orçamento e a equipe monta a proposta em seguida.
  contrato: z
    .object({
      valorTotal: z.number().nonnegative().max(999999999999),
      valorPago: z.number().nonnegative().max(999999999999).default(0),
      pagoEm: dataIso.nullable().optional(),
      vencimentoSaldo: dataIso.nullable().optional(),
      formaPagamento: z.string().trim().min(2).max(80).nullable().optional(),
    })
    .nullable()
    .default(null),
});

function lerNovoEvento(value: unknown) {
  const result = novoEventoSchema.safeParse(value);
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Dados do evento inválidos.");
  }
  const { horaInicio, horaFim } = result.data;
  if (horaInicio && horaFim && horaFim <= horaInicio) {
    throw new Error("O horário final deve ser posterior ao horário inicial.");
  }
  return result.data;
}

const paraData = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const paraHora = (hora: string | null | undefined) =>
  hora ? new Date(`1970-01-01T${hora}:00.000Z`) : null;

/** O que a tela de novo evento precisa: formatos e o que este usuário pode fazer nela. */
export const obterOpcoesNovoEvento = createServerFn({ method: "GET" }).handler(async () => {
  const auth = await requirePermission("eventos");
  const formatos = await getPrisma().formatoServico.findMany({
    where: { empresaId: auth.empresaId },
    select: { nome: true },
    orderBy: [{ ordem: "asc" }, { nome: "asc" }],
  });
  const pode = (chave: PermissionKey) => hasPermission(auth.permissoes, chave);
  return {
    formatos: formatos.map((formato) => formato.nome),
    podeCriarCliente: pode("contatos"),
    podeCriarOrcamento: pode("orcamentos"),
    podeLancarContrato: pode("orcamentos") && pode("pagamentos"),
  };
});

/**
 * Evento lançado pela equipe, com cliente existente ou cadastro rápido (nome e telefone).
 * Contrato já fechado nasce Confirmado, com o valor total em um item único e os pagamentos.
 */
export const criarEventoManual = createServerFn({ method: "POST" })
  .validator((value: unknown) => lerNovoEvento(value))
  .handler(async ({ data }) => {
    const auth = await requirePermission("eventos");
    const pode = (chave: PermissionKey) => hasPermission(auth.permissoes, chave);
    if ("novo" in data.cliente && !pode("contatos")) {
      throw new Error("Você não tem permissão para cadastrar clientes.");
    }
    const { contrato } = data;
    if (contrato) {
      if (!pode("orcamentos") || !pode("pagamentos")) {
        throw new Error("Você não tem permissão para lançar contratos.");
      }
      const problema = problemaNoContrato(contrato, hojeIso());
      if (problema) throw new Error(problema);
    }

    return getPrisma().$transaction(async (tx) => {
      let cliente: { id: string; nome: string };
      if ("novo" in data.cliente) {
        const { novo, ignorarParecidos } = data.cliente;
        if (!ignorarParecidos) {
          const [parecido] = await buscarClientesParecidos(tx, auth.empresaId, {
            nome: novo.nome,
            telefone: novo.telefone,
            email: novo.email,
          });
          if (parecido) {
            throw new Error(`Já existe um cliente com este ${parecido.motivo}: ${parecido.nome}.`);
          }
        }
        cliente = await tx.cliente.create({
          data: {
            empresaId: auth.empresaId,
            nome: novo.nome,
            tipoPessoa: "FISICA",
            telefone: novo.telefone,
            whatsapp: novo.telefone,
            email: novo.email ?? null,
          },
          select: { id: true, nome: true },
        });
      } else {
        const existente = await tx.cliente.findFirst({
          where: { id: data.cliente.id, empresaId: auth.empresaId },
          select: { id: true, nome: true },
        });
        if (!existente) throw new Error("Cliente não encontrado.");
        cliente = existente;
      }

      const evento = await tx.evento.create({
        data: {
          empresaId: auth.empresaId,
          clienteId: cliente.id,
          nome: cliente.nome,
          tipo: data.tipo,
          formatoServico: data.formatoServico ?? null,
          dataEvento: paraData(data.dataEvento),
          horaInicio: paraHora(data.horaInicio),
          horaFim: paraHora(data.horaFim),
          quantidadeConvidados: data.quantidadeConvidados,
          localNome: data.localNome ?? null,
          cidade: data.cidade ?? null,
          observacoes: data.observacoes ?? null,
          status: contrato ? "CONFIRMADO" : "ORCAMENTO",
        },
        select: { id: true },
      });

      if (contrato) {
        const ultimo = await tx.orcamento.findFirst({
          where: { empresaId: auth.empresaId },
          orderBy: { numero: "desc" },
          select: { numero: true },
        });
        const total = contrato.valorTotal.toFixed(2);
        await tx.orcamento.create({
          data: {
            empresaId: auth.empresaId,
            eventoId: evento.id,
            numero: (ultimo?.numero ?? 0n) + 1n,
            status: "APROVADO",
            // O cliente já combinou este valor: o portal mostra sem esperar um envio.
            enviadoEm: new Date(),
            subtotal: total,
            total,
            observacoes: "Contrato fechado fora do sistema. Os itens podem ser detalhados depois.",
            itens: {
              create: {
                descricao: "Valor total do contrato",
                quantidade: "1",
                unidade: "contrato",
                valorUnitario: total,
                valorTotal: total,
              },
            },
          },
        });

        const saldo = saldoDoContrato(contrato);
        const parcelas = [
          ...(contrato.valorPago > 0 && contrato.pagoEm
            ? [
                {
                  descricao: "Valor já recebido",
                  valor: contrato.valorPago.toFixed(2),
                  dataVencimento: paraData(contrato.pagoEm),
                  dataPagamento: paraData(contrato.pagoEm),
                  status: "PAGO" as const,
                  formaPagamento: contrato.formaPagamento ?? "Não informada",
                },
              ]
            : []),
          ...(saldo > 0 && contrato.vencimentoSaldo
            ? [
                {
                  descricao: "Saldo do contrato",
                  valor: saldo.toFixed(2),
                  dataVencimento: paraData(contrato.vencimentoSaldo),
                  dataPagamento: null,
                  status: "PENDENTE" as const,
                  formaPagamento: null,
                },
              ]
            : []),
        ];
        await tx.pagamento.createMany({
          data: parcelas.map((parcela, indice) => ({
            ...parcela,
            empresaId: auth.empresaId,
            eventoId: evento.id,
            numeroParcela: indice + 1,
          })),
        });
      }

      return { eventoId: evento.id, clienteId: cliente.id, clienteNome: cliente.nome };
    });
  });

// Eventos também nascem pelo formulário público de orçamento (solicitacao-publica.ts).

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
