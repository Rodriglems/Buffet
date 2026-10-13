import { describe, expect, it } from "vitest";

import { createCalendarFile, createWhatsAppUrl } from "./sharing";

describe("calendar and sharing", () => {
  it("gera um calendário compatível com evento de dia inteiro", () => {
    const file = createCalendarFile({
      id: "evento-1",
      title: "Casamento João, Maria",
      date: "2026-11-15T00:00:00.000Z",
      location: "Espaço Jardim",
    });

    expect(file).toContain("DTSTART;VALUE=DATE:20261115");
    expect(file).toContain("DTEND;VALUE=DATE:20261116");
    expect(file).toContain("SUMMARY:Casamento João\\, Maria");
  });

  it("normaliza WhatsApp brasileiro e codifica a mensagem", () => {
    expect(createWhatsAppUrl("(11) 91234-5678", "Olá João")).toBe(
      "https://wa.me/5511912345678?text=Ol%C3%A1%20Jo%C3%A3o",
    );
    expect(() => createWhatsAppUrl("123", "Teste")).toThrow("WhatsApp inválido.");
  });
});
