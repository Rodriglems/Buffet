import { createServerFn } from "@tanstack/react-start";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";

import { setCookie } from "@tanstack/react-start/server";

import { getPrisma } from "@/lib/prisma.server";
import { hasPermission, permissionForPath } from "@/lib/permissions";
import { hashPassword, verifyPassword } from "@/lib/password.server";
import { enviarEmailRecuperacaoSenha } from "@/lib/email.server";
import { destroySession, getAuthContext, issueSession, requireAuth } from "@/lib/session.server";

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),
  senha: z.string().min(1).max(200),
});

const emailSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido.").max(254).toLowerCase(),
});

const tokenSchema = z.object({
  token: z
    .string()
    .trim()
    .regex(/^[a-f0-9]{64}$/i, "Link inválido ou expirado."),
});

const novaSenhaSchema = tokenSchema.extend({
  senha: z.string().min(12, "A nova senha precisa ter pelo menos 12 caracteres.").max(200),
});

const RESPOSTA_RECUPERACAO =
  "Se houver uma conta ativa com esse e-mail, enviaremos as instruções de recuperação.";
const DURACAO_TOKEN_MS = 30 * 60 * 1000;
const INTERVALO_SOLICITACAO_MS = 2 * 60 * 1000;

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export const login = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => loginSchema.parse(input))
  .handler(async ({ data }) => {
    const usuario = await getPrisma().usuario.findFirst({
      where: { email: data.email, ativo: true },
      select: { id: true, senhaHash: true, role: true, sessaoVersao: true },
    });
    if (!usuario || !(await verifyPassword(data.senha, usuario.senhaHash))) {
      throw new Error("Credenciais invalidas.");
    }

    await getPrisma().usuario.update({
      where: { id: usuario.id },
      data: { ultimoLogin: new Date() },
    });
    issueSession(usuario.id, usuario.sessaoVersao);
    return { destino: usuario.role === "ADMIN" ? ("/admin" as const) : ("/cliente" as const) };
  });

export const solicitarRecuperacaoSenha = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => emailSchema.parse(input))
  .handler(async ({ data }) => {
    const usuario = await getPrisma().usuario.findFirst({
      where: { email: data.email, ativo: true },
      select: { id: true, nome: true, email: true },
    });

    if (!usuario) return { ok: true, mensagem: RESPOSTA_RECUPERACAO };

    const recente = await getPrisma().tokenRecuperacaoSenha.findFirst({
      where: {
        usuarioId: usuario.id,
        createdAt: { gte: new Date(Date.now() - INTERVALO_SOLICITACAO_MS) },
      },
      select: { id: true },
    });
    if (recente) return { ok: true, mensagem: RESPOSTA_RECUPERACAO };

    const token = randomBytes(32).toString("hex");
    const registro = await getPrisma().$transaction(async (tx) => {
      await tx.tokenRecuperacaoSenha.updateMany({
        where: { usuarioId: usuario.id, usadoEm: null },
        data: { usadoEm: new Date() },
      });
      return tx.tokenRecuperacaoSenha.create({
        data: {
          usuarioId: usuario.id,
          tokenHash: tokenHash(token),
          expiraEm: new Date(Date.now() + DURACAO_TOKEN_MS),
        },
        select: { id: true },
      });
    });

    try {
      await enviarEmailRecuperacaoSenha({
        destinatario: usuario.email,
        nome: usuario.nome,
        token,
      });
    } catch (error) {
      await getPrisma().tokenRecuperacaoSenha.update({
        where: { id: registro.id },
        data: { usadoEm: new Date() },
      });
      console.error(
        "Falha ao enviar e-mail de recuperação:",
        error instanceof Error ? error.message : "erro desconhecido",
      );
    }

    return { ok: true, mensagem: RESPOSTA_RECUPERACAO };
  });

export const validarTokenRecuperacaoSenha = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => tokenSchema.safeParse(input))
  .handler(async ({ data }) => {
    if (!data.success) return { valido: false };
    const registro = await getPrisma().tokenRecuperacaoSenha.findFirst({
      where: {
        tokenHash: tokenHash(data.data.token),
        usadoEm: null,
        expiraEm: { gt: new Date() },
        usuario: { ativo: true },
      },
      select: { id: true },
    });
    return { valido: Boolean(registro) };
  });

export const redefinirSenha = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => novaSenhaSchema.parse(input))
  .handler(async ({ data }) => {
    const hashDoToken = tokenHash(data.token);
    const registro = await getPrisma().tokenRecuperacaoSenha.findFirst({
      where: {
        tokenHash: hashDoToken,
        usadoEm: null,
        expiraEm: { gt: new Date() },
        usuario: { ativo: true },
      },
      select: { id: true, usuarioId: true },
    });
    if (!registro) throw new Error("Link inválido ou expirado.");

    const senhaHash = await hashPassword(data.senha);
    await getPrisma().$transaction(async (tx) => {
      const consumido = await tx.tokenRecuperacaoSenha.updateMany({
        where: { id: registro.id, usadoEm: null, expiraEm: { gt: new Date() } },
        data: { usadoEm: new Date() },
      });
      if (consumido.count !== 1) throw new Error("Link inválido ou expirado.");

      await tx.usuario.update({
        where: { id: registro.usuarioId },
        data: { senhaHash, sessaoVersao: { increment: 1 } },
      });
      await tx.tokenRecuperacaoSenha.updateMany({
        where: { usuarioId: registro.usuarioId, usadoEm: null },
        data: { usadoEm: new Date() },
      });
    });

    destroySession();
    return { ok: true };
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
