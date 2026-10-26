import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { Prisma } from "@/generated/prisma/client";
import { serialize } from "@/lib/domain.server";
import { CARDAPIOS, TIPOS_EVENTO, type Cardapio, type TipoEvento } from "@/lib/catalogo";
import { getPrisma } from "@/lib/prisma.server";
import { requirePermission } from "@/lib/session.server";
import { ehUrlDoArmazenamento, removerImagem } from "@/lib/storage.server";

const servico = z.object({
  nome: z.string().trim().min(2).max(160),
  categoria: z.string().trim().min(1).max(80),
  tiposEvento: z.array(z.enum(TIPOS_EVENTO)).max(TIPOS_EVENTO.length).default([]),
  cardapios: z.array(z.enum(CARDAPIOS)).max(CARDAPIOS.length).default([]),
  descricao: z.string().trim().max(2000).nullable().optional(),
  // URL do R2; imagens antigas em base64 só são aceitas se não forem alteradas.
  imagemUrl: z.string().max(1_500_000).nullable().optional(),
  unidade: z.string().trim().min(1).max(30),
  precoBase: z.coerce.number().nonnegative().max(999999999999),
  precoVisivel: z.boolean().default(true),
  ordem: z.coerce.number().int().min(0).max(100000).default(0),
  sugestaoChef: z.boolean().default(false),
  ativo: z.boolean().default(true),
  opcoesRotulo: z.string().trim().max(60).nullable().optional(),
  opcoesIds: z.array(z.string().uuid()).max(100).optional(),
});
const id = z.object({ id: z.string().uuid() });
const nomeCategoria = z.string().trim().min(2, "Informe o nome da categoria.").max(80);

function validarImagem(imagemUrl: string | null | undefined, atual: string | null = null) {
  if (!imagemUrl || imagemUrl === atual || ehUrlDoArmazenamento(imagemUrl)) return;
  throw new Error("Envie a imagem novamente para salvar o item.");
}

async function validarCategoria(tx: Prisma.TransactionClient, empresaId: string, nome?: string) {
  if (nome === undefined) return;
  const existe = await tx.categoriaCardapio.count({ where: { empresaId, nome } });
  if (!existe) throw new Error("Categoria não encontrada. Cadastre-a antes de usar.");
}

/** Substitui as opções do item (ex.: recheios de uma massa), aceitando só itens da empresa. */
async function salvarOpcoes(
  tx: Prisma.TransactionClient,
  empresaId: string,
  servicoId: string,
  opcoesIds: string[] | undefined,
) {
  if (opcoesIds === undefined) return;
  const ids = [...new Set(opcoesIds)].filter((opcaoId) => opcaoId !== servicoId);
  const validos = await tx.servico.count({ where: { empresaId, id: { in: ids } } });
  if (validos !== ids.length) throw new Error("Uma ou mais opções são inválidas.");
  await tx.servicoOpcao.deleteMany({ where: { servicoId } });
  if (ids.length) {
    await tx.servicoOpcao.createMany({ data: ids.map((opcaoId) => ({ servicoId, opcaoId })) });
  }
}

export const listarServicos = createServerFn({ method: "GET" })
  .validator((value: unknown) =>
    z
      .object({
        page: z.number().int().positive().default(1),
        // O painel carrega o cardápio inteiro de uma vez (hoje ~460 itens).
        pageSize: z.number().int().min(1).max(2000).default(50),
        apenasAtivos: z.boolean().default(false),
      })
      .parse(value ?? {}),
  )
  .handler(async ({ data }) => {
    const auth = await requirePermission("servicos");
    const where = { empresaId: auth.empresaId, ...(data.apenasAtivos ? { ativo: true } : {}) };
    const [items, total] = await getPrisma().$transaction([
      getPrisma().servico.findMany({
        where,
        // Sem o helper pagination(), que limita a 100 itens e cortava o cardápio na tela.
        skip: (data.page - 1) * data.pageSize,
        take: data.pageSize,
        include: { opcoes: { select: { opcaoId: true } } },
        orderBy: [{ sugestaoChef: "asc" }, { ordem: "asc" }, { nome: "asc" }],
      }),
      getPrisma().servico.count({ where }),
    ]);
    return serialize({ items, total });
  });

export const criarServico = createServerFn({ method: "POST" })
  .validator((value: unknown) => servico.parse(value))
  .handler(async ({ data }) => {
    const auth = await requirePermission("servicos");
    validarImagem(data.imagemUrl);
    const { opcoesIds, ...dados } = data;
    return getPrisma().$transaction(async (tx) => {
      await validarCategoria(tx, auth.empresaId, dados.categoria);
      const criado = await tx.servico.create({ data: { ...dados, empresaId: auth.empresaId } });
      await salvarOpcoes(tx, auth.empresaId, criado.id, opcoesIds);
      return serialize(criado);
    });
  });

export const atualizarServico = createServerFn({ method: "POST" })
  .validator((value: unknown) => id.extend({ dados: servico.partial() }).parse(value))
  .handler(async ({ data }) => {
    const auth = await requirePermission("servicos");
    const found = await getPrisma().servico.findFirst({
      where: { id: data.id, empresaId: auth.empresaId },
    });
    if (!found) throw new Error("Servico nao encontrado.");
    validarImagem(data.dados.imagemUrl, found.imagemUrl);
    const { opcoesIds, ...dados } = data.dados;
    const atualizado = await getPrisma().$transaction(async (tx) => {
      if (dados.categoria !== found.categoria) {
        await validarCategoria(tx, auth.empresaId, dados.categoria);
      }
      const salvo = await tx.servico.update({ where: { id: found.id }, data: dados });
      await salvarOpcoes(tx, auth.empresaId, found.id, opcoesIds);
      return salvo;
    });
    if (data.dados.imagemUrl !== undefined && data.dados.imagemUrl !== found.imagemUrl) {
      await removerImagem(found.imagemUrl);
    }
    return serialize(atualizado);
  });

export const excluirServico = createServerFn({ method: "POST" })
  .validator((value: unknown) => id.parse(value))
  .handler(async ({ data }) => {
    const auth = await requirePermission("servicos");
    const found = await getPrisma().servico.findFirst({
      where: { id: data.id, empresaId: auth.empresaId },
      include: { _count: { select: { orcamentoItens: true } } },
    });
    if (!found) throw new Error("Servico nao encontrado.");
    if (found._count.orcamentoItens) {
      await getPrisma().servico.update({ where: { id: found.id }, data: { ativo: false } });
      return { ok: true, inativado: true };
    }
    await getPrisma().servico.delete({ where: { id: found.id } });
    await removerImagem(found.imagemUrl);
    return { ok: true, inativado: false };
  });

export const reordenarServicos = createServerFn({ method: "POST" })
  .validator((value: unknown) =>
    z.object({ ids: z.array(z.string().uuid()).min(1).max(500) }).parse(value),
  )
  .handler(async ({ data }) => {
    const auth = await requirePermission("servicos");
    const ids = [...new Set(data.ids)];
    const encontrados = await getPrisma().servico.count({
      where: { empresaId: auth.empresaId, id: { in: ids } },
    });
    if (encontrados !== ids.length) throw new Error("Um ou mais itens não foram encontrados.");
    await getPrisma().$transaction(
      ids.map((servicoId, ordem) =>
        getPrisma().servico.update({ where: { id: servicoId }, data: { ordem } }),
      ),
    );
    return { ok: true };
  });

export const listarCategorias = createServerFn({ method: "GET" }).handler(async () => {
  const auth = await requirePermission("servicos");
  return serialize(
    await getPrisma().categoriaCardapio.findMany({
      where: { empresaId: auth.empresaId },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    }),
  );
});

export const criarCategoria = createServerFn({ method: "POST" })
  .validator((value: unknown) => z.object({ nome: nomeCategoria }).parse(value))
  .handler(async ({ data }) => {
    const auth = await requirePermission("servicos");
    return getPrisma().$transaction(async (tx) => {
      const existe = await tx.categoriaCardapio.count({
        where: { empresaId: auth.empresaId, nome: { equals: data.nome, mode: "insensitive" } },
      });
      if (existe) throw new Error("Já existe uma categoria com esse nome.");
      const ultima = await tx.categoriaCardapio.findFirst({
        where: { empresaId: auth.empresaId },
        orderBy: { ordem: "desc" },
        select: { ordem: true },
      });
      return serialize(
        await tx.categoriaCardapio.create({
          data: { empresaId: auth.empresaId, nome: data.nome, ordem: (ultima?.ordem ?? -1) + 1 },
        }),
      );
    });
  });

/** Renomeia a categoria e leva junto todos os itens que estavam nela. */
export const renomearCategoria = createServerFn({ method: "POST" })
  .validator((value: unknown) => id.extend({ nome: nomeCategoria }).parse(value))
  .handler(async ({ data }) => {
    const auth = await requirePermission("servicos");
    return getPrisma().$transaction(async (tx) => {
      const categoria = await tx.categoriaCardapio.findFirst({
        where: { id: data.id, empresaId: auth.empresaId },
      });
      if (!categoria) throw new Error("Categoria não encontrada.");
      if (categoria.nome === data.nome) return serialize(categoria);
      const duplicada = await tx.categoriaCardapio.count({
        where: {
          empresaId: auth.empresaId,
          id: { not: categoria.id },
          nome: { equals: data.nome, mode: "insensitive" },
        },
      });
      if (duplicada) throw new Error("Já existe uma categoria com esse nome.");
      await tx.servico.updateMany({
        where: { empresaId: auth.empresaId, categoria: categoria.nome },
        data: { categoria: data.nome },
      });
      return serialize(
        await tx.categoriaCardapio.update({
          where: { id: categoria.id },
          data: { nome: data.nome },
        }),
      );
    });
  });

export const excluirCategoria = createServerFn({ method: "POST" })
  .validator((value: unknown) => id.parse(value))
  .handler(async ({ data }) => {
    const auth = await requirePermission("servicos");
    const categoria = await getPrisma().categoriaCardapio.findFirst({
      where: { id: data.id, empresaId: auth.empresaId },
    });
    if (!categoria) throw new Error("Categoria não encontrada.");
    const itens = await getPrisma().servico.count({
      where: { empresaId: auth.empresaId, categoria: categoria.nome },
    });
    if (itens) {
      throw new Error(`Mova ou exclua os ${itens} item(ns) desta categoria antes de removê-la.`);
    }
    await getPrisma().categoriaCardapio.delete({ where: { id: categoria.id } });
    return { ok: true };
  });

export const reordenarCategorias = createServerFn({ method: "POST" })
  .validator((value: unknown) =>
    z.object({ ids: z.array(z.string().uuid()).min(1).max(200) }).parse(value),
  )
  .handler(async ({ data }) => {
    const auth = await requirePermission("servicos");
    const ids = [...new Set(data.ids)];
    const encontrados = await getPrisma().categoriaCardapio.count({
      where: { empresaId: auth.empresaId, id: { in: ids } },
    });
    if (encontrados !== ids.length)
      throw new Error("Uma ou mais categorias não foram encontradas.");
    await getPrisma().$transaction(
      ids.map((categoriaId, ordem) =>
        getPrisma().categoriaCardapio.update({ where: { id: categoriaId }, data: { ordem } }),
      ),
    );
    return { ok: true };
  });

export type ServicoStatus = "Ativo" | "Inativo";

export interface Servico {
  id: string;
  nome: string;
  categoria: string;
  tiposEvento: TipoEvento[];
  cardapios: Cardapio[];
  descricao: string;
  imagemUrl: string;
  valorBase: number;
  precoVisivel: boolean;
  ordem: number;
  sugestaoChef: boolean;
  unidade: string;
  status: ServicoStatus;
  opcoesRotulo: string;
  opcoesIds: string[];
}

export type CreateServicoInput = Omit<Servico, "id">;

export async function listServicos(): Promise<Servico[]> {
  const result = await listarServicos({ data: { page: 1, pageSize: 2000, apenasAtivos: false } });
  return result.items.map((entry) => ({
    id: entry.id,
    nome: entry.nome,
    categoria: entry.categoria,
    tiposEvento: entry.tiposEvento as TipoEvento[],
    cardapios: entry.cardapios as Cardapio[],
    descricao: entry.descricao ?? "",
    imagemUrl: entry.imagemUrl ?? "",
    valorBase: Number(entry.precoBase),
    precoVisivel: entry.precoVisivel,
    ordem: entry.ordem,
    sugestaoChef: entry.sugestaoChef,
    unidade: entry.unidade,
    status: entry.ativo ? "Ativo" : "Inativo",
    opcoesRotulo: entry.opcoesRotulo ?? "",
    opcoesIds: entry.opcoes.map((opcao) => opcao.opcaoId),
  }));
}

function paraDados(input: CreateServicoInput) {
  return {
    nome: input.nome,
    categoria: input.categoria,
    tiposEvento: input.tiposEvento,
    cardapios: input.cardapios,
    descricao: input.descricao || null,
    imagemUrl: input.imagemUrl || null,
    unidade: input.unidade,
    precoBase: input.valorBase,
    precoVisivel: input.precoVisivel,
    ordem: input.ordem,
    sugestaoChef: input.sugestaoChef,
    ativo: input.status === "Ativo",
    opcoesRotulo: input.opcoesIds.length ? input.opcoesRotulo.trim() || "Opção" : null,
    opcoesIds: input.opcoesIds,
  };
}

export async function createServico(input: CreateServicoInput): Promise<Servico> {
  const created = await criarServico({ data: paraDados(input) });
  return { ...input, id: created.id };
}

export async function updateServico(id: string, input: CreateServicoInput): Promise<Servico> {
  await atualizarServico({ data: { id, dados: paraDados(input) } });
  return { ...input, id };
}

export async function deleteServico(id: string) {
  return excluirServico({ data: { id } });
}

export async function reorderServicos(ids: string[]) {
  return reordenarServicos({ data: { ids } });
}
