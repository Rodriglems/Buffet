import { describe, expect, it, vi } from "vitest";

import { criarConvite, hashDoConvite } from "@/features/clientes/convites.server";

describe("criarConvite", () => {
  it("gera um link que vale por 6 horas e guarda só o hash", async () => {
    const create = vi.fn().mockResolvedValue({});
    const antes = Date.now();
    const { token, expiraEm } = await criarConvite(
      { conviteCliente: { create } } as never,
      "cliente-1",
    );
    const seisHoras = 6 * 60 * 60 * 1000;
    expect(expiraEm.getTime() - antes).toBeGreaterThanOrEqual(seisHoras);
    expect(expiraEm.getTime() - antes).toBeLessThan(seisHoras + 5000);
    expect(create).toHaveBeenCalledWith({
      data: { clienteId: "cliente-1", tokenHash: hashDoConvite(token), expiraEm },
    });
  });
});
