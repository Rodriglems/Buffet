import webpush from "web-push";

import { getPrisma } from "@/lib/prisma.server";

export type AvisoPush = {
  titulo: string;
  mensagem: string;
  /** Página aberta ao tocar na notificação. */
  url?: string;
  /** Avisos com a mesma etiqueta se substituem em vez de empilhar. */
  etiqueta?: string;
};

const ESPERA_ENVIO_MS = 5_000;

export function chavePublicaPush(): string | null {
  return process.env["VAPID_PUBLIC_KEY"]?.trim() || null;
}

function dadosVapid() {
  const publicKey = chavePublicaPush();
  const privateKey = process.env["VAPID_PRIVATE_KEY"]?.trim();
  if (!publicKey || !privateKey) return null;
  // O serviço de push exige um contato de quem envia.
  const appUrl = process.env["APP_URL"]?.trim();
  const subject =
    process.env["VAPID_SUBJECT"]?.trim() ||
    (appUrl?.startsWith("https://") ? appUrl : "mailto:contato@mesly.local");
  return { subject, publicKey, privateKey };
}

/**
 * Envia o aviso para todos os aparelhos dos usuários. Nunca lança erro: a ação principal
 * (salvar o pedido, registrar o pagamento) não pode falhar por causa de uma notificação.
 * Chame depois da transação, para não avisar sobre algo que acabou desfeito.
 */
export async function enviarPush(usuarioIds: string[], aviso: AvisoPush) {
  const vazio = { enviados: 0, falhas: 0 };
  const vapidDetails = dadosVapid();
  if (!vapidDetails || !usuarioIds.length) return vazio;
  try {
    const inscricoes = await getPrisma().pushInscricao.findMany({
      where: { usuarioId: { in: usuarioIds }, usuario: { ativo: true } },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });
    const conteudo = JSON.stringify(aviso);
    const envios = await Promise.allSettled(
      inscricoes.map((inscricao) =>
        webpush.sendNotification(
          {
            endpoint: inscricao.endpoint,
            keys: { p256dh: inscricao.p256dh, auth: inscricao.auth },
          },
          conteudo,
          { vapidDetails, TTL: 24 * 60 * 60, urgency: "high", timeout: ESPERA_ENVIO_MS },
        ),
      ),
    );
    // 404 e 410: o aparelho cancelou ou desinstalou. A inscrição não serve mais.
    const expiradas = inscricoes.filter((_, indice) => {
      const envio = envios[indice];
      if (envio?.status !== "rejected") return false;
      const status = (envio.reason as { statusCode?: number }).statusCode;
      return status === 404 || status === 410;
    });
    if (expiradas.length) {
      await getPrisma().pushInscricao.deleteMany({
        where: { id: { in: expiradas.map((inscricao) => inscricao.id) } },
      });
    }
    const falhas = envios.filter((envio) => envio.status === "rejected").length;
    if (falhas > expiradas.length) {
      console.error(`Push: ${falhas - expiradas.length} envio(s) falharam.`);
    }
    return { enviados: envios.length - falhas, falhas };
  } catch (error) {
    console.error("Falha ao enviar push:", error instanceof Error ? error.message : "desconhecido");
    return vazio;
  }
}
