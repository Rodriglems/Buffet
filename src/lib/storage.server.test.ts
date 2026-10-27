import { describe, expect, it } from "vitest";

import { detectarTipoImagem } from "./storage.server";

const bytes = (...valores: number[]) => new Uint8Array(valores);
const texto = (valor: string) => [...valor].map((letra) => letra.charCodeAt(0));

describe("detectarTipoImagem", () => {
  it("reconhece PNG, JPEG e WebP pelo conteúdo", () => {
    expect(detectarTipoImagem(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe(
      "image/png",
    );
    expect(detectarTipoImagem(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(detectarTipoImagem(bytes(...texto("RIFF"), 0, 0, 0, 0, ...texto("WEBP")))).toBe(
      "image/webp",
    );
  });

  it("recusa arquivos que não são imagens aceitas", () => {
    expect(detectarTipoImagem(bytes(...texto("<svg onload=alert(1)>")))).toBeNull();
    expect(detectarTipoImagem(bytes(...texto("GIF89a")))).toBeNull();
    expect(detectarTipoImagem(bytes())).toBeNull();
  });
});
