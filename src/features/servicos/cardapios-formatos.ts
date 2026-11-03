import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { Prisma } from "@/generated/prisma/client";
import { serialize } from "@/lib/domain.server";
import { getPrisma } from "@/lib/prisma.server";
import { requirePermission } from "@/lib/session.server";

/**
 * Cardápios públicos (as abas do formulário de orçamento) e formatos de serviço (a pergunta
 * "Qual formato deseja servir?"). Cada formato indica quais cardápios o cliente vê primeiro.
 * Itens e formatos guardam o NOME do cardápio, então renomear e excluir atualizam os dois.
 */

const id = z.object({ id: z.string().uuid() });
const nomeCardapio = z.string().trim().min(2, "Informe o nome do cardápio.").max(80);
const nomeFormato = z.string().trim().min(2, "Informe o nome do formato.").max(100);
const ids = z.object({ ids: z.array(z.string().uuid()).min(1).max(200) });

export type CardapioPublico = { id: string; nome: string; ordem: number };
export type FormatoServico = { id: string; nome: string; ordem: number; cardapios: string[] };

export const listarCardapiosEFormatos = createServerFn({ method: "GET" }).handler(async () => {
  const auth = await requirePermission("servicos");
  const where = { empresaId: auth.empresaId };
  const orderBy = [{ ordem: "asc" as const }, { nome: "asc" as const }];
  const [cardapios, formatos] = await getPrisma().$transaction([
    getPrisma().cardapioPublico.findMany({
      where,
      orderBy,
      select: { id: true, nome: true, ordem: true },
    }),
    getPrisma().formatoServico.findMany({
      where,
      orderBy,
      select: { id: true, nome: true, ordem: true, cardapios: true },
    }),
  ]);
  return serialize({ cardapios, formatos });
});

/** Confere se todos os nomes são cardápios cadastrados da empresa. */
export async function validarCardapios(
  tx: Prisma.TransactionClient,
  empresaId: string,
  nomes: string[] | undefined,
) {
  if (!nomes?.length) return;
  const unicos = [...new Set(nomes)];
  const existentes = await tx.cardapioPublico.count({ where: { empresaId, nome: { in: unicos } } });
  if (existentes !== unicos.length) {
    throw new Error("Um ou mais cardápios não existem mais. Recarregue a página.");
  }
}

async function proximaOrdem(buscar: () => Promise<{ ordem: number } | null>): Promise<number> {
  return ((await buscar())?.ordem ?? -1) + 1;
}

export const criarCardapio = createServerFn({ method: "POST" })
  .validator((value: unknown) => z.object({ nome: nomeCardapio }).parse(value))
  .handler(async ({ data }) => {
    const auth = await requirePermission("servicos");
    return getPrisma().$transaction(async (tx) => {
      const existe = await tx.cardapioPublico.count({
        where: { empresaId: auth.empresaId, nome: { equals: data.nome, mode: "insensitive" } },
      });
      if (existe) throw new Error("Já existe um cardápio com esse nome.");
      const ordem = await proximaOrdem(() =>
        tx.cardapioPublico.findFirst({
          where: { empresaId: auth.empresaId },
          orderBy: { ordem: "desc" },
          select: { ordem: true },
        }),
      );
      return serialize(
        await tx.cardapioPublico.create({
          data: { empresaId: auth.empresaId, nome: data.nome, ordem },
        }),
      );
    });
  });

/** Renomeia o cardápio levando junto os itens e os formatos que o usam. */
export const renomearCardapio = createServerFn({ method: "POST" })
  .validator((value: unknown) => id.extend({ nome: nomeCardapio }).parse(value))
  .handler(async ({ data }) => {
    const auth = await requirePermission("servicos");
    return getPrisma().$transaction(async (tx) => {
      const cardapio = await tx.cardapioPublico.findFirst({
        where: { id: data.id, empresaId: auth.empresaId },
      });
      if (!cardapio) throw new Error("Cardápio não encontrado.");
      if (cardapio.nome === data.nome) return serialize(cardapio);
      const duplicado = await tx.cardapioPublico.count({
        where: {
          empresaId: auth.empresaId,
          id: { not: cardapio.id },
          nome: { equals: data.nome, mode: "insensitive" },
        },
      });
      if (duplicado) throw new Error("Já existe um cardápio com esse nome.");
      await tx.$executeRaw`
        UPDATE "servicos" SET "cardapios" = array_replace("cardapios", ${cardapio.nome}, ${data.nome})
        WHERE "empresa_id" = ${auth.empresaId}::uuid AND ${cardapio.nome} = ANY("cardapios")`;
      await tx.$executeRaw`
        UPDATE "formatos_servico" SET "cardapios" = array_replace("cardapios", ${cardapio.nome}, ${data.nome})
        WHERE "empresa_id" = ${auth.empresaId}::uuid AND ${cardapio.nome} = ANY("cardapios")`;
      return serialize(
        await tx.cardapioPublico.update({ where: { id: cardapio.id }, data: { nome: data.nome } }),
      );
    });
  });

/** Exclui o cardápio e o retira dos itens e formatos (os itens continuam no Cardápio). */
export const excluirCardapio = createServerFn({ method: "POST" })
  .validator((value: unknown) => id.parse(value))
  .handler(async ({ data }) => {
    const auth = await requirePermission("servicos");
    return getPrisma().$transaction(async (tx) => {
      const cardapio = await tx.cardapioPublico.findFirst({
        where: { id: data.id, empresaId: auth.empresaId },
      });
      if (!cardapio) throw new Error("Cardápio não encontrado.");
      await tx.$executeRaw`
        UPDATE "servicos" SET "cardapios" = array_remove("cardapios", ${cardapio.nome})
        WHERE "empresa_id" = ${auth.empresaId}::uuid AND ${cardapio.nome} = ANY("cardapios")`;
      await tx.$executeRaw`
        UPDATE "formatos_servico" SET "cardapios" = array_remove("cardapios", ${cardapio.nome})
        WHERE "empresa_id" = ${auth.empresaId}::uuid AND ${cardapio.nome} = ANY("cardapios")`;
      await tx.cardapioPublico.delete({ where: { id: cardapio.id } });
      return { ok: true };
    });
  });

export const reordenarCardapios = createServerFn({ method: "POST" })
  .validator((value: unknown) => ids.parse(value))
  .handler(async ({ data }) => {
    const auth = await requirePermission("servicos");
    const unicos = [...new Set(data.ids)];
    const encontrados = await getPrisma().cardapioPublico.count({
      where: { empresaId: auth.empresaId, id: { in: unicos } },
    });
    if (encontrados !== unicos.length)
      throw new Error("Um ou mais cardápios não foram encontrados.");
    await getPrisma().$transaction(
      unicos.map((cardapioId, ordem) =>
        getPrisma().cardapioPublico.update({ where: { id: cardapioId }, data: { ordem } }),
      ),
    );
    return { ok: true };
  });

/** Cria (sem id) ou atualiza um formato com os cardápios que ele abre no formulário. */
export const salvarFormato = createServerFn({ method: "POST" })
  .validator((value: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        nome: nomeFormato,
        cardapios: z.array(z.string().trim().min(1).max(80)).max(100).default([]),
      })
      .parse(value),
  )
  .handler(async ({ data }) => {
    const auth = await requirePermission("servicos");
    const cardapios = [...new Set(data.cardapios)];
    return getPrisma().$transaction(async (tx) => {
      await validarCardapios(tx, auth.empresaId, cardapios);
      const duplicado = await tx.formatoServico.count({
        where: {
          empresaId: auth.empresaId,
          ...(data.id ? { id: { not: data.id } } : {}),
          nome: { equals: data.nome, mode: "insensitive" },
        },
      });
      if (duplicado) throw new Error("Já existe um formato com esse nome.");
      if (data.id) {
        const atual = await tx.formatoServico.findFirst({
          where: { id: data.id, empresaId: auth.empresaId },
        });
        if (!atual) throw new Error("Formato não encontrado.");
        return serialize(
          await tx.formatoServico.update({
            where: { id: atual.id },
            data: { nome: data.nome, cardapios },
          }),
        );
      }
      const ordem = await proximaOrdem(() =>
        tx.formatoServico.findFirst({
          where: { empresaId: auth.empresaId },
          orderBy: { ordem: "desc" },
          select: { ordem: true },
        }),
      );
      return serialize(
        await tx.formatoServico.create({
          data: { empresaId: auth.empresaId, nome: data.nome, cardapios, ordem },
        }),
      );
    });
  });

/** Eventos já registrados guardam o nome do formato, então excluir não altera o histórico. */
export const excluirFormato = createServerFn({ method: "POST" })
  .validator((value: unknown) => id.parse(value))
  .handler(async ({ data }) => {
    const auth = await requirePermission("servicos");
    return getPrisma().$transaction(async (tx) => {
      const formato = await tx.formatoServico.findFirst({
        where: { id: data.id, empresaId: auth.empresaId },
      });
      if (!formato) throw new Error("Formato não encontrado.");
      const total = await tx.formatoServico.count({ where: { empresaId: auth.empresaId } });
      if (total <= 1) {
        throw new Error("O formulário precisa de pelo menos um formato. Cadastre outro antes.");
      }
      await tx.formatoServico.delete({ where: { id: formato.id } });
      return { ok: true };
    });
  });

export const reordenarFormatos = createServerFn({ method: "POST" })
  .validator((value: unknown) => ids.parse(value))
  .handler(async ({ data }) => {
    const auth = await requirePermission("servicos");
    const unicos = [...new Set(data.ids)];
    const encontrados = await getPrisma().formatoServico.count({
      where: { empresaId: auth.empresaId, id: { in: unicos } },
    });
    if (encontrados !== unicos.length)
      throw new Error("Um ou mais formatos não foram encontrados.");
    await getPrisma().$transaction(
      unicos.map((formatoId, ordem) =>
        getPrisma().formatoServico.update({ where: { id: formatoId }, data: { ordem } }),
      ),
    );
    return { ok: true };
  });
