/** Primeira data permitida para um novo evento: amanhã, no calendário local. */
export function obterDataMinimaEvento(dataAtual = new Date()): string {
  const amanha = new Date(dataAtual);
  amanha.setDate(amanha.getDate() + 1);

  return [
    amanha.getFullYear(),
    String(amanha.getMonth() + 1).padStart(2, "0"),
    String(amanha.getDate()).padStart(2, "0"),
  ].join("-");
}

export function dataEventoEhFutura(dataEvento: string, dataAtual = new Date()): boolean {
  return dataEvento >= obterDataMinimaEvento(dataAtual);
}
