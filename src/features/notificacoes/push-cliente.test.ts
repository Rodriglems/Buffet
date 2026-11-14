import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.hoisted(() => ({
  removerInscricaoPush: vi.fn(),
}));

vi.mock("@/features/notificacoes/push", () => ({
  obterChavePush: vi.fn(),
  removerInscricaoPush: push.removerInscricaoPush,
  salvarInscricaoPush: vi.fn(),
}));

import { desvincularPushAoSair } from "@/features/notificacoes/push-cliente";

function prepararNavegador() {
  const unsubscribe = vi.fn().mockResolvedValue(true);
  const inscricao = { endpoint: "https://fcm.googleapis.com/fcm/send/teste", unsubscribe };
  vi.stubGlobal("navigator", {
    serviceWorker: {
      getRegistration: vi.fn().mockResolvedValue({
        pushManager: { getSubscription: vi.fn().mockResolvedValue(inscricao) },
      }),
    },
  });

  const valores = new Map<string, string>([["mesly-push-ativado", "1"]]);
  vi.stubGlobal("localStorage", {
    getItem: vi.fn((chave: string) => valores.get(chave) ?? null),
    setItem: vi.fn((chave: string, valor: string) => valores.set(chave, valor)),
    removeItem: vi.fn((chave: string) => valores.delete(chave)),
  });
  return { inscricao, unsubscribe };
}

describe("push ao sair da conta", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("desvincula a conta sem cancelar a inscrição nem esquecer a preferência", async () => {
    const { inscricao, unsubscribe } = prepararNavegador();
    push.removerInscricaoPush.mockResolvedValue({ ok: true });

    await desvincularPushAoSair();

    expect(push.removerInscricaoPush).toHaveBeenCalledWith({
      data: { endpoint: inscricao.endpoint },
    });
    expect(unsubscribe).not.toHaveBeenCalled();
    expect(localStorage.getItem("mesly-push-ativado")).toBe("1");
  });

  it("cancela localmente se o servidor não puder proteger a conta anterior", async () => {
    const { unsubscribe } = prepararNavegador();
    push.removerInscricaoPush.mockRejectedValue(new Error("indisponível"));

    await expect(desvincularPushAoSair()).rejects.toThrow("indisponível");

    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(localStorage.getItem("mesly-push-ativado")).toBeNull();
  });
});
