import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { serialize } from "@/lib/domain.server";
import { getPrisma } from "@/lib/prisma.server";
import { requireAuth } from "@/lib/session.server";

export const obterResumoFinanceiro = createServerFn({ method: "GET" })
  .validator((value: unknown) =>
    z
      .object({ inicio: z.coerce.date(), fim: z.coerce.date() })
      .refine((data) => data.fim >= data.inicio, { message: "Periodo invalido." })
      .parse(value),
  )
  .handler(async ({ data }) => {
    const auth = await requireAuth("ADMIN");
    const [recebido, aReceber, custos, fechados] = await getPrisma().$transaction([
      getPrisma().pagamento.aggregate({
        where: {
          empresaId: auth.empresaId,
          status: "PAGO",
          dataPagamento: { gte: data.inicio, lte: data.fim },
        },
        _sum: { valor: true },
      }),
      getPrisma().pagamento.aggregate({
        where: {
          empresaId: auth.empresaId,
          status: { in: ["PENDENTE", "ATRASADO"] },
          dataVencimento: { gte: data.inicio, lte: data.fim },
        },
        _sum: { valor: true },
      }),
      getPrisma().custo.aggregate({
        where: { empresaId: auth.empresaId, data: { gte: data.inicio, lte: data.fim } },
        _sum: { valor: true },
      }),
      // Valor fechado: orçamentos aprovados de eventos não cancelados que acontecem no período.
      getPrisma().orcamento.aggregate({
        where: {
          empresaId: auth.empresaId,
          status: "APROVADO",
          evento: {
            status: { not: "CANCELADO" },
            dataEvento: { gte: data.inicio, lte: data.fim },
          },
        },
        _sum: { total: true },
      }),
    ]);
    const faturamento = Number(recebido._sum.valor ?? 0);
    const despesas = Number(custos._sum.valor ?? 0);
    return serialize({
      faturamento,
      aReceber: Number(aReceber._sum.valor ?? 0),
      valorContratado: Number(fechados._sum.total ?? 0),
      custos: despesas,
      lucro: faturamento - despesas,
      margem: faturamento > 0 ? ((faturamento - despesas) / faturamento) * 100 : 0,
    });
  });
