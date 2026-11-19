/**
 * Escolhas que o cliente faz dentro de um item do cardápio, em grupos: uma massa pode pedir o
 * "Recheio" e o "Molho". Cada grupo tem um nome (o que o cliente lê) e os itens que servem de
 * opção. O cliente escolhe uma opção de cada grupo.
 */
export type GrupoOpcoes = { nome: string; ids: string[] };

/** Nome usado quando a equipe não deu nome ao grupo. */
export const NOME_GRUPO_PADRAO = "Opção";

/** Quantos grupos um item pode ter (ex.: recheio, molho, acompanhamento). */
export const MAXIMO_GRUPOS = 4;

/** Junta as opções salvas (uma linha por opção) em grupos, na ordem dos grupos. */
export function agruparOpcoes(
  opcoes: { opcaoId: string; grupo: string; grupoOrdem: number }[],
): GrupoOpcoes[] {
  const ordenadas = [...opcoes].sort((a, b) => a.grupoOrdem - b.grupoOrdem);
  const grupos: GrupoOpcoes[] = [];
  for (const opcao of ordenadas) {
    const nome = opcao.grupo.trim() || NOME_GRUPO_PADRAO;
    const grupo = grupos.find((atual) => atual.nome === nome);
    if (grupo) grupo.ids.push(opcao.opcaoId);
    else grupos.push({ nome, ids: [opcao.opcaoId] });
  }
  return grupos;
}

/**
 * Grupos prontos para salvar: sem grupos vazios, nome padrão quando em branco e cada opção em um
 * grupo só. Erro quando dois grupos têm o mesmo nome (o cliente não saberia qual é qual).
 */
export function gruposParaSalvar(grupos: GrupoOpcoes[]): GrupoOpcoes[] {
  const usados = new Set<string>();
  const limpos = grupos
    .map((grupo) => ({
      nome: grupo.nome.trim() || NOME_GRUPO_PADRAO,
      ids: [...new Set(grupo.ids)].filter((id) => {
        if (usados.has(id)) return false;
        usados.add(id);
        return true;
      }),
    }))
    .filter((grupo) => grupo.ids.length);
  const nomes = limpos.map((grupo) => grupo.nome.toLocaleLowerCase("pt-BR"));
  if (new Set(nomes).size !== nomes.length) {
    throw new Error("Use um nome diferente para cada escolha (ex.: Recheio e Molho).");
  }
  return limpos;
}

/** Grupos cujas opções ainda não foram escolhidas pelo cliente. */
export function gruposSemEscolha(
  grupos: { nome: string; ids: string[] }[],
  escolhas: Record<string, string> | undefined,
): string[] {
  return grupos
    .filter((grupo) => !grupo.ids.includes(escolhas?.[grupo.nome] ?? ""))
    .map((grupo) => grupo.nome);
}

/** "o recheio", "o recheio e o molho", "o recheio, o molho e o sabor". */
export function listaDeEscolhas(nomes: string[]): string {
  const partes = nomes.map((nome) => `o ${nome.toLocaleLowerCase("pt-BR")}`);
  if (partes.length <= 1) return partes[0] ?? "";
  return `${partes.slice(0, -1).join(", ")} e ${partes[partes.length - 1]}`;
}
