/** Resultado de uma tentativa de conexão feita pelo diagnóstico de e-mail. */
export type ResultadoTeste = { alvo: string; ok: boolean; detalhe: string };

/**
 * Lê os testes de conexão e diz, em português, onde está o problema. O controle é uma conexão
 * comum na porta 443: se ele funciona e o e-mail não, a hospedagem bloqueia as portas de e-mail.
 */
export function concluirDiagnostico({
  controle,
  smtp,
}: {
  controle: ResultadoTeste;
  smtp: ResultadoTeste[];
}): string {
  const abertas = smtp.filter((teste) => teste.ok).map((teste) => teste.alvo);
  if (abertas.length) {
    return `A conexão com o servidor de e-mail funciona em: ${abertas.join(", ")}. Se o envio ainda falhar, o problema está na configuração (porta, SMTP_SECURE ou senha).`;
  }
  if (!controle.ok) {
    return "O servidor está sem acesso à internet de saída: nem a conexão de controle funcionou. Fale com o suporte da hospedagem.";
  }
  return "A hospedagem está bloqueando a saída para as portas de e-mail (a internet comum funciona). Peça a liberação ao suporte ou use um serviço de e-mail por API.";
}
