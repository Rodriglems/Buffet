import { normalizarBusca } from "@/features/orcamentos/formulario-publico";
import { formatBRL } from "@/lib/format";

type ItemBasico = { id: string; nome: string; categoria: string; cardapios: string[] };

const chaveDoNome = (nome: string) => normalizarBusca(nome.trim().replace(/\s+/g, " "));

/**
 * Item já cadastrado com o mesmo nome (sem diferenciar maiúsculas, acentos e espaços), para
 * avisar enquanto a pessoa digita e levá-la ao item existente em vez de duplicá-lo.
 */
export function itemComMesmoNome<T extends ItemBasico>(
  itens: T[],
  nome: string,
  ignorarId: string | null,
): T | null {
  const chave = chaveDoNome(nome);
  if (!chave) return null;
  return itens.find((item) => item.id !== ignorarId && chaveDoNome(item.nome) === chave) ?? null;
}

const palavras = (texto: string) => chaveDoNome(texto).split(" ").filter(Boolean);

/**
 * Itens com nome parecido com o que está sendo digitado, para a pessoa perceber que o prato
 * já existe com outro nome. Só palavras de 4 letras ou mais contam ("com", "de" não). Palavras
 * raras pesam mais: em "arroz com farofa", "farofa" (poucos itens) diferencia mais que "arroz"
 * (dezenas). No empate, vem quem tem mais palavras em comum no total.
 */
export function itensParecidos<T extends ItemBasico>(
  itens: T[],
  nome: string,
  ignorarId: string | null,
  limite = 5,
): T[] {
  const digitadas = palavras(nome);
  const importantes = digitadas.filter((palavra) => palavra.length >= 4);
  if (!importantes.length) return [];
  const chave = chaveDoNome(nome);
  const candidatos = itens
    .filter((item) => item.id !== ignorarId && chaveDoNome(item.nome) !== chave)
    .map((item) => ({ item, palavras: palavras(item.nome) }));
  // Peso de cada palavra: 1 ÷ quantos itens a contêm.
  const peso = new Map(
    importantes.map((palavra) => [
      palavra,
      1 / Math.max(1, candidatos.filter((c) => c.palavras.join(" ").includes(palavra)).length),
    ]),
  );
  return candidatos
    .map(({ item, palavras: doItem }) => {
      const textoDoItem = doItem.join(" ");
      return {
        item,
        pontos: importantes
          .filter((palavra) => textoDoItem.includes(palavra))
          .reduce((soma, palavra) => soma + (peso.get(palavra) ?? 0), 0),
        emComum: digitadas.filter((palavra) => doItem.includes(palavra)).length,
      };
    })
    .filter((candidato) => candidato.pontos > 0)
    .sort(
      (a, b) =>
        b.pontos - a.pontos ||
        b.emComum - a.emComum ||
        a.item.nome.localeCompare(b.item.nome, "pt-BR"),
    )
    .slice(0, limite)
    .map((candidato) => candidato.item);
}

/** Mensagem do servidor quando o nome já existe, dizendo onde está o item. */
export function mensagemNomeRepetido(existente: {
  nome: string;
  categoria: string;
  ativo: boolean;
}): string {
  const situacao = existente.ativo ? "" : " (inativo)";
  return `Já existe “${existente.nome}” na categoria ${existente.categoria}${situacao}. Para colocá-lo em outro cardápio, edite esse item e marque o cardápio.`;
}

/** O que muda num cardápio ao salvar a lista de itens escolhida na tela "Escolher itens". */
export function alteracoesDoCardapio(
  itens: ItemBasico[],
  cardapio: string,
  selecionados: string[],
): { adicionar: string[]; remover: string[] } {
  const escolhidos = new Set(selecionados);
  const adicionar = itens
    .filter((item) => escolhidos.has(item.id) && !item.cardapios.includes(cardapio))
    .map((item) => item.id);
  const remover = itens
    .filter((item) => !escolhidos.has(item.id) && item.cardapios.includes(cardapio))
    .map((item) => item.id);
  return { adicionar, remover };
}

/** Unidades já usadas no cardápio, da mais comum para a menos comum (sugestões de um toque). */
export function unidadesMaisUsadas(itens: { unidade: string }[], limite = 5): string[] {
  const contagem = new Map<string, { texto: string; vezes: number }>();
  for (const { unidade } of itens) {
    const texto = unidade.trim();
    if (!texto) continue;
    const chave = texto.toLowerCase();
    const atual = contagem.get(chave);
    contagem.set(chave, { texto: atual?.texto ?? texto, vezes: (atual?.vezes ?? 0) + 1 });
  }
  return [...contagem.values()]
    .sort((a, b) => b.vezes - a.vezes || a.texto.localeCompare(b.texto, "pt-BR"))
    .slice(0, limite)
    .map((item) => item.texto);
}

/** O que o cliente vê no formulário de orçamento para este preço. */
export function previaDoPreco(valor: number, unidade: string, visivel: boolean): string {
  if (valor <= 0) return "Sob consulta";
  if (!visivel) return "Preço escondido: aparece só no orçamento";
  return `${formatBRL(valor)} / ${unidade.trim() || "unidade"}`;
}

/** "nenhum item", "1 item", "181 itens": no lugar de "181 item(ns)". */
export function contagem(quantidade: number, singular: string, plural: string): string {
  if (quantidade === 0) return `nenhum ${singular}`;
  return `${quantidade} ${quantidade === 1 ? singular : plural}`;
}

/** Texto do campo de preço: vazio quando o valor é "sob consulta" (guardado como 0). */
export function textoDoPreco(valor: number): string {
  return valor > 0 ? String(valor).replace(".", ",") : "";
}
