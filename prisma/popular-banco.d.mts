import type { PrismaClient } from "../src/generated/prisma/client";

export function popularBanco(
  prisma: PrismaClient,
  dados: { email: string; senhaHash: string },
): Promise<void>;
