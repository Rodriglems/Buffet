import { createHash, randomBytes } from "node:crypto";

import type { Prisma } from "@/generated/prisma/client";

/** Tempo para o cliente usar o link; depois disso a equipe gera outro. */
export const VALIDADE_CONVITE_DIAS = 7;

export function hashDoConvite(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Cria um link de convite. Convites anteriores continuam valendo, para um novo envio não
 * invalidar o link que o cliente já recebeu; todos deixam de valer quando um deles é usado
 * ou quando o contato do cliente muda. Só o hash fica no banco.
 */
export async function criarConvite(
  tx: Pick<Prisma.TransactionClient, "conviteCliente">,
  clienteId: string,
) {
  const token = randomBytes(32).toString("hex");
  const expiraEm = new Date(Date.now() + VALIDADE_CONVITE_DIAS * 24 * 60 * 60 * 1000);
  await tx.conviteCliente.create({
    data: { clienteId, tokenHash: hashDoConvite(token), expiraEm },
  });
  return { token, expiraEm };
}
