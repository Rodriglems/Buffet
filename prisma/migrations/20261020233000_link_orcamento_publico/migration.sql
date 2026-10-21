ALTER TABLE "empresas"
ADD COLUMN "link_orcamento_token" UUID NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX "empresas_link_orcamento_token_key"
ON "empresas"("link_orcamento_token");
