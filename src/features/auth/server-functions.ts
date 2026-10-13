import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getPrisma } from "@/lib/prisma.server";
import { verifyPassword } from "@/lib/password.server";
import { destroySession, getAuthContext, issueSession, requireAuth } from "@/lib/session.server";

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),
  senha: z.string().min(1).max(200),
});

export const login = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => loginSchema.parse(input))
  .handler(async ({ data }) => {
    const usuario = await getPrisma().usuario.findFirst({
      where: { email: data.email, ativo: true },
      select: { id: true, senhaHash: true, role: true },
    });
    if (!usuario || !(await verifyPassword(data.senha, usuario.senhaHash))) {
      throw new Error("Credenciais invalidas.");
    }

    await getPrisma().usuario.update({
      where: { id: usuario.id },
      data: { ultimoLogin: new Date() },
    });
    issueSession(usuario.id);
    return { destino: usuario.role === "ADMIN" ? ("/admin" as const) : ("/cliente" as const) };
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  destroySession();
  return { ok: true };
});

export const currentUser = createServerFn({ method: "GET" }).handler(async () => {
  return getAuthContext();
});

export const requireCurrentUser = createServerFn({ method: "GET" }).handler(async () => {
  return requireAuth();
});
