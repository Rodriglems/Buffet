import { describe, expect, it } from "vitest";

import { criarLimitador } from "./limite-taxa";

describe("criarLimitador", () => {
  it("bloqueia acima do máximo e libera quando a janela passa", () => {
    const permitir = criarLimitador(2, 1_000);
    expect(permitir("ip-1", 0)).toBe(true);
    expect(permitir("ip-1", 100)).toBe(true);
    expect(permitir("ip-1", 200)).toBe(false);
    expect(permitir("ip-2", 200)).toBe(true);
    expect(permitir("ip-1", 1_000)).toBe(true);
  });
});
