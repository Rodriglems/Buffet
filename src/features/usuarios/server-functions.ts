import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { pagination, serialize } from "@/lib/domain.server";
import { hashPassword } from "@/lib/password.server";
import { getPrisma } from "@/lib/prisma.server";
import { requireAuth } from "@/lib/session.server";

const novoUsuario = z.object({
  nome: z.string().trim().min(2).max(160),
  email: z.string().trim().email().toLowerCase(),
  senha: z.string().min(12).max(200),
  role: z.enum(["ADMIN", "CLIENT"]),
  clienteId: z.string().uuid().nullable().optional(),
});
const id = z.object({ id: z.string().uuid() });

export const listarUsuarios = createServerFn({ method: "GET" })
  .inputValidator((value: unknown) =>
    z
      .object({
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().min(1).max(100).default(30),
      })
      .parse(value ?? {}),
  )
  .handler(async ({ data }) => {
    const auth = await requireAuth("ADMIN");
    const where = { empresaId: auth.empresaId };
    const [items, total] = await getPrisma().$transaction([
      getPrisma().usuario.findMany({
        where,
        ...pagination(data.page, data.pageSize),
        select: {
          id: true,
          nome: true,
          email: true,
          role: true,
          ativo: true,
          ultimoLogin: true,
          createdAt: true,
          cliente: { select: { id: true, nome: true } },
        },
        orderBy: { nome: "asc" },
      }),
      getPrisma().usuario.count({ where }),
    ]);
    return serialize({ items, total });
  });

export const criarUsuario = createServerFn({ method: "POST" })
  .inputValidator((value: unknown) => novoUsuario.parse(value))
  .handler(async ({ data }) => {
    const auth = await requireAuth("ADMIN");
    if (data.role === "CLIENT" && !data.clienteId)
      throw new Error("Usuario CLIENT deve estar vinculado a um cliente.");
    return getPrisma().$transaction(async (tx) => {
      if (data.clienteId) {
        const cliente = await tx.cliente.findFirst({
          where: { id: data.clienteId, empresaId: auth.empresaId, usuarioId: null },
        });
        if (!cliente) throw new Error("Cliente invalido ou ja vinculado.");
      }
      const usuario = await tx.usuario.create({
        data: {
          empresaId: auth.empresaId,
          nome: data.nome,
          email: data.email,
          senhaHash: await hashPassword(data.senha),
          role: data.role,
        },
      });
      if (data.clienteId)
        await tx.cliente.update({ where: { id: data.clienteId }, data: { usuarioId: usuario.id } });
      return {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
        ativo: usuario.ativo,
      };
    });
  });

export const atualizarUsuario = createServerFn({ method: "POST" })
  .inputValidator((value: unknown) =>
    id
      .extend({
        nome: z.string().trim().min(2).max(160).optional(),
        email: z.string().email().toLowerCase().optional(),
        role: z.enum(["ADMIN", "CLIENT"]).optional(),
        ativo: z.boolean().optional(),
        senha: z.string().min(12).max(200).optional(),
      })
      .parse(value),
  )
  .handler(async ({ data }) => {
    const auth = await requireAuth("ADMIN");
    const found = await getPrisma().usuario.findFirst({
      where: { id: data.id, empresaId: auth.empresaId },
    });
    if (!found) throw new Error("Usuario nao encontrado.");
    if (found.id === auth.usuarioId && data.ativo === false)
      throw new Error("Voce nao pode desativar seu proprio usuario.");
    const { id: _id, senha, ...changes } = data;
    return serialize(
      await getPrisma().usuario.update({
        where: { id: found.id },
        data: { ...changes, ...(senha ? { senhaHash: await hashPassword(senha) } : {}) },
        select: { id: true, nome: true, email: true, role: true, ativo: true, updatedAt: true },
      }),
    );
  });

export const excluirUsuario = createServerFn({ method: "POST" })
  .inputValidator((value: unknown) => id.parse(value))
  .handler(async ({ data }) => {
    const auth = await requireAuth("ADMIN");
    if (data.id === auth.usuarioId) throw new Error("Voce nao pode excluir seu proprio usuario.");
    const found = await getPrisma().usuario.findFirst({
      where: { id: data.id, empresaId: auth.empresaId },
    });
    if (!found) throw new Error("Usuario nao encontrado.");
    await getPrisma().usuario.update({ where: { id: found.id }, data: { ativo: false } });
    return { ok: true, inativado: true };
  });

export const obterMeuPerfil = createServerFn({ method: "GET" }).handler(async () => {
  const auth = await requireAuth();
  const usuario = await getPrisma().usuario.findUnique({
    where: { id: auth.usuarioId },
    select: { id: true, nome: true, email: true, role: true, cliente: true },
  });
  if (!usuario) throw new Error("Perfil nao encontrado.");
  return serialize(usuario);
});

export const atualizarMeuPerfil = createServerFn({ method: "POST" })
  .inputValidator((value: unknown) =>
    z
      .object({
        nome: z.string().trim().min(2).max(160),
        email: z.string().email().toLowerCase(),
        telefone: z
          .string()
          .regex(/^\d{10,11}$/)
          .nullable()
          .optional(),
        whatsapp: z
          .string()
          .regex(/^\d{10,11}$/)
          .nullable()
          .optional(),
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
      })
      .parse(value),
  )
  .handler(async ({ data }) => {
    const auth = await requireAuth();
    const { nome, email, ...clienteData } = data;
    return getPrisma().$transaction(async (tx) => {
      await tx.usuario.update({ where: { id: auth.usuarioId }, data: { nome, email } });
      if (auth.clienteId)
        await tx.cliente.update({
          where: { id: auth.clienteId },
          data: { nome, email, ...clienteData },
        });
      return { ok: true };
    });
  });
export type UsuarioStatus = "Ativo" | "Inativo";
export type UsuarioPerfil = "Administrador";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: UsuarioPerfil;
  status: UsuarioStatus;
  ultimoAcesso: string | null;
}

export type CreateUsuarioInput = Omit<Usuario, "id" | "ultimoAcesso"> & { senha: string };

export async function listUsuarios(): Promise<Usuario[]> {
  const result = await listarUsuarios({ data: { page: 1, pageSize: 100 } });
  return result.items.map((entry) => ({
    id: entry.id,
    nome: entry.nome,
    email: entry.email,
    perfil: "Administrador",
    status: entry.ativo ? "Ativo" : "Inativo",
    ultimoAcesso: entry.ultimoLogin ? new Date(entry.ultimoLogin).toISOString() : null,
  }));
}

export async function createUsuario(input: CreateUsuarioInput): Promise<Usuario> {
  const created = await criarUsuario({
    data: {
      nome: input.nome,
      email: input.email,
      senha: input.senha,
      role: "ADMIN",
    },
  });
  return { ...input, id: created.id, ultimoAcesso: null };
}
