import { describe, expect, it } from "vitest";

import { aplicarCabecalhosSeguranca } from "./cabecalhos-seguranca";

describe("aplicarCabecalhosSeguranca", () => {
  it("adiciona os cabeçalhos e só exige HTTPS em produção", () => {
    const dev = aplicarCabecalhosSeguranca(new Response("ok"), false);
    expect(dev.headers.get("X-Frame-Options")).toBe("DENY");
    expect(dev.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(dev.headers.has("Strict-Transport-Security")).toBe(false);

    const producao = aplicarCabecalhosSeguranca(new Response("ok"), true);
    expect(producao.headers.get("Strict-Transport-Security")).toContain("max-age=");
  });

  it("funciona com respostas de cabeçalhos imutáveis, como redirecionamentos", () => {
    const resposta = aplicarCabecalhosSeguranca(
      Response.redirect("https://exemplo.test/", 302),
      true,
    );
    expect(resposta.status).toBe(302);
    expect(resposta.headers.get("Location")).toBe("https://exemplo.test/");
    expect(resposta.headers.get("X-Frame-Options")).toBe("DENY");
  });

  it("não sobrescreve um cabeçalho já definido pela rota", () => {
    const resposta = new Response("ok", { headers: { "Referrer-Policy": "no-referrer" } });
    expect(aplicarCabecalhosSeguranca(resposta, true).headers.get("Referrer-Policy")).toBe(
      "no-referrer",
    );
  });
});
