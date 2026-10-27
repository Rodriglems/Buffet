-- Categorias do cardápio passam a ser editáveis por empresa.
CREATE TABLE "categorias_cardapio" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "categorias_cardapio_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "categorias_cardapio_empresa_id_nome_key" ON "categorias_cardapio"("empresa_id", "nome");
CREATE INDEX "categorias_cardapio_empresa_id_ordem_idx" ON "categorias_cardapio"("empresa_id", "ordem");
ALTER TABLE "categorias_cardapio" ADD CONSTRAINT "categorias_cardapio_empresa_id_fkey"
FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Toda empresa recebe as categorias padrão, na ordem atual do sistema.
WITH padrao("nome", "ordem") AS (
  VALUES
  ('Entradas e cremes', 0),
  ('Salgadinhos tradicionais', 1),
  ('Salgadinhos finos', 2),
  ('Finger foods', 3),
  ('Carnes bovinas', 4),
  ('Aves', 5),
  ('Suínos e ovinos', 6),
  ('Pratos regionais', 7),
  ('Peixes e frutos do mar', 8),
  ('Saladas', 9),
  ('Risotos', 10),
  ('Arroz', 11),
  ('Acompanhamentos', 12),
  ('Massas recheadas', 13),
  ('Massas não recheadas', 14),
  ('Recheios para massas', 15),
  ('Molhos', 16),
  ('Lasanhas', 17),
  ('Empadões e escondidinhos', 18),
  ('Quiches e tortas salgadas', 19),
  ('Tranças e mini pizzas', 20),
  ('Sanduíches, hambúrgueres e wraps', 21),
  ('Pães, patês, antepastos e terrines', 22),
  ('Sabores do mundo', 23),
  ('Bolos, cuscuz e beijus', 24),
  ('Bebidas', 25),
  ('Frutas', 26),
  ('Comida de botequim', 27),
  ('Pratos quentes', 28),
  ('Sobremesas', 29),
  ('Congelados', 30),
  ('Caldos e sopas', 31),
  ('Equipe e estrutura', 32),
  ('Outros', 33)
)
INSERT INTO "categorias_cardapio" ("empresa_id", "nome", "ordem")
SELECT e."id", p."nome", p."ordem"
FROM "empresas" e
CROSS JOIN padrao p;

-- Categorias já usadas em itens e que não estão na lista padrão vão para o fim.
INSERT INTO "categorias_cardapio" ("empresa_id", "nome", "ordem")
SELECT DISTINCT s."empresa_id", s."categoria", 1000
FROM "servicos" s
ON CONFLICT ("empresa_id", "nome") DO NOTHING;

-- Opções que o cliente escolhe para um item (ex.: recheio de cada massa).
ALTER TABLE "servicos" ADD COLUMN "opcoes_rotulo" TEXT;

CREATE TABLE "servico_opcoes" (
    "servico_id" UUID NOT NULL,
    "opcao_id" UUID NOT NULL,
    CONSTRAINT "servico_opcoes_pkey" PRIMARY KEY ("servico_id", "opcao_id")
);

CREATE INDEX "servico_opcoes_opcao_id_idx" ON "servico_opcoes"("opcao_id");
ALTER TABLE "servico_opcoes" ADD CONSTRAINT "servico_opcoes_servico_id_fkey"
FOREIGN KEY ("servico_id") REFERENCES "servicos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "servico_opcoes" ADD CONSTRAINT "servico_opcoes_opcao_id_fkey"
FOREIGN KEY ("opcao_id") REFERENCES "servicos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Cada massa recheada recebe os recheios indicados para ela na descrição do recheio
-- ("Indicado para rondelle ou conchiglioni").
UPDATE "servicos" SET "opcoes_rotulo" = 'Recheio' WHERE "categoria" = 'Massas recheadas';

INSERT INTO "servico_opcoes" ("servico_id", "opcao_id")
SELECT massa."id", recheio."id"
FROM "servicos" massa
JOIN "servicos" recheio ON recheio."empresa_id" = massa."empresa_id"
WHERE massa."categoria" = 'Massas recheadas'
  AND recheio."categoria" = 'Recheios para massas'
  AND lower(coalesce(recheio."descricao", '')) LIKE '%' || lower(massa."nome") || '%'
ON CONFLICT DO NOTHING;
