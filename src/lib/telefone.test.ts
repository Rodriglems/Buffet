import { describe, expect, it } from "vitest";

import { chaveDoTelefone, digitosDoTelefone, mesmoTelefone } from "@/lib/telefone";

describe("telefone", () => {
  it("remove máscara e código do país", () => {
    expect(digitosDoTelefone("(11) 91234-5678")).toBe("11912345678");
    expect(digitosDoTelefone("+5511912345678")).toBe("11912345678");
  });

  it("não confunde DDD 55 com o código do país", () => {
    expect(digitosDoTelefone("(55) 91234-5678")).toBe("55912345678");
  });

  it("reconhece o mesmo número em formatos diferentes", () => {
    expect(mesmoTelefone("+5511912345678", "(11) 91234-5678")).toBe(true);
    expect(mesmoTelefone("11912345678", "1112345678")).toBe(true);
    expect(mesmoTelefone("11912345678", "11912345679")).toBe(false);
  });

  it("ignora números vazios ou curtos", () => {
    expect(chaveDoTelefone("123")).toBe("");
    expect(mesmoTelefone(null, null)).toBe(false);
    expect(mesmoTelefone("123", "123")).toBe(false);
  });
});
