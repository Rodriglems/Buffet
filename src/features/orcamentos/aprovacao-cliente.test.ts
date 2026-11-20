import { describe, expect, it } from "vitest";

import {
  aguardaAprovacaoDoCliente,
  formatarMomento,
  mensagemAvisarAprovacao,
  mensagemPedirAlteracao,
  statusParaCliente,
} from "@/features/orcamentos/aprovacao-cliente";

describe("statusParaCliente", () => {
  it("mostra a etapa do evento, que a equipe muda na tela do evento", () => {
    expect(statusParaCliente({ status: "VISUALIZADO", evento: { status: "CONFIRMADO" } })).toBe(
      "CONFIRMADO",
    );
  });

  it("mostra o próprio orçamento quando ele foi encerrado", () => {
    expect(statusParaCliente({ status: "REJEITADO", evento: { status: "ORCAMENTO" } })).toBe(
      "REJEITADO",
    );
  });
});

describe("mensagemAvisarAprovacao", () => {
  it("avisa a aprovação com o valor e pergunta do pagamento", () => {
    expect(
      mensagemAvisarAprovacao({
        numero: "5",
        tipoEvento: "Aniversário",
        data: "18/02/2027",
        total: 516,
      }).replace(/\s/g, " "),
    ).toBe(
      "Olá! Aprovei o orçamento #5 (Aniversário, 18/02/2027) no valor de R$ 516,00. Como faço o pagamento?",
    );
  });
});

describe("formatarMomento", () => {
  it("mostra data e hora no fuso do Brasil", () => {
    expect(formatarMomento("2026-11-20T17:32:00.000Z")).toBe("20/11/2026 às 14:32");
  });
});

const enviado = { status: "ENVIADO", enviadoEm: "2026-11-20", evento: { status: "ORCAMENTO" } };

describe("aguardaAprovacaoDoCliente", () => {
  it("espera o cliente quando o orçamento foi enviado e o evento está em Orçamento", () => {
    expect(aguardaAprovacaoDoCliente(enviado)).toBe(true);
    expect(aguardaAprovacaoDoCliente({ ...enviado, status: "VISUALIZADO" })).toBe(true);
  });

  it("não pede aprovação antes do envio, depois de aprovado ou com o evento adiante", () => {
    expect(aguardaAprovacaoDoCliente({ ...enviado, enviadoEm: null })).toBe(false);
    expect(aguardaAprovacaoDoCliente({ ...enviado, status: "APROVADO" })).toBe(false);
    expect(aguardaAprovacaoDoCliente({ ...enviado, evento: { status: "APROVADO" } })).toBe(false);
  });
});

describe("mensagemPedirAlteracao", () => {
  it("diz qual orçamento o cliente quer alterar", () => {
    expect(
      mensagemPedirAlteracao({ numero: "5", tipoEvento: "Aniversário", data: "18/02/2027" }),
    ).toBe("Olá! Quero alterar o orçamento #5 (Aniversário, 18/02/2027): ");
  });
});
