import { popularBanco } from "../../prisma/popular-banco.mjs";

import { hashPassword } from "@/lib/password.server";
import { getPrisma } from "@/lib/prisma.server";

let instalacao: Promise<void> | undefined;

/**
 * Num banco vazio (primeiro deploy), cria a empresa, o cardápio padrão e o administrador
 * a partir de SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD. Com dados já cadastrados não faz nada,
 * então nunca sobrescreve o cardápio nem a senha alterados pela equipe.
 */
export function garantirInstalacaoInicial(): Promise<void> {
  instalacao ??= instalar().catch((erro: unknown) => {
    console.error("Instalação inicial falhou; será tentada de novo na próxima requisição.", erro);
    instalacao = undefined;
  });
  return instalacao;
}

async function instalar(): Promise<void> {
  const email = process.env["SEED_ADMIN_EMAIL"]?.trim().toLowerCase();
  const senha = process.env["SEED_ADMIN_PASSWORD"];
  if (!email || !senha) return;
  if (senha.length < 12) {
    console.error(
      "Instalação inicial ignorada: SEED_ADMIN_PASSWORD deve ter pelo menos 12 caracteres.",
    );
    return;
  }

  const prisma = getPrisma();
  if ((await prisma.empresa.count()) > 0) return;

  await popularBanco(prisma, { email, senhaHash: await hashPassword(senha) });
  console.info(`Instalação inicial concluída: administrador ${email} criado.`);
}
