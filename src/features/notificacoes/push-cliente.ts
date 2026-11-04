import { useEffect } from "react";

import {
  obterChavePush,
  removerInscricaoPush,
  salvarInscricaoPush,
} from "@/features/notificacoes/push";

/** Lembra neste aparelho que a pessoa ativou o push, para refazer a inscrição se o navegador a trocar. */
const CHAVE_ATIVADO = "mesly-push-ativado";

export type SituacaoPush =
  "SEM_SUPORTE" | "INSTALAR_NO_IPHONE" | "NAO_CONFIGURADO" | "PEDIR" | "ATIVO" | "BLOQUEADO";

function ehIphone() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPad recente se apresenta como Mac, mas tem tela de toque.
    (navigator.userAgent.includes("Mac") && navigator.maxTouchPoints > 1)
  );
}

function appInstalado() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function temSuporte() {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    // O service worker só é registrado no build de produção.
    import.meta.env.PROD
  );
}

function paraBytes(base64Url: string) {
  const base64 = (base64Url + "=".repeat((4 - (base64Url.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (letra) => letra.charCodeAt(0));
}

async function registro() {
  await navigator.serviceWorker.register("/sw.js");
  return navigator.serviceWorker.ready;
}

function enviarAoServidor(inscricao: PushSubscription) {
  const { endpoint, keys } = inscricao.toJSON();
  if (!endpoint || !keys?.["p256dh"] || !keys["auth"]) {
    throw new Error("O navegador não informou os dados da inscrição.");
  }
  return salvarInscricaoPush({
    data: { endpoint, keys: { p256dh: keys["p256dh"], auth: keys["auth"] } },
  });
}

async function inscrever(chave: string) {
  const reg = await registro();
  const atual = await reg.pushManager.getSubscription();
  if (atual) return atual;
  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: paraBytes(chave),
  });
}

export async function lerSituacaoPush(): Promise<SituacaoPush> {
  // No iPhone o push só existe com o app instalado na Tela de Início.
  if (ehIphone() && !appInstalado()) return "INSTALAR_NO_IPHONE";
  if (!temSuporte()) return "SEM_SUPORTE";
  const { chave } = await obterChavePush();
  if (!chave) return "NAO_CONFIGURADO";
  if (Notification.permission === "denied") return "BLOQUEADO";
  if (Notification.permission !== "granted") return "PEDIR";
  const reg = await navigator.serviceWorker.getRegistration();
  const inscricao = await reg?.pushManager.getSubscription();
  return inscricao ? "ATIVO" : "PEDIR";
}

/** Precisa partir de um toque da pessoa: o navegador recusa o pedido de permissão automático. */
export async function ativarPush(): Promise<SituacaoPush> {
  const { chave } = await obterChavePush();
  if (!chave) return "NAO_CONFIGURADO";
  const permissao = await Notification.requestPermission();
  if (permissao === "denied") return "BLOQUEADO";
  if (permissao !== "granted") return "PEDIR";
  await enviarAoServidor(await inscrever(chave));
  localStorage.setItem(CHAVE_ATIVADO, "1");
  return "ATIVO";
}

/** Desliga o push neste aparelho. Roda antes de sair da conta, enquanto a sessão ainda vale. */
export async function desativarPush(): Promise<void> {
  localStorage.removeItem(CHAVE_ATIVADO);
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const inscricao = await reg?.pushManager?.getSubscription();
  if (!inscricao) return;
  const { endpoint } = inscricao;
  await inscricao.unsubscribe();
  await removerInscricaoPush({ data: { endpoint } });
}

/**
 * Ao abrir o app, confirma a inscrição no servidor. O navegador pode trocá-la sem avisar, e o
 * aparelho pode ter passado para outra conta. Nunca pede permissão por conta própria.
 */
export function useSincronizarPush() {
  useEffect(() => {
    if (!temSuporte() || Notification.permission !== "granted") return;
    void (async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      const atual = await reg?.pushManager.getSubscription();
      if (atual) {
        await enviarAoServidor(atual);
      } else if (localStorage.getItem(CHAVE_ATIVADO)) {
        const { chave } = await obterChavePush();
        if (chave) await enviarAoServidor(await inscrever(chave));
      }
    })().catch(() => {
      // Tenta de novo na próxima abertura; o app funciona normalmente sem push.
    });
  }, []);
}
