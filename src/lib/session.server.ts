import { createHmac, timingSafeEqual } from "node:crypto";
import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";

import { getPrisma } from "@/lib/prisma.server";

const COOKIE_NAME = "buffet_session";
const SESSION_SECONDS = 60 * 60 * 12;

type SessionPayload = {
  userId: string;
  expiresAt: number;
};

export type AuthContext = {
  usuarioId: string;
  empresaId: string;
  clienteId: string | null;
  nome: string;
  email: string;
  role: "ADMIN" | "CLIENT";
};

function getSecret(): string {
  const secret = process.env["SESSION_SECRET"];
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET deve possuir pelo menos 32 caracteres.");
  }
  return secret;
}

function encode(value: string): string {
  return Buffer.from(value).toString("base64url");
}

function sign(value: string): string {
  return createHmac("sha256", getSecret()).update(value).digest("base64url");
}

function serialize(payload: SessionPayload): string {
  const body = encode(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

function parse(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = Buffer.from(sign(body));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (
      !payload.userId ||
      !Number.isInteger(payload.expiresAt) ||
      payload.expiresAt <= Date.now()
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function issueSession(usuarioId: string): void {
  setCookie(
    COOKIE_NAME,
    serialize({ userId: usuarioId, expiresAt: Date.now() + SESSION_SECONDS * 1000 }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env["NODE_ENV"] === "production",
      path: "/",
      maxAge: SESSION_SECONDS,
    },
  );
}

export function destroySession(): void {
  deleteCookie(COOKIE_NAME, { path: "/" });
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const payload = parse(getCookie(COOKIE_NAME));
  if (!payload) return null;

  const usuario = await getPrisma().usuario.findFirst({
    where: { id: payload.userId, ativo: true },
    select: {
      id: true,
      empresaId: true,
      nome: true,
      email: true,
      role: true,
      cliente: { select: { id: true } },
    },
  });
  if (!usuario) return null;

  return {
    usuarioId: usuario.id,
    empresaId: usuario.empresaId,
    clienteId: usuario.cliente?.id ?? null,
    nome: usuario.nome,
    email: usuario.email,
    role: usuario.role,
  };
}

export async function requireAuth(role?: AuthContext["role"]): Promise<AuthContext> {
  const auth = await getAuthContext();
  if (!auth) throw new Error("UNAUTHENTICATED");
  if (role && auth.role !== role) throw new Error("FORBIDDEN");
  return auth;
}
