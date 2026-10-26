import { enviarEmail } from "@/lib/email.server";

export type StatusEnvioNotificacao = "ENVIADO" | "NAO_CONFIGURADO" | "SEM_CONTATO" | "FALHOU";

type ResultadoNotificacao = {
  email: StatusEnvioNotificacao;
  whatsapp: StatusEnvioNotificacao;
};

async function enviarWhatsApp(destinatario: string, mensagem: string): Promise<void> {
  const endpoint = process.env["WHATSAPP_API_URL"]?.trim();
  const token = process.env["WHATSAPP_API_TOKEN"]?.trim();
  if (!endpoint || !token) throw new Error("Integração de WhatsApp não configurada.");

  const resposta = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ to: destinatario, message: mensagem }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!resposta.ok) {
    throw new Error(`A integração de WhatsApp respondeu com status ${resposta.status}.`);
  }
}

export async function notificarNovaSolicitacaoEmpresa(input: {
  email: string | null;
  whatsapp: string | null;
  nomeEmpresa: string;
  nomeCliente: string;
  tipoEvento: string;
  dataEvento: Date;
  orcamentoId: string;
}): Promise<ResultadoNotificacao> {
  const mensagem = [
    `Olá, equipe ${input.nomeEmpresa}.`,
    `Uma nova solicitação de orçamento foi recebida de ${input.nomeCliente}.`,
    `Evento: ${input.tipoEvento}.`,
    `Data: ${input.dataEvento.toLocaleDateString("pt-BR", { timeZone: "UTC" })}.`,
    `Identificador do orçamento: ${input.orcamentoId}.`,
    "Acesse o painel administrativo para analisar o pedido e elaborar a proposta.",
  ].join("\n");

  let email: StatusEnvioNotificacao = input.email ? "NAO_CONFIGURADO" : "SEM_CONTATO";
  if (input.email) {
    const smtpConfigurado = Boolean(
      process.env["SMTP_HOST"] && process.env["SMTP_USER"] && process.env["SMTP_PASS"],
    );
    if (smtpConfigurado) {
      try {
        await enviarEmail({
          destinatario: input.email,
          assunto: `Nova solicitação de orçamento — ${input.nomeCliente}`,
          texto: mensagem,
        });
        email = "ENVIADO";
      } catch {
        email = "FALHOU";
      }
    }
  }

  let whatsapp: StatusEnvioNotificacao = input.whatsapp ? "NAO_CONFIGURADO" : "SEM_CONTATO";
  if (input.whatsapp && process.env["WHATSAPP_API_URL"] && process.env["WHATSAPP_API_TOKEN"]) {
    try {
      await enviarWhatsApp(input.whatsapp, mensagem);
      whatsapp = "ENVIADO";
    } catch {
      whatsapp = "FALHOU";
    }
  }

  return { email, whatsapp };
}
