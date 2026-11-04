import { describe, expect, it } from "vitest";

import { enderecoPushPermitido } from "@/lib/push-endereco";

describe("enderecoPushPermitido", () => {
  it("aceita os serviços oficiais de push", () => {
    expect(enderecoPushPermitido("https://fcm.googleapis.com/fcm/send/abc")).toBe(true);
    expect(enderecoPushPermitido("https://web.push.apple.com/abc")).toBe(true);
    expect(enderecoPushPermitido("https://updates.push.services.mozilla.com/wpush/v2/a")).toBe(
      true,
    );
    expect(enderecoPushPermitido("https://wns2-par02p.notify.windows.com/w/?token=a")).toBe(true);
  });

  it("recusa outros destinos", () => {
    expect(enderecoPushPermitido("https://exemplo.com/push")).toBe(false);
    expect(enderecoPushPermitido("https://localhost/push")).toBe(false);
    expect(enderecoPushPermitido("https://169.254.169.254/latest/meta-data")).toBe(false);
    expect(enderecoPushPermitido("https://push.apple.com.exemplo.com/a")).toBe(false);
    expect(enderecoPushPermitido("https://exemplonotify.windows.com/a")).toBe(false);
  });

  it("recusa endereços sem HTTPS, com porta ou credenciais", () => {
    expect(enderecoPushPermitido("http://fcm.googleapis.com/fcm/send/a")).toBe(false);
    expect(enderecoPushPermitido("https://fcm.googleapis.com:8443/a")).toBe(false);
    expect(enderecoPushPermitido("https://user:senha@fcm.googleapis.com/a")).toBe(false);
    expect(enderecoPushPermitido("não é um endereço")).toBe(false);
  });
});
