-- Convite por link para o cliente criar o próprio acesso ao portal.
CREATE TABLE "convites_cliente" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cliente_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "expira_em" TIMESTAMPTZ(6) NOT NULL,
    "usado_em" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "convites_cliente_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "convites_cliente_token_hash_key" ON "convites_cliente"("token_hash");
CREATE INDEX "convites_cliente_cliente_id_created_at_idx" ON "convites_cliente"("cliente_id", "created_at" DESC);
ALTER TABLE "convites_cliente" ADD CONSTRAINT "convites_cliente_cliente_id_fkey"
FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- O status "Ativo" passa a depender do primeiro acesso. Quem criou a conta pelo formulário
-- público já entrou nela naquele momento, mas esse acesso não era registrado.
UPDATE "usuarios" u
SET "ultimo_login" = u."created_at"
FROM "clientes" c
WHERE c."usuario_id" = u."id"
  AND u."role" = 'CLIENT'
  AND u."ultimo_login" IS NULL
  AND c."observacoes" LIKE 'Cadastro realizado pelo formulário público%';
