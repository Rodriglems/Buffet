import "dotenv/config";

import { randomBytes, scryptSync } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { popularBanco } from "./popular-banco.mjs";

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
  await popularBanco(prisma, { email, senhaHash: hashPassword(password) });
  console.info(`Seed concluido para ${email}.`);
} finally {
  await prisma.$disconnect();
}
