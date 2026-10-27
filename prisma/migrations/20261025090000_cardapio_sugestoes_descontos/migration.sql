CREATE TYPE "tipo_desconto_orcamento" AS ENUM ('VALOR_FIXO', 'PERCENTUAL');

ALTER TABLE "servicos"
ADD COLUMN "imagem_url" TEXT,
ADD COLUMN "preco_visivel" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "ordem" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "sugestao_chef" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "orcamentos"
ADD COLUMN "tipo_desconto" "tipo_desconto_orcamento" NOT NULL DEFAULT 'VALOR_FIXO',
ADD COLUMN "desconto_valor" DECIMAL(14, 2) NOT NULL DEFAULT 0;

UPDATE "orcamentos"
SET "desconto_valor" = "desconto";

CREATE INDEX "servicos_empresa_id_sugestao_chef_ativo_ordem_idx"
ON "servicos"("empresa_id", "sugestao_chef", "ativo", "ordem");
