import { describe, expect, it } from "vitest";

import {
  caminhoFormularioPublico,
  destinoFormularioPublico,
  origemFormularioPublico,
  urlFormularioPublico,
} from "@/lib/formulario-publico-url.server";

describe("URL pública do formulário", () => {
  it("prioriza e normaliza o domínio exclusivo", () => {
    expect(
      urlFormularioPublico(
        "57be70d9-5fc7-4d2a-b537-7def494b699c",
        "https://cardapio.requinte.test/",
        "https://mesly.test",
      ),
    ).toBe(
      "https://cardapio.requinte.test/solicitar-orcamento/57be70d9-5fc7-4d2a-b537-7def494b699c",
    );
  });

  it("usa APP_URL enquanto o domínio exclusivo não foi configurado", () => {
    expect(origemFormularioPublico("", "https://mesly.test/")).toBe("https://mesly.test");
    expect(urlFormularioPublico("token", "", "https://mesly.test")).toBe(
      "https://mesly.test/solicitar-orcamento/token",
    );
  });

  it("permite HTTP somente no ambiente local", () => {
    expect(origemFormularioPublico("http://localhost:3000", undefined)).toBe(
      "http://localhost:3000",
    );
    expect(() => origemFormularioPublico("http://cardapio.test", undefined)).toThrow(
      "deve usar HTTPS",
    );
  });

  it.each([
    "https://usuario:senha@cardapio.test",
    "https://cardapio.test/cardapio",
    "https://cardapio.test?empresa=1",
    "https://cardapio.test#inicio",
  ])("recusa configuração ambígua ou insegura: %s", (configurado) => {
    expect(() => origemFormularioPublico(configurado, undefined)).toThrow();
  });

  it("codifica o token ao montar o caminho", () => {
    expect(caminhoFormularioPublico("token com/barra")).toBe(
      "/solicitar-orcamento/token%20com%2Fbarra",
    );
  });

  it("leva o link antigo ao domínio oficial e preserva os parâmetros", () => {
    expect(
      destinoFormularioPublico(
        "https://mesly.test/solicitar-orcamento/token?origem=instagram",
        "https://cardapio.requinte.test",
      ),
    ).toBe("https://cardapio.requinte.test/solicitar-orcamento/token?origem=instagram");
  });

  it("não redireciona o domínio oficial nem outras rotas", () => {
    expect(
      destinoFormularioPublico(
        "https://cardapio.requinte.test/solicitar-orcamento/token",
        "https://cardapio.requinte.test",
      ),
    ).toBeNull();
    expect(
      destinoFormularioPublico(
        "https://mesly.test/admin/orcamentos",
        "https://cardapio.requinte.test",
      ),
    ).toBeNull();
  });
});
