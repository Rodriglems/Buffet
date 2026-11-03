-- Cardápios públicos e formatos de serviço passam a ser editáveis por empresa.
CREATE TABLE "cardapios_publicos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cardapios_publicos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cardapios_publicos_empresa_id_nome_key" ON "cardapios_publicos"("empresa_id", "nome");
CREATE INDEX "cardapios_publicos_empresa_id_ordem_idx" ON "cardapios_publicos"("empresa_id", "ordem");
ALTER TABLE "cardapios_publicos" ADD CONSTRAINT "cardapios_publicos_empresa_id_fkey"
FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "formatos_servico" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "cardapios" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "formatos_servico_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "formatos_servico_empresa_id_nome_key" ON "formatos_servico"("empresa_id", "nome");
CREATE INDEX "formatos_servico_empresa_id_ordem_idx" ON "formatos_servico"("empresa_id", "ordem");
ALTER TABLE "formatos_servico" ADD CONSTRAINT "formatos_servico_empresa_id_fkey"
FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Toda empresa recebe os cardápios que estavam fixos no sistema, na mesma ordem.
WITH padrao("nome", "ordem") AS (
  VALUES
  ('Buffet para almoço e jantar', 0),
  ('Café da manhã, coffee break e brunch', 1),
  ('Salgadinhos e finger foods', 2),
  ('Massas e lasanhas', 3),
  ('Botequim', 4),
  ('Sobremesas', 5),
  ('Congelados e encomendas', 6)
)
INSERT INTO "cardapios_publicos" ("empresa_id", "nome", "ordem")
SELECT e."id", p."nome", p."ordem"
FROM "empresas" e
CROSS JOIN padrao p;

-- Cardápios usados em itens e que não estão na lista padrão vão para o fim.
INSERT INTO "cardapios_publicos" ("empresa_id", "nome", "ordem")
SELECT DISTINCT s."empresa_id", c."nome", 1000
FROM "servicos" s
CROSS JOIN LATERAL unnest(s."cardapios") AS c("nome")
ON CONFLICT ("empresa_id", "nome") DO NOTHING;

-- Formatos e os cardápios que cada um abria. "Outro formato" (lista vazia) mostra todos.
WITH padrao("nome", "ordem", "cardapios") AS (
  VALUES
  ('Café da manhã', 0, ARRAY['Café da manhã, coffee break e brunch']),
  ('Coffee break', 1, ARRAY['Café da manhã, coffee break e brunch']),
  ('Brunch', 2, ARRAY['Café da manhã, coffee break e brunch']),
  ('Almoço', 3, ARRAY['Buffet para almoço e jantar', 'Sobremesas']),
  ('Jantar', 4, ARRAY['Buffet para almoço e jantar', 'Sobremesas']),
  ('Feijoada completa', 5, ARRAY['Buffet para almoço e jantar', 'Sobremesas']),
  ('Coquetel e finger foods', 6, ARRAY['Salgadinhos e finger foods', 'Sobremesas']),
  ('Botequim', 7, ARRAY['Botequim', 'Sobremesas']),
  ('Festival de massas', 8, ARRAY['Massas e lasanhas', 'Sobremesas']),
  ('Comidas para congelamento', 9, ARRAY['Congelados e encomendas']),
  ('Outro formato', 10, ARRAY[]::TEXT[])
)
INSERT INTO "formatos_servico" ("empresa_id", "nome", "ordem", "cardapios")
SELECT e."id", p."nome", p."ordem", p."cardapios"
FROM "empresas" e
CROSS JOIN padrao p;
