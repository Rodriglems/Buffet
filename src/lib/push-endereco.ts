const HOSTS_EXATOS = new Set(["fcm.googleapis.com", "android.googleapis.com"]);
const SUFIXOS = [".push.apple.com", ".push.services.mozilla.com", ".notify.windows.com"];

/**
 * O endereço de envio vem do navegador do usuário e o servidor faz uma requisição para ele:
 * só os serviços oficiais de push são aceitos, para ninguém usar o servidor contra outro destino.
 */
export function enderecoPushPermitido(endereco: string): boolean {
  let url: URL;
  try {
    url = new URL(endereco);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.port || url.username || url.password) return false;
  return HOSTS_EXATOS.has(url.hostname) || SUFIXOS.some((sufixo) => url.hostname.endsWith(sufixo));
}
