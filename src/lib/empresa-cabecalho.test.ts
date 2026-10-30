import { describe, expect, it } from "vitest";

import {
  formatarTelefone,
  linhasEnderecoEmpresa,
  telefoneDe,
  textoTelefonesEmpresa,
} from "./empresa-cabecalho";

describe("cabeçalho da empresa no PDF", () => {
  it("monta o endereço em duas linhas, como no papel timbrado", () => {
    expect(
      linhasEnderecoEmpresa({
        logradouro: "Rua das Flores",
        numero: "123",
        complemento: "Sala 4",
        bairro: "Centro",
        cidade: "Sua Cidade",
        estado: "UF",
      }),
    ).toEqual(["Rua das Flores, 123, Sala 4", "Centro – Sua Cidade/UF"]);
    expect(linhasEnderecoEmpresa({ cidade: "Sua Cidade", estado: "UF" })).toEqual([
      "Sua Cidade/UF",
    ]);
    expect(linhasEnderecoEmpresa({})).toEqual([]);
  });

  it("usa os telefones como foram escritos, com o cadastro como reserva", () => {
    expect(
      textoTelefonesEmpresa({
        telefonesContato: " (11) 9 1234-5678 / 9 8765-4321 / 3333-0000 ",
        telefone: "1133330000",
      }),
    ).toBe("(11) 9 1234-5678 / 9 8765-4321 / 3333-0000");
    expect(textoTelefonesEmpresa({ whatsapp: "11912345678", telefone: "1133330000" })).toBe(
      "(11) 9 1234-5678 / (11) 3333-0000",
    );
    expect(textoTelefonesEmpresa({})).toBeNull();
  });
});

describe("telefone para exibir", () => {
  it("tira o +55 dos números gravados no formato internacional", () => {
    expect(formatarTelefone("+5586999998888")).toBe("(86) 9 9999-8888");
    expect(formatarTelefone("+558632110287")).toBe("(86) 3211-0287");
    expect(formatarTelefone("86999998888")).toBe("(86) 9 9999-8888");
  });

  it("devolve null quando não há telefone", () => {
    expect(telefoneDe(null)).toBeNull();
    expect(telefoneDe("  ")).toBeNull();
    expect(telefoneDe("+5586995222848")).toBe("(86) 9 9522-2848");
  });
});
