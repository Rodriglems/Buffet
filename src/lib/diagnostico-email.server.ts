import { promises as dns } from "node:dns";
import { connect } from "node:net";

import { concluirDiagnostico, type ResultadoTeste } from "@/lib/diagnostico-email";

const ESPERA_MS = 8_000;
const PREFIXO = "[diagnóstico de e-mail]";
let executado = false;

/** Tenta abrir uma conexão TCP e mede o tempo, sem enviar nada. */
function testarConexao(alvo: string, host: string, port: number): Promise<ResultadoTeste> {
  const inicio = Date.now();
  return new Promise((resolve) => {
    const socket = connect({ host, port });
    const terminar = (ok: boolean, detalhe: string) => {
      socket.destroy();
      resolve({ alvo, ok, detalhe });
    };
    socket.setTimeout(ESPERA_MS);
    socket.once("connect", () => terminar(true, `conectou em ${Date.now() - inicio} ms`));
    socket.once("timeout", () => terminar(false, `timeout após ${ESPERA_MS / 1000} s`));
    socket.once("error", (erro: NodeJS.ErrnoException) =>
      terminar(false, `erro ${erro.code ?? erro.message}`),
    );
  });
}

async function primeiroEndereco(host: string, versao: 4 | 6): Promise<string | null> {
  try {
    const enderecos = versao === 4 ? await dns.resolve4(host) : await dns.resolve6(host);
    return enderecos[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Uma vez por início do servidor, testa se ele consegue se conectar ao servidor de e-mail
 * (portas 587 e 465, por IPv4 e IPv6) e a um site comum na porta 443, e escreve o resultado
 * no log. Roda em segundo plano: nunca atrasa nem derruba uma requisição.
 */
export function diagnosticarSaidaEmail(): void {
  const host = process.env["SMTP_HOST"]?.trim();
  if (executado || !host) return;
  executado = true;

  void (async () => {
    const [ipv4, ipv6] = await Promise.all([primeiroEndereco(host, 4), primeiroEndereco(host, 6)]);
    console.info(
      `${PREFIXO} ${host} resolve para IPv4 ${ipv4 ?? "nenhum"} e IPv6 ${ipv6 ?? "nenhum"}`,
    );

    const testes: Promise<ResultadoTeste>[] = [];
    for (const porta of [587, 465]) {
      if (ipv4) testes.push(testarConexao(`${host}:${porta} (IPv4)`, ipv4, porta));
      if (ipv6) testes.push(testarConexao(`${host}:${porta} (IPv6)`, ipv6, porta));
    }
    const [controle, ...smtp] = await Promise.all([
      testarConexao("www.google.com:443 (controle)", "www.google.com", 443),
      ...testes,
    ]);
    for (const teste of [controle, ...smtp]) {
      console.info(`${PREFIXO} ${teste.alvo}: ${teste.detalhe}`);
    }
    console.info(`${PREFIXO} conclusão: ${concluirDiagnostico({ controle, smtp })}`);
  })().catch((erro: unknown) => console.error(`${PREFIXO} falhou:`, erro));
}
