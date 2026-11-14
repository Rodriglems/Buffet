/** Um e-mail pronto para sair, independente do meio de envio. */
export type Mensagem = { destinatario: string; assunto: string; texto: string; html?: string };

export type Remetente = { name?: string; email: string };

const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

/** Lê o EMAIL_FROM nos formatos "Nome <email>", "\"Nome\" <email>" ou só "email". */
export function remetenteDe(valor: string): Remetente {
  const texto = valor.trim();
  const comNome = /^"?([^"<]*?)"?\s*<([^>]+)>$/.exec(texto);
  const email = (comNome ? comNome[2] : texto)?.trim() ?? "";
  if (!EMAIL.test(email)) {
    throw new Error('EMAIL_FROM inválido. Use "Nome <email@dominio.com>" ou só o e-mail.');
  }
  const name = comNome?.[1]?.trim();
  return name ? { name, email } : { email };
}

/**
 * Com BREVO_API_KEY o envio sai pela API do Brevo (porta 443, que nenhuma hospedagem bloqueia).
 * Sem ela, pelo SMTP configurado — o caminho para servidores que liberam as portas de e-mail.
 */
export function meioDeEnvio(env: Record<string, string | undefined>): "brevo" | "smtp" {
  return env["BREVO_API_KEY"]?.trim() ? "brevo" : "smtp";
}

/** Corpo da requisição POST /v3/smtp/email da API do Brevo. */
export function corpoBrevo(mensagem: Mensagem, remetente: Remetente) {
  return {
    sender: remetente,
    to: [{ email: mensagem.destinatario }],
    subject: mensagem.assunto,
    textContent: mensagem.texto,
    ...(mensagem.html ? { htmlContent: mensagem.html } : {}),
  };
}
