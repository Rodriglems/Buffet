/**
 * Datas que a equipe bloqueia para o formulário público de orçamento (feriado, folga, data já
 * fechada). O motivo do bloqueio é interno: o cliente só vê que a data está indisponível.
 */

export const MENSAGEM_DATA_BLOQUEADA = "Esta data não está mais disponível. Escolha outra data.";

/** AAAA-MM-DD: datas do banco (coluna date, meia-noite UTC) ou o texto do campo de data. */
export function chaveDaData(data: Date | string): string {
  return typeof data === "string" ? data.slice(0, 10) : data.toISOString().slice(0, 10);
}

export function dataEstaBloqueada(data: string, bloqueadas: readonly string[]): boolean {
  return Boolean(data) && bloqueadas.includes(chaveDaData(data));
}

/** "24/12, 25/12 e 31/12" — o ano só aparece quando não é o corrente. */
export function resumoDatasBloqueadas(
  datas: readonly string[],
  anoAtual = new Date().getFullYear(),
  limite = 6,
): string {
  if (!datas.length) return "";
  const formatar = (data: string) => {
    const [ano, mes, dia] = data.split("-");
    return Number(ano) === anoAtual ? `${dia}/${mes}` : `${dia}/${mes}/${ano}`;
  };
  const visiveis = datas.slice(0, limite).map(formatar);
  const restantes = datas.length - visiveis.length;
  if (restantes > 0) {
    return `${visiveis.join(", ")} e mais ${restantes} ${restantes === 1 ? "data" : "datas"}`;
  }
  if (visiveis.length === 1) return visiveis[0] ?? "";
  return `${visiveis.slice(0, -1).join(", ")} e ${visiveis[visiveis.length - 1]}`;
}
