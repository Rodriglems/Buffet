import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { pagination, serialize } from "@/lib/domain.server";
import { getPrisma } from "@/lib/prisma.server";
import { requireAuth } from "@/lib/session.server";

const documento = z.object({
  usuarioId: z.string().uuid().nullable().optional(),
  clienteId: z.string().uuid().nullable().optional(),
  eventoId: z.string().uuid().nullable().optional(),
  contratoId: z.string().uuid().nullable().optional(),
  nome: z.string().trim().min(2).max(255),
  tipo: z.enum(["CONTRATO", "COMPROVANTE", "DOCUMENTO_CLIENTE", "OUTRO"]),
  url: z.string().url().max(2000),
  tamanho: z.coerce.bigint().nonnegative().nullable().optional(),
});
const id = z.object({ id: z.string().uuid() });

export const listarDocumentos = createServerFn({ method: "GET" })
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
        ? {
            OR: [
              { usuarioId: auth.usuarioId },
              { cliente: { usuarioId: auth.usuarioId } },
              { evento: { cliente: { usuarioId: auth.usuarioId } } },
              { contrato: { evento: { cliente: { usuarioId: auth.usuarioId } } } },
            ],
          }
        : {}),
    };
    const [items, total] = await getPrisma().$transaction([
      getPrisma().documento.findMany({
        where,
        ...pagination(data.page, data.pageSize),
        orderBy: { createdAt: "desc" },
      }),
      getPrisma().documento.count({ where }),
    ]);
    return serialize({ items, total });
  });

export const criarDocumento = createServerFn({ method: "POST" })
  .inputValidator((value: unknown) => documento.parse(value))
  .handler(async ({ data }) => {
    const auth = await requireAuth("ADMIN");
    const checks = await Promise.all([
      data.usuarioId
        ? getPrisma().usuario.count({ where: { id: data.usuarioId, empresaId: auth.empresaId } })
        : 1,
      data.clienteId
        ? getPrisma().cliente.count({ where: { id: data.clienteId, empresaId: auth.empresaId } })
        : 1,
      data.eventoId
        ? getPrisma().evento.count({ where: { id: data.eventoId, empresaId: auth.empresaId } })
        : 1,
      data.contratoId
        ? getPrisma().contrato.count({ where: { id: data.contratoId, empresaId: auth.empresaId } })
        : 1,
    ]);
    if (checks.some((value) => value !== 1))
      throw new Error("Um dos vinculos do documento e invalido.");
    return serialize(
      await getPrisma().documento.create({ data: { ...data, empresaId: auth.empresaId } }),
    );
  });

export const atualizarDocumento = createServerFn({ method: "POST" })
  .inputValidator((value: unknown) =>
    id
      .extend({
        dados: documento.pick({ nome: true, tipo: true, url: true, tamanho: true }).partial(),
      })
      .parse(value),
  )
  .handler(async ({ data }) => {
    const auth = await requireAuth("ADMIN");
    const found = await getPrisma().documento.findFirst({
      where: { id: data.id, empresaId: auth.empresaId },
    });
    if (!found) throw new Error("Documento nao encontrado.");
    return serialize(
      await getPrisma().documento.update({ where: { id: found.id }, data: data.dados }),
    );
  });

export const excluirDocumento = createServerFn({ method: "POST" })
  .inputValidator((value: unknown) => id.parse(value))
  .handler(async ({ data }) => {
    const auth = await requireAuth("ADMIN");
    const result = await getPrisma().documento.deleteMany({
      where: { id: data.id, empresaId: auth.empresaId },
    });
    if (!result.count) throw new Error("Documento nao encontrado.");
    return { ok: true };
  });
export type DocumentoStatus = "Pendente" | "Assinado" | "Expirado";
export type DocumentoTipo = "Contrato" | "Proposta" | "Termo" | "Outro";

export interface Documento {
  id: string;
  titulo: string;
  tipo: DocumentoTipo;
  cliente: string;
  status: DocumentoStatus;
  criadoEm: string;
  vencimento: string | null;
  url: string;
}

export type CreateDocumentoInput = Omit<Documento, "id" | "criadoEm">;

export async function listDocumentos(): Promise<Documento[]> {
  const result = await listarDocumentos({ data: { page: 1, pageSize: 100 } });
  return result.items.map((entry) => ({
    id: entry.id,
    titulo: entry.nome,
    tipo: entry.tipo === "CONTRATO" ? "Contrato" : entry.tipo === "OUTRO" ? "Outro" : "Termo",
    cliente: "Sistema",
    status: "Pendente",
    criadoEm: new Date(entry.createdAt).toISOString().slice(0, 10),
    vencimento: null,
    url: entry.url,
  }));
}

export async function createDocumento(input: CreateDocumentoInput): Promise<Documento> {
  const tipo =
    input.tipo === "Contrato" ? "CONTRATO" : input.tipo === "Outro" ? "OUTRO" : "DOCUMENTO_CLIENTE";
  const created = await criarDocumento({ data: { nome: input.titulo, tipo, url: input.url } });
  return {
    ...input,
    id: created.id,
    criadoEm: new Date(created.createdAt).toISOString().slice(0, 10),
  };
}
