ALTER TABLE "usuarios"
ADD COLUMN "sessao_versao" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "tokens_recuperacao_senha" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "expira_em" TIMESTAMPTZ(6) NOT NULL,
    "usado_em" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tokens_recuperacao_senha_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tokens_recuperacao_senha_token_hash_key"
ON "tokens_recuperacao_senha"("token_hash");

CREATE INDEX "tokens_recuperacao_senha_usuario_id_created_at_idx"
ON "tokens_recuperacao_senha"("usuario_id", "created_at" DESC);

CREATE INDEX "tokens_recuperacao_senha_expira_em_idx"
ON "tokens_recuperacao_senha"("expira_em");

ALTER TABLE "tokens_recuperacao_senha"
ADD CONSTRAINT "tokens_recuperacao_senha_usuario_id_fkey"
FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
