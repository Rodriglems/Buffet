import { createServerFn } from "@tanstack/react-start";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";

import { setCookie } from "@tanstack/react-start/server";

import { exigirDentroDoLimite } from "@/lib/limite-taxa.server";
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
  // O mínimo depende do perfil (cliente: 4, administrador: 12) e é conferido no handler.
  senha: z.string().min(4, "A nova senha precisa ter pelo menos 4 caracteres.").max(200),
});

const RESPOSTA_RECUPERACAO =
  "Se houver uma conta ativa com esse e-mail, enviaremos as instruções de recuperação.";
const DURACAO_TOKEN_MS = 30 * 60 * 1000;
const INTERVALO_SOLICITACAO_MS = 2 * 60 * 1000;
const MAXIMO_TENTATIVAS_LOGIN = 5;
const BLOQUEIO_LOGIN_MS = 15 * 60 * 1000;
const TAMANHO_MINIMO_SENHA_CLIENTE = 4;
const TAMANHO_MINIMO_SENHA_ADMIN = 12;

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export const login = createServerFn({ method: "POST" })
  .validator((input: unknown) => loginSchema.parse(input))
  .handler(async ({ data }) => {
    exigirDentroDoLimite("login");
    const usuario = await getPrisma().usuario.findFirst({
      where: { email: data.email, ativo: true },
      select: {
        id: true,
        senhaHash: true,
        role: true,
        sessaoVersao: true,
        tentativasLogin: true,
        bloqueadoAte: true,
      },
    });
    if (usuario?.bloqueadoAte && usuario.bloqueadoAte > new Date()) {
      const minutos = Math.ceil((usuario.bloqueadoAte.getTime() - Date.now()) / 60_000);
      throw new Error(
        `Muitas tentativas incorretas. Tente novamente em ${minutos} minuto${minutos === 1 ? "" : "s"}.`,
      );
    }
    if (!usuario || !(await verifyPassword(data.senha, usuario.senhaHash))) {
      if (usuario) {
        // Senhas de clientes podem ter só 4 dígitos: o bloqueio impede adivinhação em sequência.
        const tentativas = usuario.tentativasLogin + 1;
        const bloquear = tentativas >= MAXIMO_TENTATIVAS_LOGIN;
        await getPrisma().usuario.update({
          where: { id: usuario.id },
          data: {
            tentativasLogin: bloquear ? 0 : tentativas,
            bloqueadoAte: bloquear ? new Date(Date.now() + BLOQUEIO_LOGIN_MS) : null,
          },
        });
      }
      throw new Error("Credenciais invalidas.");
    }

    await getPrisma().usuario.update({
      where: { id: usuario.id },
      data: { ultimoLogin: new Date(), tentativasLogin: 0, bloqueadoAte: null },
    });
    issueSession(usuario.id, usuario.sessaoVersao);
    return { destino: usuario.role === "ADMIN" ? ("/admin" as const) : ("/cliente" as const) };
  });

export const solicitarRecuperacaoSenha = createServerFn({ method: "POST" })
  .validator((input: unknown) => emailSchema.parse(input))
  .handler(async ({ data }) => {
    exigirDentroDoLimite("recuperacaoSenha");
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
  .validator((input: unknown) => tokenSchema.safeParse(input))
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
  .validator((input: unknown) => novaSenhaSchema.parse(input))
  .handler(async ({ data }) => {
    const hashDoToken = tokenHash(data.token);
    const registro = await getPrisma().tokenRecuperacaoSenha.findFirst({
      where: {
        tokenHash: hashDoToken,
        usadoEm: null,
        expiraEm: { gt: new Date() },
        usuario: { ativo: true },
      },
      select: { id: true, usuarioId: true, usuario: { select: { role: true } } },
    });
    if (!registro) throw new Error("Link inválido ou expirado.");
    const minimo =
      registro.usuario.role === "ADMIN" ? TAMANHO_MINIMO_SENHA_ADMIN : TAMANHO_MINIMO_SENHA_CLIENTE;
    if (data.senha.length < minimo) {
      throw new Error(`A nova senha precisa ter pelo menos ${minimo} caracteres.`);
    }

    const senhaHash = await hashPassword(data.senha);
    await getPrisma().$transaction(async (tx) => {
      const consumido = await tx.tokenRecuperacaoSenha.updateMany({
        where: { id: registro.id, usadoEm: null, expiraEm: { gt: new Date() } },
        data: { usadoEm: new Date() },
      });
      if (consumido.count !== 1) throw new Error("Link inválido ou expirado.");

      await tx.usuario.update({
        where: { id: registro.usuarioId },
        data: {
          senhaHash,
          sessaoVersao: { increment: 1 },
          tentativasLogin: 0,
          bloqueadoAte: null,
        },
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
  .validator((value: unknown) => z.object({ pathname: z.string().min(1).max(300) }).parse(value))
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
