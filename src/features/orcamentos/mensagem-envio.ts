import { formatBRL } from "@/lib/format";

/**
 * Mensagem de WhatsApp do envio do orçamento. O frete aparece à parte ("+ frete") e só quando
 * existe; o valor de cima é o total sem o frete, para os dois somarem o total do orçamento.
 * O WhatsApp não tem botão: o link vai em texto, numa linha própria, e vira toque na conversa.
 */
export function mensagemEnvioOrcamento(dados: {
  nomeCliente: string;
  tipoEvento: string;
  data: string;
  convidados: number;
  total: number;
  frete: number;
  link: string;
  /** Linha logo abaixo do link (ex.: validade do link de criar a senha). */
  avisoLink?: string;
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
    "Para visualizar todos os detalhes do orçamento, acesse:",
    dados.avisoLink ? `${dados.link}\n${dados.avisoLink}` : dados.link,
    "Caso queira alterar algum item do cardápio ou solicitar alguma modificação, responda esta mensagem ou fale conosco pelo WhatsApp.",
  ].join("\n\n");
}
