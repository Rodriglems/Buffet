import { describe, expect, it } from "vitest";

import {
  chaveDaData,
  dataEstaBloqueada,
  MENSAGEM_DATA_BLOQUEADA,
  resumoDatasBloqueadas,
} from "@/features/eventos/datas-bloqueadas";

describe("chaveDaData", () => {
  it("usa AAAA-MM-DD da data guardada no banco (meia-noite UTC)", () => {
    expect(chaveDaData(new Date("2026-12-25T00:00:00.000Z"))).toBe("2026-12-25");
  });

  it("aceita o texto do campo de data", () => {
    expect(chaveDaData("2026-12-25")).toBe("2026-12-25");
  });
});

describe("dataEstaBloqueada", () => {
  const bloqueadas = ["2026-12-24", "2026-12-25"];

  it("acusa uma data bloqueada", () => {
    expect(dataEstaBloqueada("2026-12-25", bloqueadas)).toBe(true);
  });

  it("libera uma data livre e o campo vazio", () => {
    expect(dataEstaBloqueada("2026-12-26", bloqueadas)).toBe(false);
    expect(dataEstaBloqueada("", bloqueadas)).toBe(false);
  });
});

describe("resumoDatasBloqueadas", () => {
  it("lista as próximas datas em formato brasileiro", () => {
    expect(resumoDatasBloqueadas(["2026-12-24", "2026-12-25", "2026-12-31"], 2026)).toBe(
      "24/12, 25/12 e 31/12",
    );
  });

  it("mostra o ano quando a data não é do ano corrente", () => {
    expect(resumoDatasBloqueadas(["2027-01-01"], 2026)).toBe("01/01/2027");
  });

  it("resume quando há muitas datas", () => {
    expect(
      resumoDatasBloqueadas(
        [
          "2026-12-01",
          "2026-12-02",
          "2026-12-03",
          "2026-12-04",
          "2026-12-05",
          "2026-12-06",
          "2026-12-07",
        ],
        2026,
        5,
      ),
    ).toBe("01/12, 02/12, 03/12, 04/12, 05/12 e mais 2 datas");
  });

  it("devolve vazio sem datas", () => {
    expect(resumoDatasBloqueadas([])).toBe("");
  });
});

describe("MENSAGEM_DATA_BLOQUEADA", () => {
  it("não revela o motivo interno do bloqueio", () => {
    expect(MENSAGEM_DATA_BLOQUEADA).toBe("Esta data não está mais disponível. Escolha outra data.");
  });
});
