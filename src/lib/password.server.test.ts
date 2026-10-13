import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "./password.server";

describe("password hashing", () => {
  it("gera salt por senha e valida sem armazenar texto puro", async () => {
    const first = await hashPassword("uma-senha-segura");
    const second = await hashPassword("uma-senha-segura");

    expect(first).not.toBe(second);
    expect(first).not.toContain("uma-senha-segura");
    await expect(verifyPassword("uma-senha-segura", first)).resolves.toBe(true);
    await expect(verifyPassword("senha-incorreta", first)).resolves.toBe(false);
  });
});
