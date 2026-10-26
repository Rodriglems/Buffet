import { describe, expect, it } from "vitest";

import { acaoDaEtapa } from "./status-evento";

describe("acaoDaEtapa", () => {
  it("mostra um único botão por etapa, na ordem do fluxo", () => {
    expect(acaoDaEtapa("ORCAMENTO")?.rotulo).toBe("Aprovar");
    expect(acaoDaEtapa("APROVADO")?.rotulo).toBe("Pagamento");
    expect(acaoDaEtapa("PAGAMENTO")?.rotulo).toBe("Confirmar");
    expect(acaoDaEtapa("CONFIRMADO")?.rotulo).toBe("Finalizar");
  });

  it("não oferece ação para eventos encerrados ou status desconhecidos", () => {
    expect(acaoDaEtapa("FINALIZADO")).toBeNull();
    expect(acaoDaEtapa("CANCELADO")).toBeNull();
    expect(acaoDaEtapa("QUALQUER")).toBeNull();
  });
});
