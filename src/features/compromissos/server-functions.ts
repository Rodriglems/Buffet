import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { serialize } from "@/lib/domain.server";
import { getPrisma } from "@/lib/prisma.server";
import { requirePermission } from "@/lib/session.server";

const id = z.object({ id: z.string().uuid() });
const compromisso = z.object({
  titulo: z.string().trim().min(2, "Informe o compromisso.").max(200),
  // Data do calendário (YYYY-MM-DD), gravada como DATE sem fuso.
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
  hora: z
    .string()
    .trim()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido.")
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
  observacoes: z.string().trim().max(2000).nullable().optional(),
});

export const listarCompromissos = createServerFn({ method: "GET" }).handler(async () => {
  const auth = await requirePermission("agenda");
  const itens = await getPrisma().compromisso.findMany({
    where: { empresaId: auth.empresaId },
    orderBy: [{ data: "asc" }, { hora: "asc" }],
    take: 1000,
  });
  return serialize(itens);
});

export const criarCompromisso = createServerFn({ method: "POST" })
  .validator((value: unknown) => compromisso.parse(value))
  .handler(async ({ data }) => {
    const auth = await requirePermission("agenda");
    const criado = await getPrisma().compromisso.create({
      data: {
        empresaId: auth.empresaId,
        titulo: data.titulo,
        data: new Date(`${data.data}T00:00:00Z`),
        hora: data.hora ?? null,
        observacoes: data.observacoes || null,
      },
    });
    return serialize(criado);
  });

export const alternarCompromissoConcluido = createServerFn({ method: "POST" })
  .validator((value: unknown) => id.extend({ concluido: z.boolean() }).parse(value))
  .handler(async ({ data }) => {
    const auth = await requirePermission("agenda");
    const result = await getPrisma().compromisso.updateMany({
      where: { id: data.id, empresaId: auth.empresaId },
      data: { concluido: data.concluido },
    });
    if (!result.count) throw new Error("Compromisso não encontrado.");
    return { ok: true };
  });

export const excluirCompromisso = createServerFn({ method: "POST" })
  .validator((value: unknown) => id.parse(value))
  .handler(async ({ data }) => {
    const auth = await requirePermission("agenda");
    const result = await getPrisma().compromisso.deleteMany({
      where: { id: data.id, empresaId: auth.empresaId },
    });
    if (!result.count) throw new Error("Compromisso não encontrado.");
    return { ok: true };
  });
