import { getRequestIP } from "@tanstack/react-start/server";

import { criarLimitador } from "@/lib/limite-taxa";

const MINUTO = 60_000;

// Limites por IP das ações públicas (sem login), contra robôs e adivinhação de senhas.
const limitadores = {
  pedidoOrcamento: criarLimitador(5, 10 * MINUTO),
  recuperacaoSenha: criarLimitador(5, 15 * MINUTO),
  login: criarLimitador(20, 15 * MINUTO),
};

export type AcaoLimitada = keyof typeof limitadores;

/**
 * Lança erro amigável quando o IP passou do limite da ação. Atrás de um proxy (Nginx,
 * Cloudflare), defina TRUST_PROXY=true para usar o IP real do cabeçalho X-Forwarded-For.
 */
export function exigirDentroDoLimite(acao: AcaoLimitada) {
  const ip =
    getRequestIP({ xForwardedFor: process.env["TRUST_PROXY"] === "true" }) ?? "desconhecido";
  if (!limitadores[acao](ip)) {
    throw new Error("Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.");
  }
}
