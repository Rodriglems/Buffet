/**
 * Mensagem do pedido que o cliente manda para o WhatsApp da empresa quando o formulário está no
 * modo "Pedido pelo WhatsApp" (sem conta nem portal do cliente). Segue o modelo que a equipe
 * já usa no atendimento:
 *
 *   CLIENTE: Melissa
 *   CONTATO: (86) 99420-9843
 *   PRA: 12 convidados
 *   DATA: 19/12/2026
 *   ENDEREÇO DE ENTREGA: Marechal Castelo Branco 400
 *   ENTREGAR: Às 18:00 horas
 *
 *   MENU
 *   ENTRADAS
 *   Coxinha de frango 50
 *
 *   TOTAL: A definir
 *
 *   (texto final configurado pela empresa)
 */

export type ItemPedidoWhatsapp = {
  categoria: string;
  descricao: string;
  /** Unidades dos itens vendidos por cento (meio cento = 50); null nos demais. */
  unidades: number | null;
};

export type PedidoWhatsapp = {
  nome: string;
  contato: string;
  /** Tipo de celebração (Casamento, Aniversário...). */
  celebracao?: string | null;
  convidados: number;
  /** AAAA-MM-DD. */
  data: string;
  endereco?: string | null;
  cidade?: string | null;
  /** HH:MM. */
  horario: string;
  itens: ItemPedidoWhatsapp[];
  /** Ordem das categorias no cardápio; categoria fora do mapa vai para o fim. */
  ordemCategorias?: ReadonlyMap<string, number>;
  /** Adicionais que o cliente marcou (copeira, louças, garçom...). */
  adicionais?: readonly string[];
  observacoes?: string | null;
  /** Texto final da empresa (ex.: "OBS. Será entregue tudo arrumado nas travessas."). */
  rodape?: string | null;
};

const limpar = (texto: string | null | undefined) => texto?.trim() ?? "";

/** AAAA-MM-DD → DD/MM/AAAA. */
export function dataBrasileira(data: string): string {
  const [ano, mes, dia] = data.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

/** Itens agrupados por categoria, na ordem do cardápio (e, empatando, em ordem alfabética). */
export function agruparPorCategoria(
  itens: readonly ItemPedidoWhatsapp[],
  ordem: ReadonlyMap<string, number> = new Map(),
) {
  const grupos = new Map<string, ItemPedidoWhatsapp[]>();
  for (const item of itens) {
    grupos.set(item.categoria, [...(grupos.get(item.categoria) ?? []), item]);
  }
  return [...grupos.entries()]
    .sort(
      ([a], [b]) =>
        (ordem.get(a) ?? Number.MAX_SAFE_INTEGER) - (ordem.get(b) ?? Number.MAX_SAFE_INTEGER) ||
        a.localeCompare(b, "pt-BR"),
    )
    .map(([nome, doGrupo]) => ({ nome, itens: doGrupo }));
}

export function montarMensagemPedidoWhatsapp(pedido: PedidoWhatsapp): string {
  const endereco = [limpar(pedido.endereco), limpar(pedido.cidade)].filter(Boolean).join(", ");
  const cabecalho = [
    `CLIENTE: ${limpar(pedido.nome)}`,
    `CONTATO: ${limpar(pedido.contato)}`,
    limpar(pedido.celebracao) ? `EVENTO: ${limpar(pedido.celebracao)}` : null,
    `PRA: ${pedido.convidados} ${pedido.convidados === 1 ? "convidado" : "convidados"}`,
    `DATA: ${dataBrasileira(pedido.data)}`,
    `ENDEREÇO DE ENTREGA: ${endereco || "A definir"}`,
    `ENTREGAR: Às ${pedido.horario} horas`,
  ]
    .filter((linha): linha is string => Boolean(linha))
    .join("\n");

  const menu = agruparPorCategoria(pedido.itens, pedido.ordemCategorias)
    .map(({ nome, itens }) =>
      [
        nome.toLocaleUpperCase("pt-BR"),
        ...itens.map((item) =>
          item.unidades ? `${item.descricao} ${item.unidades}` : item.descricao,
        ),
      ].join("\n"),
    )
    .join("\n\n");

  const observacoes = limpar(pedido.observacoes);
  const rodape = limpar(pedido.rodape);
  const adicionais = (pedido.adicionais ?? []).map(limpar).filter(Boolean);
  return [
    cabecalho,
    `MENU\n${menu}`,
    adicionais.length ? `ADICIONAIS DE INTERESSE\n${adicionais.join("\n")}` : null,
    // "Algum detalhe importante?" do formulário; só entra quando o cliente escreve algo.
    observacoes ? `OBS: ${observacoes}` : null,
    "TOTAL: A definir",
    rodape || null,
  ]
    .filter((bloco): bloco is string => Boolean(bloco))
    .join("\n\n");
}
