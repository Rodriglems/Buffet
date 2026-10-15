import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { setCookie } from "@tanstack/react-start/server";

import { getPrisma } from "@/lib/prisma.server";
import { hasPermission, permissionForPath } from "@/lib/permissions";
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

export const autorizarAdmin = createServerFn({ method: "GET" })
  .inputValidator((value: unknown) =>
    z.object({ pathname: z.string().min(1).max(300) }).parse(value),
  )
  .handler(async ({ data }) => {
    const auth = await getAuthContext();
    if (!auth) return { status: "unauthenticated" as const };
    if (auth.role !== "ADMIN") return { status: "forbidden" as const };
    const chave = permissionForPath(data.pathname);
    if (chave && !hasPermission(auth.permissoes, chave)) {
      setCookie("mesa_acesso_negado", "1", {
        path: "/",
        maxAge: 30,
        sameSite: "lax",
        secure: process.env["NODE_ENV"] === "production",
      });
      return { status: "denied" as const };
    }
    return { status: "ok" as const, usuario: auth };
  });

export const requireCurrentUser = createServerFn({ method: "GET" }).handler(async () => {
  return requireAuth();
});
