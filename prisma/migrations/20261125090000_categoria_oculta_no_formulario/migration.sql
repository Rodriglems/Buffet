-- Categoria escondida da lista do formulário público (os itens seguem como opção de outros).
ALTER TABLE "categorias_cardapio" ADD COLUMN "oculta_no_formulario" BOOLEAN NOT NULL DEFAULT false;
