import { describe, expect, it } from "vitest";

import { concluirDiagnostico, type ResultadoTeste } from "@/lib/diagnostico-email";

const ok = (alvo: string): ResultadoTeste => ({ alvo, ok: true, detalhe: "conectou em 80 ms" });
const falha = (alvo: string): ResultadoTeste => ({ alvo, ok: false, detalhe: "timeout após 8 s" });

describe("concluirDiagnostico", () => {
  it("aponta bloqueio da hospedagem quando a internet funciona e nenhuma porta de e-mail abre", () => {
    expect(
      concluirDiagnostico({
        controle: ok("www.google.com:443"),
        smtp: [falha("587"), falha("465")],
      }),
    ).toMatch(/bloqueando a saída para as portas de e-mail/);
  });

  it("aponta falta de internet de saída quando nem o controle conecta", () => {
    expect(
      concluirDiagnostico({ controle: falha("www.google.com:443"), smtp: [falha("587")] }),
    ).toMatch(/sem acesso à internet de saída/);
  });

  it("indica as portas que funcionam quando alguma porta de e-mail abre", () => {
    expect(
      concluirDiagnostico({
        controle: ok("www.google.com:443"),
        smtp: [falha("smtp.gmail.com:587 (IPv4)"), ok("smtp.gmail.com:465 (IPv4)")],
      }),
    ).toBe(
      "A conexão com o servidor de e-mail funciona em: smtp.gmail.com:465 (IPv4). Se o envio ainda falhar, o problema está na configuração (porta, SMTP_SECURE ou senha).",
    );
  });
});
