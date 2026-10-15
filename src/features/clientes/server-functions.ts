import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { firstZodError } from "@/features/shared/validation/errors";
import { pagination, registrarAtividade, serialize } from "@/lib/domain.server";
import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma.server";
import {
  assertAdminPermission,
  requireAnyPermission,
  requireAuth,
  requirePermission,
} from "@/lib/session.server";

const vazioParaNulo = (value: unknown) => {
  if (value == null) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
};

const somenteDigitos = (value: unknown) => {
  const base = vazioParaNulo(value);
  if (typeof base !== "string") return base;
  return base.replace(/\D/g, "") || null;
};

const telefoneDigitos = (value: unknown) => {
  const digits = somenteDigitos(value);
  if (typeof digits !== "string") return digits;
  if (digits.startsWith("55") && digits.length > 11) return digits.slice(2);
  return digits;
};

const textoOpcional = (max: number) =>
  z.preprocess(vazioParaNulo, z.string().trim().max(max).nullable());

const clienteSchema = z
  .object({
    nome: z.string().trim().min(2, "Informe o nome do cliente.").max(160),
    tipoPessoa: z.enum(["FISICA", "JURIDICA"], {
      errorMap: () => ({ message: "Selecione pessoa física ou jurídica." }),
    }),
    cpfCnpj: z.preprocess(
      somenteDigitos,
      z
        .string()
        .regex(/^\d{11}(\d{3})?$/, "CPF deve ter 11 dígitos ou CNPJ 14.")
        .nullable(),
    ),
    email: z.preprocess(
      vazioParaNulo,
      z.string().trim().email("E-mail inválido.").toLowerCase().nullable(),
    ),
    telefone: z.preprocess(
      telefoneDigitos,
      z
        .string()
        .regex(/^\d{10,11}$/, "Telefone deve ter DDD e 10 ou 11 dígitos.")
        .nullable(),
    ),
    whatsapp: z.preprocess(
      telefoneDigitos,
      z
        .string()
        .regex(/^\d{10,11}$/, "WhatsApp deve ter DDD e 10 ou 11 dígitos.")
        .nullable(),
    ),
    cep: z.preprocess(
      somenteDigitos,
      z
        .string()
        .regex(/^\d{8}$/, "CEP deve ter 8 dígitos.")
        .nullable(),
    ),
    estado: z.preprocess(
      (value) => {
        const base = vazioParaNulo(value);
        return typeof base === "string" ? base.trim().toUpperCase() : base;
      },
      z
        .string()
        .regex(/^[A-Z]{2}$/, "Selecione um estado válido.")
        .nullable(),
    ),
    cidade: textoOpcional(120),
    bairro: textoOpcional(120),
    logradouro: textoOpcional(200),
    numero: textoOpcional(30),
    complemento: textoOpcional(120),
    observacoes: textoOpcional(4000),
    usuarioId: z
      .preprocess(vazioParaNulo, z.string().uuid("Usuário inválido.").nullable())
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.cpfCnpj) return;
    const esperado = value.tipoPessoa === "FISICA" ? 11 : 14;
    if (value.cpfCnpj.length !== esperado) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cpfCnpj"],
        message:
          value.tipoPessoa === "FISICA"
            ? "Pessoa física exige CPF com 11 dígitos."
            : "Pessoa jurídica exige CNPJ com 14 dígitos.",
      });
    }
  });

function lerCliente(input: unknown) {
  const result = clienteSchema.safeParse(input);
  if (!result.success) {
    const erros = firstZodError(result.error);
    throw new Error(Object.values(erros)[0] ?? "Dados do cliente inválidos.");
  }
  return result.data;
}

function erroDeCliente(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    String(error.meta?.["target"] ?? "").includes("cpf")
  ) {
    throw new Error("Já existe um cliente com este CPF/CNPJ.");
  }
  throw error;
}
const idSchema = z.object({ id: z.string().uuid() });
const listSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  busca: z.string().trim().max(100).default(""),
});

export const listarClientes = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => listSchema.parse(input ?? {}))
  .handler(async ({ data }) => {
    const auth = await requireAnyPermission(["contatos", "eventos", "usuarios"]);
    const where = {
      empresaId: auth.empresaId,
      ...(data.busca
        ? {
            OR: [
              { nome: { contains: data.busca, mode: "insensitive" as const } },
              { email: { contains: data.busca, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
    const [items, total] = await getPrisma().$transaction([
      getPrisma().cliente.findMany({
        where,
        ...pagination(data.page, data.pageSize),
        include: { _count: { select: { eventos: true } } },
        orderBy: { nome: "asc" },
      }),
      getPrisma().cliente.count({ where }),
    ]);
    return serialize({ items, total, page: data.page, pageSize: data.pageSize });
  });

export const obterCliente = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data }) => {
    const auth = await requireAuth();
    assertAdminPermission(auth, "contatos");
    const cliente = await getPrisma().cliente.findFirst({
      where: {
        id: data.id,
        empresaId: auth.empresaId,
        ...(auth.role === "CLIENT" ? { usuarioId: auth.usuarioId } : {}),
      },
      include: { eventos: { orderBy: { dataEvento: "desc" } } },
    });
    if (!cliente) throw new Error("Cliente nao encontrado.");
    return serialize(cliente);
  });

export const criarCliente = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => lerCliente(input))
  .handler(async ({ data }) => {
    const auth = await requirePermission("contatos");
    try {
      return await getPrisma().$transaction(async (tx) => {
        const { usuarioId, ...cadastro } = data;
        const cliente = await tx.cliente.create({
          data: {
            ...cadastro,
            empresaId: auth.empresaId,
            ...(usuarioId ? { usuarioId } : {}),
          },
        });
        await registrarAtividade(tx, auth, {
          tipo: "CLIENTE_CRIADO",
          descricao: `Cliente ${cliente.nome} cadastrado.`,
          entidadeTipo: "CLIENTE",
          entidadeId: cliente.id,
        });
        return serialize(cliente);
      });
    } catch (error) {
      erroDeCliente(error);
    }
  });

export const atualizarCliente = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const bruto = z
      .object({ id: z.string().uuid("Cliente inválido."), dados: z.unknown() })
      .safeParse(input);
    if (!bruto.success) throw new Error("Cliente inválido.");
    return { id: bruto.data.id, dados: lerCliente(bruto.data.dados) };
  })
  .handler(async ({ data }) => {
    const auth = await requirePermission("contatos");
    const existing = await getPrisma().cliente.findFirst({
      where: { id: data.id, empresaId: auth.empresaId },
    });
    if (!existing) throw new Error("Cliente nao encontrado.");
    const { usuarioId: _vinculo, ...dados } = data.dados;
    void _vinculo;
    try {
      return serialize(await getPrisma().cliente.update({ where: { id: data.id }, data: dados }));
    } catch (error) {
      erroDeCliente(error);
    }
  });

export const excluirCliente = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data }) => {
    const auth = await requirePermission("contatos");
    const existing = await getPrisma().cliente.findFirst({
      where: { id: data.id, empresaId: auth.empresaId },
      include: { _count: { select: { eventos: true, documentos: true } } },
    });
    if (!existing) throw new Error("Cliente nao encontrado.");
    if (existing._count.eventos || existing._count.documentos) {
      throw new Error("Cliente possui historico e nao pode ser excluido.");
    }
    await getPrisma().cliente.delete({ where: { id: data.id } });
    return { ok: true };
  });
