/*
 * Service worker do Mesly (PWA).
 * - Guarda só arquivos estáticos (JS/CSS com hash, ícones) para o app abrir rápido.
 * - Páginas e dados NUNCA vão para o cache: vêm sempre do servidor, para ninguém ver
 *   informação antiga ou de outra conta no mesmo aparelho.
 * - Sem internet, a navegação mostra /offline.html.
 * - Recebe as notificações push e abre a página certa ao tocar nelas.
 * Ao mudar este arquivo, troque VERSAO para descartar o cache antigo.
 */
const VERSAO = "mesly-v3";
const OFFLINE = "/offline.html";
const PRE_CACHE = [
  OFFLINE,
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches
      .open(VERSAO)
      .then((cache) => cache.addAll(PRE_CACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== VERSAO).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (evento) => {
  const pedido = evento.request;
  if (pedido.method !== "GET") return;
  const url = new URL(pedido.url);
  if (url.origin !== self.location.origin) return;
  // Funções do servidor e dados: sempre da rede.
  if (url.pathname.startsWith("/_serverFn") || url.pathname.startsWith("/api")) return;

  // Páginas: sempre da rede; sem conexão, a página de aviso.
  if (pedido.mode === "navigate") {
    evento.respondWith(fetch(pedido).catch(() => caches.match(OFFLINE)));
    return;
  }

  // Arquivos com hash no nome nunca mudam: cache primeiro.
  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/")) {
    evento.respondWith(
      caches.match(pedido).then(
        (guardado) =>
          guardado ||
          fetch(pedido).then((resposta) => {
            if (resposta.ok) {
              const copia = resposta.clone();
              caches.open(VERSAO).then((cache) => cache.put(pedido, copia));
            }
            return resposta;
          }),
      ),
    );
  }
});

self.addEventListener("push", (evento) => {
  let aviso = {};
  try {
    aviso = evento.data ? evento.data.json() : {};
  } catch {
    // Conteúdo inesperado: ainda assim mostra um aviso genérico.
  }
  evento.waitUntil(
    self.registration.showNotification(aviso.titulo || "Mesly", {
      body: aviso.mensagem || "Você tem um novo aviso.",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: aviso.etiqueta,
      data: { url: aviso.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (evento) => {
  evento.notification.close();
  // Só abre páginas do próprio sistema.
  const destino = new URL(evento.notification.data?.url || "/", self.location.origin);
  const url = destino.origin === self.location.origin ? destino.href : self.location.origin;
  evento.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((janelas) => {
      const aberta = janelas.find((janela) => "focus" in janela);
      if (!aberta) return self.clients.openWindow(url);
      return aberta.focus().then((janela) => (janela.navigate ? janela.navigate(url) : janela));
    }),
  );
});
