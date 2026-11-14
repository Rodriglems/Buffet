const HOSTS_LOCAIS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function normalizarOrigem(valor: string | undefined, nome: string): string | null {
  const configurado = valor?.trim();
  if (!configurado) return null;

  let url: URL;
  try {
    url = new URL(configurado);
  } catch {
    throw new Error(nome + " deve ser uma URL completa, como https://cardapio.exemplo.com.br.");
  }

  const local = HOSTS_LOCAIS.has(url.hostname);
  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
    throw new Error(nome + " deve usar HTTPS fora do ambiente local.");
  }
  if (url.username || url.password) {
    throw new Error(nome + " não pode conter usuário ou senha.");
  }
  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error(nome + " deve conter somente o domínio, sem caminho, parâmetros ou fragmento.");
  }

  return url.origin;
}

export function origemFormularioPublico(
  formularioUrl = process.env["FORMULARIO_PUBLICO_URL"],
  appUrl = process.env["APP_URL"],
): string | null {
  return (
    normalizarOrigem(formularioUrl, "FORMULARIO_PUBLICO_URL") ?? normalizarOrigem(appUrl, "APP_URL")
  );
}

export function caminhoFormularioPublico(token: string): string {
  return "/solicitar-orcamento/" + encodeURIComponent(token);
}

export function urlFormularioPublico(
  token: string,
  formularioUrl = process.env["FORMULARIO_PUBLICO_URL"],
  appUrl = process.env["APP_URL"],
): string | null {
  const origem = origemFormularioPublico(formularioUrl, appUrl);
  return origem ? origem + caminhoFormularioPublico(token) : null;
}

/**
 * Quando o domínio exclusivo já estiver configurado, links antigos levam ao endereço oficial.
 * O 307 é aplicado pelo servidor para não fixar um redirecionamento permanente durante a homologação.
 */
export function destinoFormularioPublico(
  enderecoAtual: string,
  formularioUrl = process.env["FORMULARIO_PUBLICO_URL"],
): string | null {
  const atual = new URL(enderecoAtual);
  if (!atual.pathname.startsWith("/solicitar-orcamento/")) return null;

  const origem = normalizarOrigem(formularioUrl, "FORMULARIO_PUBLICO_URL");
  if (!origem || atual.origin === origem) return null;

  return origem + atual.pathname + atual.search;
}
