import { describe, expect, it } from "vitest";

import {
  caminhoFormularioPublico,
  destinoFormularioPublico,
  origemFormularioPublico,
  urlFormularioPublico,
} from "@/lib/formulario-publico-url.server";

describe("URL pública do formulário", () => {
  it("prioriza e normaliza o domínio exclusivo", () => {
    expect(urlFormularioPublico("https://cardapio.requinte.test/", "https://mesly.test")).toBe(
      "https://cardapio.requinte.test/orcamento",
    );
  });

  it("usa APP_URL enquanto o domínio exclusivo não foi configurado", () => {
    expect(origemFormularioPublico("", "https://mesly.test/")).toBe("https://mesly.test");
    expect(urlFormularioPublico("", "https://mesly.test")).toBe("https://mesly.test/orcamento");
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

  it("usa um caminho curto sem expor o token", () => {
    expect(caminhoFormularioPublico()).toBe("/orcamento");
  });

  it("leva o link antigo ao domínio oficial e preserva os parâmetros", () => {
    expect(
      destinoFormularioPublico(
        "https://mesly.test/solicitar-orcamento/token?origem=instagram",
        "https://cardapio.requinte.test",
      ),
    ).toBe("https://cardapio.requinte.test/orcamento?origem=instagram");
  });

  it("leva o link antigo do mesmo domínio ao caminho curto", () => {
    expect(
      destinoFormularioPublico(
        "https://cardapio.requinte.test/solicitar-orcamento/token",
        "https://cardapio.requinte.test",
      ),
    ).toBe("https://cardapio.requinte.test/orcamento");
  });

  it("usa a origem atual quando nenhuma URL foi configurada", () => {
    expect(destinoFormularioPublico("https://mesly.test/solicitar-orcamento/token", "")).toBe(
      "https://mesly.test/orcamento",
    );
  });

  it("não redireciona o caminho curto nem outras rotas", () => {
    expect(
      destinoFormularioPublico(
        "https://cardapio.requinte.test/orcamento",
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
