import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { pagination, serialize } from "@/lib/domain.server";
import { getPrisma } from "@/lib/prisma.server";
import { requireAuth } from "@/lib/session.server";

const servico = z.object({
  nome: z.string().trim().min(2).max(160),
  descricao: z.string().trim().max(2000).nullable().optional(),
  unidade: z.string().trim().min(1).max(30),
  precoBase: z.coerce.number().nonnegative().max(999999999999),
  ativo: z.boolean().default(true),
});
const id = z.object({ id: z.string().uuid() });

export const listarServicos = createServerFn({ method: "GET" })
  .inputValidator((value: unknown) =>
    z
      .object({
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().min(1).max(100).default(50),
        apenasAtivos: z.boolean().default(false),
      })
      .parse(value ?? {}),
  )
  .handler(async ({ data }) => {
    const auth = await requireAuth("ADMIN");
    const where = { empresaId: auth.empresaId, ...(data.apenasAtivos ? { ativo: true } : {}) };
    const [items, total] = await getPrisma().$transaction([
      getPrisma().servico.findMany({
        where,
        ...pagination(data.page, data.pageSize),
        orderBy: { nome: "asc" },
      }),
      getPrisma().servico.count({ where }),
    ]);
    return serialize({ items, total });
  });

export const criarServico = createServerFn({ method: "POST" })
  .inputValidator((value: unknown) => servico.parse(value))
  .handler(async ({ data }) => {
    const auth = await requireAuth("ADMIN");
    return serialize(
      await getPrisma().servico.create({ data: { ...data, empresaId: auth.empresaId } }),
    );
  });

export const atualizarServico = createServerFn({ method: "POST" })
  .inputValidator((value: unknown) => id.extend({ dados: servico.partial() }).parse(value))
  .handler(async ({ data }) => {
    const auth = await requireAuth("ADMIN");
    const found = await getPrisma().servico.findFirst({
      where: { id: data.id, empresaId: auth.empresaId },
    });
    if (!found) throw new Error("Servico nao encontrado.");
    return serialize(
      await getPrisma().servico.update({ where: { id: found.id }, data: data.dados }),
    );
  });

export const excluirServico = createServerFn({ method: "POST" })
  .inputValidator((value: unknown) => id.parse(value))
  .handler(async ({ data }) => {
    const auth = await requireAuth("ADMIN");
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
    return { ok: true, inativado: false };
  });
export type ServicoStatus = "Ativo" | "Inativo";

export interface Servico {
  id: string;
  nome: string;
  categoria: string;
  descricao: string;
  valorBase: number;
  unidade: string;
  status: ServicoStatus;
}

export type CreateServicoInput = Omit<Servico, "id">;

export async function listServicos(): Promise<Servico[]> {
  const result = await listarServicos({ data: { page: 1, pageSize: 100, apenasAtivos: false } });
  return result.items.map((entry) => ({
    id: entry.id,
    nome: entry.nome,
    categoria: "Geral",
    descricao: entry.descricao ?? "",
    valorBase: Number(entry.precoBase),
    unidade: entry.unidade,
    status: entry.ativo ? "Ativo" : "Inativo",
  }));
}

export async function createServico(input: CreateServicoInput): Promise<Servico> {
  const created = await criarServico({
    data: {
      nome: input.nome,
      descricao: [input.categoria, input.descricao].filter(Boolean).join(" — ") || null,
      unidade: input.unidade,
      precoBase: input.valorBase,
      ativo: input.status === "Ativo",
    },
  });
  return { ...input, id: created.id };
}
