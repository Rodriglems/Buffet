import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { chaveDaData } from "@/features/eventos/datas-bloqueadas";
import { getPrisma } from "@/lib/prisma.server";
import { requirePermission } from "@/lib/session.server";

const dataTexto = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.")
  .refine((valor) => !Number.isNaN(new Date(`${valor}T00:00:00.000Z`).getTime()), "Data inválida.");

/** Hoje como data do banco (meia-noite UTC), para listar só os bloqueios que ainda valem. */
function inicioDeHoje() {
  return new Date(`${chaveDaData(new Date())}T00:00:00.000Z`);
}

export type DataBloqueadaItem = { id: string; data: string; motivo: string | null };

/** Bloqueios de hoje em diante, do mais próximo para o mais distante. */
export const listarDatasBloqueadas = createServerFn({ method: "GET" }).handler(
  async (): Promise<DataBloqueadaItem[]> => {
    const auth = await requirePermission("eventos");
    const linhas = await getPrisma().dataBloqueada.findMany({
      where: { empresaId: auth.empresaId, data: { gte: inicioDeHoje() } },
      orderBy: { data: "asc" },
      select: { id: true, data: true, motivo: true },
    });
    return linhas.map((linha) => ({ ...linha, data: chaveDaData(linha.data) }));
  },
);

/** Bloqueia uma ou mais datas com o mesmo motivo; datas já bloqueadas só têm o motivo trocado. */
export const bloquearDatas = createServerFn({ method: "POST" })
  .validator((value: unknown) =>
    z
      .object({
        datas: z.array(dataTexto).min(1, "Escolha ao menos uma data.").max(366),
        motivo: z.string().trim().max(120).optional(),
      })
      .parse(value),
  )
  .handler(async ({ data }) => {
    const auth = await requirePermission("eventos");
    const hoje = chaveDaData(new Date());
    const datas = [...new Set(data.datas)];
    if (datas.some((dia) => dia < hoje)) throw new Error("Não é possível bloquear datas passadas.");
    const motivo = data.motivo || null;
    await getPrisma().$transaction(
      datas.map((dia) =>
        getPrisma().dataBloqueada.upsert({
          where: {
            empresaId_data: {
              empresaId: auth.empresaId,
              data: new Date(`${dia}T00:00:00.000Z`),
            },
          },
          update: { motivo },
          create: {
            empresaId: auth.empresaId,
            data: new Date(`${dia}T00:00:00.000Z`),
            motivo,
          },
        }),
      ),
    );
    return { bloqueadas: datas.length };
  });

export const desbloquearData = createServerFn({ method: "POST" })
  .validator((value: unknown) => z.object({ id: z.string().uuid() }).parse(value))
  .handler(async ({ data }) => {
    const auth = await requirePermission("eventos");
    const { count } = await getPrisma().dataBloqueada.deleteMany({
      where: { id: data.id, empresaId: auth.empresaId },
    });
    if (!count) throw new Error("Esta data já não estava bloqueada. Atualize a página.");
    return { ok: true };
  });
