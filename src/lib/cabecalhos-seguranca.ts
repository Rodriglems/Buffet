/** Cabeçalhos HTTP de segurança aplicados a todas as respostas do servidor. */
export function cabecalhosSeguranca(producao: boolean): Record<string, string> {
  return {
    // Impede que o sistema seja aberto dentro de outro site (clickjacking).
    "X-Frame-Options": "DENY",
    // Impede o navegador de "adivinhar" o tipo de arquivos (ex.: tratar texto como script).
    "X-Content-Type-Options": "nosniff",
    // Não envia o endereço completo das páginas internas para outros sites.
    "Referrer-Policy": "strict-origin-when-cross-origin",
    // O sistema não usa câmera, microfone nem localização.
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    // HTTPS obrigatório só em produção (em desenvolvimento o acesso é por http://localhost).
    ...(producao ? { "Strict-Transport-Security": "max-age=31536000; includeSubDomains" } : {}),
  };
}

/** Aplica os cabeçalhos; respostas com cabeçalhos imutáveis (ex.: redirect) são copiadas. */
export function aplicarCabecalhosSeguranca(resposta: Response, producao: boolean): Response {
  const cabecalhos = cabecalhosSeguranca(producao);
  try {
    for (const [nome, valor] of Object.entries(cabecalhos)) {
      if (!resposta.headers.has(nome)) resposta.headers.set(nome, valor);
    }
    return resposta;
  } catch {
    const copia = new Response(resposta.body, resposta);
    for (const [nome, valor] of Object.entries(cabecalhos)) {
      if (!copia.headers.has(nome)) copia.headers.set(nome, valor);
    }
    return copia;
  }
}
