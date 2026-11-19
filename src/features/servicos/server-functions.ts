import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { Prisma } from "@/generated/prisma/client";
import { serialize } from "@/lib/domain.server";
import { validarCardapios } from "@/features/servicos/cardapios-formatos";
import {
  agruparOpcoes,
  gruposParaSalvar,
  MAXIMO_GRUPOS,
  type GrupoOpcoes,
} from "@/features/servicos/grupos-opcoes";
import { mensagemNomeRepetido } from "@/features/servicos/regras-cardapio";
import { TIPOS_EVENTO, type TipoEvento } from "@/lib/catalogo";
import { getPrisma } from "@/lib/prisma.server";
import { requirePermission } from "@/lib/session.server";
import { ehUrlDoArmazenamento, removerImagem } from "@/lib/storage.server";

const servico = z.object({
  nome: z.string().trim().min(2).max(160),
  categoria: z.string().trim().min(1).max(80),
  tiposEvento: z.array(z.enum(TIPOS_EVENTO)).max(TIPOS_EVENTO.length).default([]),
  cardapios: z.array(z.string().trim().min(1).max(80)).max(100).default([]),
  descricao: z.string().trim().max(2000).nullable().optional(),
  // URL do R2; imagens antigas em base64 só são aceitas se não forem alteradas.
  imagemUrl: z.string().max(1_500_000).nullable().optional(),
  unidade: z.string().trim().min(1).max(30),
  precoBase: z.coerce.number().nonnegative().max(999999999999),
  precoVisivel: z.boolean().default(true),
  ordem: z.coerce.number().int().min(0).max(100000).default(0),
  sugestaoChef: z.boolean().default(false),
  ativo: z.boolean().default(true),
  // Escolhas do cliente em grupos (ex.: Recheio e Molho), cada um com os itens que servem de opção.
  gruposOpcoes: z
    .array(
      z.object({
        nome: z.string().trim().max(60),
        ids: z.array(z.string().uuid()).max(100),
      }),
    )
    .max(MAXIMO_GRUPOS)
    .optional(),
});
const id = z.object({ id: z.string().uuid() });
const nomeCategoria = z.string().trim().min(2, "Informe o nome da categoria.").max(80);

function validarImagem(imagemUrl: string | null | undefined, atual: string | null = null) {
  if (!imagemUrl || imagemUrl === atual || ehUrlDoArmazenamento(imagemUrl)) return;
  throw new Error("Envie a imagem novamente para salvar o item.");
}

/**
 * Recusa um nome que já está em outro item, dizendo qual é e em que categoria ele está. Sem isso
 * a pessoa recebia só "Já existe um cadastro com esses dados" e não sabia qual item abrir.
 */
async function garantirNomeLivre(
  tx: Prisma.TransactionClient,
  empresaId: string,
  nome: string,
  ignorarId?: string,
) {
  const existente = await tx.servico.findFirst({
    where: {
      empresaId,
      nome: { equals: nome, mode: "insensitive" },
      ...(ignorarId ? { id: { not: ignorarId } } : {}),
    },
    select: { nome: true, categoria: true, ativo: true },
  });
  if (existente) throw new Error(mensagemNomeRepetido(existente));
}

async function validarCategoria(tx: Prisma.TransactionClient, empresaId: string, nome?: string) {
  if (nome === undefined) return;
  const existe = await tx.categoriaCardapio.count({ where: { empresaId, nome } });
  if (!existe) throw new Error("Categoria não encontrada. Cadastre-a antes de usar.");
}

/**
 * Substitui as escolhas do item (ex.: recheios e molhos de uma massa), aceitando só itens da
 * empresa. O nome do primeiro grupo também vai para opcoesRotulo, a coluna antiga.
 */
async function salvarOpcoes(
  tx: Prisma.TransactionClient,
  empresaId: string,
  servicoId: string,
  grupos: GrupoOpcoes[] | undefined,
) {
  if (grupos === undefined) return;
  const limpos = gruposParaSalvar(
    grupos.map((grupo) => ({ ...grupo, ids: grupo.ids.filter((id) => id !== servicoId) })),
  );
  const ids = limpos.flatMap((grupo) => grupo.ids);
  const validos = await tx.servico.count({ where: { empresaId, id: { in: ids } } });
  if (validos !== ids.length) throw new Error("Uma ou mais opções são inválidas.");
  await tx.servicoOpcao.deleteMany({ where: { servicoId } });
  if (ids.length) {
    await tx.servicoOpcao.createMany({
      data: limpos.flatMap((grupo, grupoOrdem) =>
        grupo.ids.map((opcaoId) => ({ servicoId, opcaoId, grupo: grupo.nome, grupoOrdem })),
      ),
    });
  }
  await tx.servico.update({
    where: { id: servicoId },
    data: { opcoesRotulo: limpos[0]?.nome ?? null },
  });
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
        include: { opcoes: { select: { opcaoId: true, grupo: true, grupoOrdem: true } } },
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
    const { gruposOpcoes, ...dados } = data;
    return getPrisma().$transaction(async (tx) => {
      await garantirNomeLivre(tx, auth.empresaId, dados.nome);
      await validarCategoria(tx, auth.empresaId, dados.categoria);
      await validarCardapios(tx, auth.empresaId, dados.cardapios);
      const criado = await tx.servico.create({ data: { ...dados, empresaId: auth.empresaId } });
      await salvarOpcoes(tx, auth.empresaId, criado.id, gruposOpcoes);
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
    const { gruposOpcoes, ...dados } = data.dados;
    const atualizado = await getPrisma().$transaction(async (tx) => {
      if (dados.nome !== undefined && dados.nome !== found.nome) {
        await garantirNomeLivre(tx, auth.empresaId, dados.nome, found.id);
      }
      if (dados.categoria !== found.categoria) {
        await validarCategoria(tx, auth.empresaId, dados.categoria);
      }
      // Só os cardápios novos no item precisam existir; os que ele já tinha são mantidos.
      await validarCardapios(
        tx,
        auth.empresaId,
        dados.cardapios?.filter((nome) => !found.cardapios.includes(nome)),
      );
      const salvo = await tx.servico.update({ where: { id: found.id }, data: dados });
      await salvarOpcoes(tx, auth.empresaId, found.id, gruposOpcoes);
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
  cardapios: string[];
  descricao: string;
  imagemUrl: string;
  valorBase: number;
  precoVisivel: boolean;
  ordem: number;
  sugestaoChef: boolean;
  unidade: string;
  status: ServicoStatus;
  /** Escolhas que o cliente faz neste item, em grupos (ex.: Recheio e Molho). */
  gruposOpcoes: GrupoOpcoes[];
}

export type CreateServicoInput = Omit<Servico, "id">;

export async function listServicos(): Promise<Servico[]> {
  const result = await listarServicos({ data: { page: 1, pageSize: 2000, apenasAtivos: false } });
  return result.items.map((entry) => ({
    id: entry.id,
    nome: entry.nome,
    categoria: entry.categoria,
    tiposEvento: entry.tiposEvento as TipoEvento[],
    cardapios: entry.cardapios,
    descricao: entry.descricao ?? "",
    imagemUrl: entry.imagemUrl ?? "",
    valorBase: Number(entry.precoBase),
    precoVisivel: entry.precoVisivel,
    ordem: entry.ordem,
    sugestaoChef: entry.sugestaoChef,
    unidade: entry.unidade,
    status: entry.ativo ? "Ativo" : "Inativo",
    gruposOpcoes: agruparOpcoes(entry.opcoes),
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
    gruposOpcoes: input.gruposOpcoes,
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
