export const TIPOS_EVENTO = [
  "Casamento",
  "Aniversário adulto",
  "Aniversário infantil",
  "Formatura",
  "Confraternização",
  "Batizado",
  "Primeira Eucaristia",
  "Reunião entre amigos",
  "Corporativo",
  "Outros",
] as const;

export const FORMATOS_SERVICO = [
  "Café da manhã",
  "Coffee break",
  "Brunch",
  "Almoço",
  "Jantar",
  "Feijoada completa",
  "Coquetel e finger foods",
  "Botequim",
  "Festival de massas",
  "Comidas para congelamento",
  "Outro formato",
] as const;

export const CARDAPIOS = [
  "Buffet para almoço e jantar",
  "Café da manhã, coffee break e brunch",
  "Salgadinhos e finger foods",
  "Massas e lasanhas",
  "Botequim",
  "Sobremesas",
  "Congelados e encomendas",
] as const;

export const SERVICOS_ADICIONAIS = [
  "Copeira para acompanhar e organizar as comidas",
  "Louças: pratos, talheres, pratinhos, garfinhos e colheres",
  "Copos e taças",
  "Serviço de garçom",
] as const;

export const CATEGORIAS_CARDAPIO = [
  "Entradas e cremes",
  "Salgadinhos tradicionais",
  "Salgadinhos finos",
  "Finger foods",
  "Carnes bovinas",
  "Aves",
  "Suínos e ovinos",
  "Pratos regionais",
  "Peixes e frutos do mar",
  "Saladas",
  "Risotos",
  "Arroz",
  "Acompanhamentos",
  "Massas recheadas",
  "Massas não recheadas",
  "Recheios para massas",
  "Molhos",
  "Lasanhas",
  "Empadões e escondidinhos",
  "Quiches e tortas salgadas",
  "Tranças e mini pizzas",
  "Sanduíches, hambúrgueres e wraps",
  "Pães, patês, antepastos e terrines",
  "Sabores do mundo",
  "Bolos, cuscuz e beijus",
  "Bebidas",
  "Frutas",
  "Comida de botequim",
  "Pratos quentes",
  "Sobremesas",
  "Congelados",
  "Caldos e sopas",
  "Equipe e estrutura",
  "Outros",
] as const;

export type TipoEvento = (typeof TIPOS_EVENTO)[number];
export type FormatoServico = (typeof FORMATOS_SERVICO)[number];
export type Cardapio = (typeof CARDAPIOS)[number];
export type ServicoAdicional = (typeof SERVICOS_ADICIONAIS)[number];
export type CategoriaCardapio = (typeof CATEGORIAS_CARDAPIO)[number];

export const CARDAPIOS_POR_FORMATO: Record<FormatoServico, Cardapio[]> = {
  "Café da manhã": ["Café da manhã, coffee break e brunch"],
  "Coffee break": ["Café da manhã, coffee break e brunch"],
  Brunch: ["Café da manhã, coffee break e brunch"],
  Almoço: ["Buffet para almoço e jantar", "Sobremesas"],
  Jantar: ["Buffet para almoço e jantar", "Sobremesas"],
  "Feijoada completa": ["Buffet para almoço e jantar", "Sobremesas"],
  "Coquetel e finger foods": ["Salgadinhos e finger foods", "Sobremesas"],
  Botequim: ["Botequim", "Sobremesas"],
  "Festival de massas": ["Massas e lasanhas", "Sobremesas"],
  "Comidas para congelamento": ["Congelados e encomendas"],
  "Outro formato": [...CARDAPIOS],
};
