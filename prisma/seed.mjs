import "dotenv/config";

import { randomBytes, scryptSync } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL nao foi configurada.");

const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@buffet.local").trim().toLowerCase();
const password = process.env.SEED_ADMIN_PASSWORD;
if (!password || password.length < 12) {
  throw new Error("SEED_ADMIN_PASSWORD deve ter pelo menos 12 caracteres.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

try {
  await prisma.$transaction(async (tx) => {
    const empresa = await tx.empresa.upsert({
      where: { cnpj: "00000000000000" },
      update: {},
      create: {
        razaoSocial: "Buffet Demonstracao LTDA",
        nomeFantasia: "Mesa Buffet & Eventos",
        cnpj: "00000000000000",
        email,
      },
    });

    await tx.usuario.upsert({
      where: { empresaId_email: { empresaId: empresa.id, email } },
      update: { ativo: true, role: "ADMIN" },
      create: {
        empresaId: empresa.id,
        nome: "Administrador",
        email,
        senhaHash: hashPassword(password),
        role: "ADMIN",
      },
    });
  });
  console.info(`Seed concluido para ${email}.`);
} finally {
  await prisma.$disconnect();
}
