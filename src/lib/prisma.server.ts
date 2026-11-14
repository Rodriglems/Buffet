import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

const CODIGOS_TRANSITORIOS = new Set(["P1001", "P1002", "P1008", "P2024", "P2034"]);

export function erroTransitorioDoBanco(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const dados = error as { name?: unknown; code?: unknown; message?: unknown };
  if (dados.name === "PrismaClientInitializationError") return true;
  if (typeof dados.code === "string" && CODIGOS_TRANSITORIOS.has(dados.code)) return true;
  return (
    typeof dados.message === "string" &&
    /ECONNRESET|ETIMEDOUT|connection terminated|connection closed|too many clients|remaining connection slots|timeout.*pool/i.test(
      dados.message,
    )
  );
}

/** Uma falha breve de rede/pool não deve derrubar a tela inteira na primeira tentativa. */
export async function comNovaTentativaBanco<T>(operacao: () => Promise<T>): Promise<T> {
  try {
    return await operacao();
  } catch (error) {
    if (!erroTransitorioDoBanco(error)) throw error;
    await new Promise((resolve) => setTimeout(resolve, 200));
    return operacao();
  }
}

export function getPrisma(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const connectionString = process.env["DATABASE_URL"];
  if (!connectionString) {
    throw new Error("DATABASE_URL nao foi configurada.");
  }

  const adapter = new PrismaPg({ connectionString });
  const client = new PrismaClient({ adapter });

  // Um único cliente (e pool de conexões) por processo, também em produção:
  // criar um por chamada esgotaria as conexões do PostgreSQL.
  globalForPrisma.prisma = client;

  return client;
}
