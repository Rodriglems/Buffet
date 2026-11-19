import { formatBRL } from "@/lib/format";

/**
 * Mensagem de WhatsApp do envio do orçamento. O frete aparece à parte ("+ frete") e só quando
 * existe; o valor de cima é o total sem o frete, para os dois somarem o total do orçamento.
 */
export function mensagemEnvioOrcamento(dados: {
  nomeCliente: string;
  tipoEvento: string;
  data: string;
  convidados: number;
  total: number;
  frete: number;
  comoAcessar: string;
}): string {
  const primeiroNome = dados.nomeCliente.trim().split(/\s+/)[0] ?? "";
  const convidados = `${dados.convidados} ${dados.convidados === 1 ? "convidado" : "convidados"}`;
  const valor =
    dados.frete > 0
      ? `Valor total: ${formatBRL(Math.max(0, dados.total - dados.frete))}\n+ frete de ${formatBRL(dados.frete)}`
      : `Valor total: ${formatBRL(dados.total)}`;
  return [
    `Olá, ${primeiroNome}! Seu orçamento está pronto 🎉`,
    `${dados.tipoEvento} · ${dados.data} · ${convidados}`,
    valor,
    dados.comoAcessar,
    "Qualquer dúvida, é só responder esta mensagem.",
  ].join("\n\n");
}
