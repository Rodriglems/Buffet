import { describe, expect, it } from "vitest";

import {
  agruparPorCategoria,
  dataBrasileira,
  montarMensagemPedidoWhatsapp,
  type PedidoWhatsapp,
} from "./mensagem-pedido-whatsapp";

const pedido: PedidoWhatsapp = {
  nome: "Melissa",
  contato: "(86) 99420-9843",
  celebracao: "Aniversário",
  convidados: 12,
  data: "2026-12-19",
  endereco: "Marechal Castelo Branco 400, Edifício LOUVRE, apto 300",
  horario: "18:00",
  itens: [
    { categoria: "Pratos principais", descricao: "Filé ao molho madeira", unidades: null },
    { categoria: "Entradas", descricao: "Coxinha de frango", unidades: 50 },
    { categoria: "Entradas", descricao: "Empadinha de frango", unidades: 50 },
    { categoria: "Volante", descricao: "Vatapá de camarão", unidades: null },
    { categoria: "Sobremesa", descricao: "Delícia de morango", unidades: null },
  ],
  ordemCategorias: new Map([
    ["Entradas", 1],
    ["Volante", 2],
    ["Pratos principais", 3],
    ["Sobremesa", 4],
  ]),
  rodape: "OBS. Será entregue tudo arrumado nas travessas.\n\nCheff Ray",
};

describe("mensagem do pedido pelo WhatsApp", () => {
  it("segue o modelo da equipe, com as categorias na ordem do cardápio", () => {
    expect(montarMensagemPedidoWhatsapp(pedido)).toBe(
      [
        "CLIENTE: Melissa",
        "CONTATO: (86) 99420-9843",
        "EVENTO: Aniversário",
        "PRA: 12 convidados",
        "DATA: 19/12/2026",
        "ENDEREÇO DE ENTREGA: Marechal Castelo Branco 400, Edifício LOUVRE, apto 300",
        "ENTREGAR: Às 18:00 horas",
        "",
        "MENU",
        "ENTRADAS",
        "Coxinha de frango 50",
        "Empadinha de frango 50",
        "",
        "VOLANTE",
        "Vatapá de camarão",
        "",
        "PRATOS PRINCIPAIS",
        "Filé ao molho madeira",
        "",
        "SOBREMESA",
        "Delícia de morango",
        "",
        "TOTAL: A definir",
        "",
        "OBS. Será entregue tudo arrumado nas travessas.",
        "",
        "Cheff Ray",
      ].join("\n"),
    );
  });

  it("sem endereço, rodapé e com observação do cliente", () => {
    const texto = montarMensagemPedidoWhatsapp({
      ...pedido,
      convidados: 1,
      endereco: "",
      cidade: null,
      rodape: "  ",
      observacoes: "Sem cebola",
    });
    expect(texto).toContain("PRA: 1 convidado\n");
    expect(texto).toContain("ENDEREÇO DE ENTREGA: A definir");
    expect(texto).toContain("OBS: Sem cebola\n\nTOTAL: A definir");
    expect(texto.endsWith("TOTAL: A definir")).toBe(true);
  });

  it("lista os adicionais marcados depois do menu", () => {
    const texto = montarMensagemPedidoWhatsapp({
      ...pedido,
      adicionais: ["Serviço de garçom", "Copos e taças"],
    });
    expect(texto).toContain(
      "Delícia de morango\n\nADICIONAIS DE INTERESSE\nServiço de garçom\nCopos e taças\n\nTOTAL: A definir",
    );
    expect(montarMensagemPedidoWhatsapp({ ...pedido, adicionais: [] })).not.toContain("ADICIONAIS");
  });

  it("junta a cidade ao endereço", () => {
    expect(
      montarMensagemPedidoWhatsapp({ ...pedido, endereco: "Rua A, 10", cidade: "Teresina" }),
    ).toContain("ENDEREÇO DE ENTREGA: Rua A, 10, Teresina");
  });

  it("categoria fora da ordem vai para o fim, em ordem alfabética", () => {
    const grupos = agruparPorCategoria(
      [
        { categoria: "Bebidas", descricao: "Suco", unidades: null },
        { categoria: "Adicionais", descricao: "Gelo", unidades: null },
        { categoria: "Entradas", descricao: "Coxinha", unidades: 100 },
      ],
      new Map([["Entradas", 1]]),
    );
    expect(grupos.map((grupo) => grupo.nome)).toEqual(["Entradas", "Adicionais", "Bebidas"]);
  });

  it("data no formato brasileiro", () => {
    expect(dataBrasileira("2026-12-19")).toBe("19/12/2026");
  });
});
