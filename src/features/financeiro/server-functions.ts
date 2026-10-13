import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { serialize } from "@/lib/domain.server";
import { getPrisma } from "@/lib/prisma.server";
import { requireAuth } from "@/lib/session.server";

export const obterResumoFinanceiro = createServerFn({ method: "GET" })
  .inputValidator((value: unknown) =>
    z
      .object({ inicio: z.coerce.date(), fim: z.coerce.date() })
      .refine((data) => data.fim >= data.inicio, { message: "Periodo invalido." })
      .parse(value),
  )
  .handler(async ({ data }) => {
    const auth = await requireAuth("ADMIN");
    const [recebido, aReceber, custos, contratos] = await getPrisma().$transaction([
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
      getPrisma().contrato.aggregate({
        where: {
          empresaId: auth.empresaId,
          status: "ASSINADO",
          assinadoEm: { gte: data.inicio, lte: data.fim },
        },
        _sum: { valorTotal: true },
      }),
    ]);
    const faturamento = Number(recebido._sum.valor ?? 0);
    const despesas = Number(custos._sum.valor ?? 0);
    return serialize({
      faturamento,
      aReceber: Number(aReceber._sum.valor ?? 0),
      valorContratado: Number(contratos._sum.valorTotal ?? 0),
      custos: despesas,
      lucro: faturamento - despesas,
      margem: faturamento > 0 ? ((faturamento - despesas) / faturamento) * 100 : 0,
    });
  });
