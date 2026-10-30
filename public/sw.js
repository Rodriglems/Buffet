/*
 * Service worker do Mesly (PWA).
 * - Guarda só arquivos estáticos (JS/CSS com hash, ícones) para o app abrir rápido.
 * - Páginas e dados NUNCA vão para o cache: vêm sempre do servidor, para ninguém ver
 *   informação antiga ou de outra conta no mesmo aparelho.
 * - Sem internet, a navegação mostra /offline.html.
 * Ao mudar este arquivo, troque VERSAO para descartar o cache antigo.
 */
const VERSAO = "mesly-v2";
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
