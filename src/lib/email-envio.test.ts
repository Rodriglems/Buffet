import { describe, expect, it } from "vitest";

import { corpoBrevo, meioDeEnvio, remetenteDe } from "@/lib/email-envio";

describe("remetenteDe", () => {
  it("separa nome e e-mail no formato Nome <email>", () => {
    expect(remetenteDe("Mesly <somos@exemplo.com>")).toEqual({
      name: "Mesly",
      email: "somos@exemplo.com",
    });
  });

  it("aceita nome entre aspas", () => {
    expect(remetenteDe('"Buffet Sabor & Arte" <contato@exemplo.com>')).toEqual({
      name: "Buffet Sabor & Arte",
      email: "contato@exemplo.com",
    });
  });

  it("aceita só o e-mail", () => {
    expect(remetenteDe(" somos@exemplo.com ")).toEqual({ email: "somos@exemplo.com" });
  });

  it("recusa valor sem e-mail válido", () => {
    expect(() => remetenteDe("Mesly")).toThrow(/EMAIL_FROM/);
  });
});

describe("meioDeEnvio", () => {
  it("usa o Brevo quando há chave de API", () => {
    expect(meioDeEnvio({ BREVO_API_KEY: "xkeysib-123" })).toBe("brevo");
  });

  it("usa SMTP quando a chave está vazia ou ausente", () => {
    expect(meioDeEnvio({ BREVO_API_KEY: "  " })).toBe("smtp");
    expect(meioDeEnvio({})).toBe("smtp");
  });
});

describe("corpoBrevo", () => {
  it("monta a mensagem no formato da API do Brevo", () => {
    expect(
      corpoBrevo(
        { destinatario: "cliente@exemplo.com", assunto: "Oi", texto: "Olá", html: "<p>Olá</p>" },
        { name: "Mesly", email: "somos@exemplo.com" },
      ),
    ).toEqual({
      sender: { name: "Mesly", email: "somos@exemplo.com" },
      to: [{ email: "cliente@exemplo.com" }],
      subject: "Oi",
      textContent: "Olá",
      htmlContent: "<p>Olá</p>",
    });
  });

  it("envia só o texto quando não há HTML", () => {
    expect(
      corpoBrevo(
        { destinatario: "cliente@exemplo.com", assunto: "Oi", texto: "Olá" },
        { email: "somos@exemplo.com" },
      ),
    ).not.toHaveProperty("htmlContent");
  });
});
