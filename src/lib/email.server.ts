import { createTransport, type Transporter } from "nodemailer";

type EmailConfig = {
  from: string;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
};

let transporter: Transporter | null = null;

function getEmailConfig(): EmailConfig {
  const host = process.env["SMTP_HOST"]?.trim();
  const user = process.env["SMTP_USER"]?.trim();
  const pass = process.env["SMTP_PASS"]?.replace(/\s/g, "");
  const from = process.env["EMAIL_FROM"]?.trim() || user;
  const port = Number(process.env["SMTP_PORT"] ?? "587");
  const secure = process.env["SMTP_SECURE"]?.trim().toLowerCase() === "true";

  if (!host || !user || !pass || !from) {
    throw new Error("As variáveis SMTP_HOST, SMTP_USER, SMTP_PASS e EMAIL_FROM são obrigatórias.");
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("SMTP_PORT é inválida.");
  }

  return { from, host, port, secure, user, pass };
}

function getTransporter(config: EmailConfig): Transporter {
  if (transporter) return transporter;
  transporter = createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  return transporter;
}

function getAppUrl(): string {
  const configured = process.env["APP_URL"]?.trim();
  if (!configured) throw new Error("APP_URL não foi configurada.");
  const url = new URL(configured);
  if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    throw new Error("APP_URL deve usar HTTPS fora do ambiente local.");
  }
  return url.toString().replace(/\/$/, "");
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]!,
  );
}

export async function enviarEmail(input: {
  destinatario: string;
  assunto: string;
  texto: string;
  html?: string;
}): Promise<void> {
  const config = getEmailConfig();
  await getTransporter(config).sendMail({
    from: config.from,
    to: input.destinatario,
    subject: input.assunto,
    text: input.texto,
    html: input.html,
  });
}

export async function enviarEmailRecuperacaoSenha(input: {
  destinatario: string;
  nome: string;
  token: string;
}): Promise<void> {
  const config = getEmailConfig();
  const link = `${getAppUrl()}/redefinir-senha?token=${encodeURIComponent(input.token)}`;
  const nome = escapeHtml(input.nome);
  const linkSeguro = escapeHtml(link);

  await getTransporter(config).sendMail({
    from: config.from,
    to: input.destinatario,
    subject: "Redefinição de senha — Mesly",
    text: `Olá, ${input.nome}. Recebemos uma solicitação para redefinir sua senha do Mesly. Acesse o link abaixo em até 30 minutos:\n\n${link}\n\nSe você não fez esta solicitação, ignore este e-mail.`,
    html: `
      <div style="background:#f5f5f4;padding:32px 16px;font-family:Arial,sans-serif;color:#171717">
        <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e7e5e4">
          <div style="font-size:22px;font-weight:700;margin-bottom:24px">Mesly</div>
          <h1 style="font-size:20px;margin:0 0 12px">Redefinição de senha</h1>
          <p style="font-size:15px;line-height:1.6;margin:0 0 16px">Olá, ${nome}.</p>
          <p style="font-size:15px;line-height:1.6;margin:0 0 24px">Recebemos uma solicitação para redefinir sua senha. Este link é válido por 30 minutos e só pode ser usado uma vez.</p>
          <a href="${linkSeguro}" style="display:inline-block;background:#171717;color:#fff;text-decoration:none;border-radius:8px;padding:12px 18px;font-size:14px;font-weight:600">Criar nova senha</a>
          <p style="font-size:12px;line-height:1.5;color:#737373;margin:24px 0 0">Se você não fez esta solicitação, ignore este e-mail. Sua senha continuará a mesma.</p>
        </div>
      </div>
    `,
  });
}
