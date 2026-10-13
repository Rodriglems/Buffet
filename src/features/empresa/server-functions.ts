import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { serialize } from "@/lib/domain.server";
import { getPrisma } from "@/lib/prisma.server";
import { requireAuth } from "@/lib/session.server";

const empresa = z.object({
  razaoSocial: z.string().trim().min(2).max(200),
  nomeFantasia: z.string().trim().min(2).max(200),
  cnpj: z.string().regex(/^\d{14}$/),
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
  logoUrl: z.string().url().nullable().optional(),
});

export const obterEmpresa = createServerFn({ method: "GET" }).handler(async () => {
  const auth = await requireAuth("ADMIN");
  const result = await getPrisma().empresa.findUnique({ where: { id: auth.empresaId } });
  if (!result) throw new Error("Empresa nao encontrada.");
  return serialize(result);
});

export const atualizarEmpresa = createServerFn({ method: "POST" })
  .inputValidator((value: unknown) => empresa.partial().parse(value))
  .handler(async ({ data }) => {
    const auth = await requireAuth("ADMIN");
    return serialize(await getPrisma().empresa.update({ where: { id: auth.empresaId }, data }));
  });
