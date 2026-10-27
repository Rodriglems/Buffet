import { CATEGORIAS_CARDAPIO } from "../src/lib/catalogo.ts";
import { consolidarCardapio } from "./catalogo-chef-ray.mjs";

/**
 * Cria (ou atualiza) a empresa, o cardápio padrão e o administrador.
 * Usado pelo seed manual e pela instalação inicial automática do servidor.
 */
export async function popularBanco(prisma, { email, senhaHash }) {
  await prisma.$transaction(async (tx) => {
    const empresa = await tx.empresa.upsert({
      where: { cnpj: "00000000000000" },
      update: { nomeFantasia: "Mesly Buffet & Eventos" },
      create: {
        razaoSocial: "Buffet Demonstracao LTDA",
        nomeFantasia: "Mesly Buffet & Eventos",
        cnpj: "00000000000000",
        email,
      },
    });

    const cardapioLegado = [
      {
        nome: "Mesa de frios",
        categoria: "Entradas",
        descricao: "Queijos, embutidos, frutas, pães e antepastos.",
        unidade: "por pessoa",
        precoBase: 38,
        tiposEvento: [],
      },
      {
        nome: "Canapés finos",
        categoria: "Entradas",
        descricao: "Seleção de canapés frios e quentes.",
        unidade: "por pessoa",
        precoBase: 32,
        tiposEvento: ["Casamento", "Formatura", "Corporativo"],
      },
      {
        nome: "Salgadinhos variados",
        categoria: "Entradas",
        descricao: "Coxinha, quibe, bolinha de queijo e opções assadas.",
        unidade: "por pessoa",
        precoBase: 24,
        tiposEvento: ["Aniversário", "Confraternização"],
      },
      {
        nome: "Jantar empratado",
        categoria: "Pratos principais",
        descricao: "Menu completo servido à mesa com duas opções de proteína.",
        unidade: "por pessoa",
        precoBase: 89,
        tiposEvento: ["Casamento", "Formatura"],
      },
      {
        nome: "Buffet infantil",
        categoria: "Pratos principais",
        descricao: "Mini-pizzas, cachorro-quente, mini-hambúrguer e batata.",
        unidade: "por pessoa",
        precoBase: 48,
        tiposEvento: ["Aniversário"],
      },
      {
        nome: "Coquetel corporativo",
        categoria: "Pratos principais",
        descricao: "Finger foods e porções individuais para eventos empresariais.",
        unidade: "por pessoa",
        precoBase: 65,
        tiposEvento: ["Corporativo"],
      },
      {
        nome: "Churrasco completo",
        categoria: "Pratos principais",
        descricao: "Carnes, linguiças, pão de alho e guarnições.",
        unidade: "por pessoa",
        precoBase: 72,
        tiposEvento: ["Aniversário", "Confraternização"],
      },
      {
        nome: "Arroz especial",
        categoria: "Acompanhamentos",
        descricao: "Arroz branco ou preparado conforme o menu escolhido.",
        unidade: "por pessoa",
        precoBase: 12,
        tiposEvento: [],
      },
      {
        nome: "Saladas variadas",
        categoria: "Acompanhamentos",
        descricao: "Folhas, legumes, molhos e complementos.",
        unidade: "por pessoa",
        precoBase: 10,
        tiposEvento: [],
      },
      {
        nome: "Doces finos",
        categoria: "Sobremesas",
        descricao: "Seleção de doces tradicionais e gourmet.",
        unidade: "por pessoa",
        precoBase: 18,
        tiposEvento: ["Casamento", "Formatura"],
      },
      {
        nome: "Bolo personalizado",
        categoria: "Sobremesas",
        descricao: "Bolo decorado de acordo com o tema do evento.",
        unidade: "por evento",
        precoBase: 450,
        tiposEvento: ["Casamento", "Aniversário"],
      },
      {
        nome: "Sobremesas em taças",
        categoria: "Sobremesas",
        descricao: "Mousses, pavês e sobremesas individuais.",
        unidade: "por pessoa",
        precoBase: 16,
        tiposEvento: ["Casamento", "Formatura", "Corporativo"],
      },
      {
        nome: "Água, sucos e refrigerantes",
        categoria: "Bebidas",
        descricao: "Bebidas não alcoólicas durante todo o evento.",
        unidade: "por pessoa",
        precoBase: 14,
        tiposEvento: [],
      },
      {
        nome: "Open bar",
        categoria: "Bebidas",
        descricao: "Drinks clássicos, cerveja e equipe de bartenders.",
        unidade: "por pessoa",
        precoBase: 55,
        tiposEvento: ["Casamento", "Formatura", "Confraternização"],
      },
    ];

    const cardapio = consolidarCardapio();
    const nomesAtuais = new Set(cardapio.map((item) => item.nome));
    await tx.servico.updateMany({
      where: {
        empresaId: empresa.id,
        nome: {
          in: cardapioLegado.map((item) => item.nome).filter((nome) => !nomesAtuais.has(nome)),
        },
      },
      data: { ativo: false },
    });

    for (const item of cardapio) {
      await tx.servico.upsert({
        where: { empresaId_nome: { empresaId: empresa.id, nome: item.nome } },
        update: { ...item, ativo: true },
        create: { ...item, empresaId: empresa.id, ativo: true },
      });
    }

    // Categorias editáveis: cria as que faltam sem mexer em nomes/ordem ajustados pela equipe.
    const categorias = [
      ...new Set([...CATEGORIAS_CARDAPIO, ...cardapio.map((item) => item.categoria)]),
    ];
    for (const [ordem, nome] of categorias.entries()) {
      await tx.categoriaCardapio.upsert({
        where: { empresaId_nome: { empresaId: empresa.id, nome } },
        update: {},
        create: { empresaId: empresa.id, nome, ordem },
      });
    }

    // Cada massa recheada oferece os recheios indicados para ela ("Indicado para rondelle...").
    const massas = await tx.servico.findMany({
      where: { empresaId: empresa.id, categoria: "Massas recheadas" },
      select: { id: true, nome: true },
    });
    const recheios = await tx.servico.findMany({
      where: { empresaId: empresa.id, categoria: "Recheios para massas" },
      select: { id: true, descricao: true },
    });
    for (const massa of massas) {
      await tx.servico.update({ where: { id: massa.id }, data: { opcoesRotulo: "Recheio" } });
      await tx.servicoOpcao.createMany({
        data: recheios
          .filter((recheio) =>
            (recheio.descricao ?? "").toLowerCase().includes(massa.nome.toLowerCase()),
          )
          .map((recheio) => ({ servicoId: massa.id, opcaoId: recheio.id })),
        skipDuplicates: true,
      });
    }

    await tx.usuario.upsert({
      where: { empresaId_email: { empresaId: empresa.id, email } },
      update: { ativo: true, role: "ADMIN", senhaHash },
      create: {
        empresaId: empresa.id,
        nome: "Administrador",
        email,
        senhaHash,
        role: "ADMIN",
      },
    });
  });
}
