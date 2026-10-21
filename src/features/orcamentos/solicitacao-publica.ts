import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { serialize } from "@/lib/domain.server";
import { getPrisma } from "@/lib/prisma.server";
import { requirePermission } from "@/lib/session.server";

const tokenSchema = z.object({ token: z.string().uuid() });

const solicitacaoSchema = tokenSchema.extend({
  nome: z.string().trim().min(2).max(160),
  email: z.string().trim().email().toLowerCase(),
  telefone: z
    .string()
    .transform((value) => value.replace(/\D/g, ""))
    .pipe(z.string().min(10).max(11)),
  whatsapp: z
    .string()
    .transform((value) => value.replace(/\D/g, ""))
    .pipe(z.string().min(10).max(11)),
  tipoEvento: z.string().trim().min(2).max(100),
  dataEvento: z.coerce.date(),
  quantidadeConvidados: z.coerce.number().int().positive().max(100000),
  localNome: z.string().trim().max(160).nullable().optional(),
  cidade: z.string().trim().max(120).nullable().optional(),
  observacoes: z.string().trim().max(4000).nullable().optional(),
  website: z.string().max(0).optional(),
});

export const obterFormularioOrcamento = createServerFn({ method: "GET" })
  .inputValidator((value: unknown) => tokenSchema.parse(value))
  .handler(async ({ data }) => {
    const empresa = await getPrisma().empresa.findUnique({
      where: { linkOrcamentoToken: data.token },
      select: { nomeFantasia: true, logoUrl: true, corTema: true },
    });
    if (!empresa) throw new Error("Link de orçamento inválido ou desativado.");
    return empresa;
  });

export const obterLinkFormularioOrcamento = createServerFn({ method: "GET" }).handler(async () => {
  const auth = await requirePermission("orcamentos");
  const empresa = await getPrisma().empresa.findUnique({
    where: { id: auth.empresaId },
    select: { linkOrcamentoToken: true },
  });
  if (!empresa) throw new Error("Empresa não encontrada.");
  return { token: empresa.linkOrcamentoToken };
});

export const enviarSolicitacaoOrcamento = createServerFn({ method: "POST" })
  .inputValidator((value: unknown) => solicitacaoSchema.parse(value))
  .handler(async ({ data }) => {
    if (data.website) throw new Error("Solicitação inválida.");
    const empresa = await getPrisma().empresa.findUnique({
      where: { linkOrcamentoToken: data.token },
      select: { id: true },
    });
    if (!empresa) throw new Error("Link de orçamento inválido ou desativado.");

    return getPrisma().$transaction(async (tx) => {
      const clienteExistente = await tx.cliente.findFirst({
        where: {
          empresaId: empresa.id,
          OR: [{ email: data.email }, { whatsapp: data.whatsapp }],
        },
        orderBy: { updatedAt: "desc" },
      });
      const cliente = clienteExistente
        ? await tx.cliente.update({
            where: { id: clienteExistente.id },
            data: {
              nome: data.nome,
              email: data.email,
              telefone: data.telefone,
              whatsapp: data.whatsapp,
            },
          })
        : await tx.cliente.create({
            data: {
              empresaId: empresa.id,
              nome: data.nome,
              tipoPessoa: "FISICA",
              email: data.email,
              telefone: data.telefone,
              whatsapp: data.whatsapp,
              observacoes: "Cadastro realizado pelo formulário público de orçamento.",
            },
          });

      const evento = await tx.evento.create({
        data: {
          empresaId: empresa.id,
          clienteId: cliente.id,
          nome: `${data.tipoEvento} — ${data.nome}`,
          tipo: data.tipoEvento,
          dataEvento: data.dataEvento,
          quantidadeConvidados: data.quantidadeConvidados,
          localNome: data.localNome,
          cidade: data.cidade,
          status: "PLANEJAMENTO",
          observacoes: data.observacoes,
        },
      });
      await tx.atividade.create({
        data: {
          empresaId: empresa.id,
          usuarioId: null,
          tipo: "SOLICITACAO_ORCAMENTO_RECEBIDA",
          descricao: `Nova solicitação de orçamento recebida de ${cliente.nome}.`,
          entidadeTipo: "EVENTO",
          entidadeId: evento.id,
        },
      });
      return serialize({ eventoId: evento.id });
    });
  });
