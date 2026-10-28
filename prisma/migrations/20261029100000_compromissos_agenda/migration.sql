-- Compromissos livres da agenda (ex.: "Pagar boleto da fornecedora").
CREATE TABLE "compromissos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "hora" TEXT,
    "observacoes" TEXT,
    "concluido" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "compromissos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "compromissos_titulo_check" CHECK (length(btrim("titulo")) > 0),
    CONSTRAINT "compromissos_hora_check" CHECK ("hora" IS NULL OR "hora" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
);

CREATE INDEX "compromissos_empresa_id_data_idx" ON "compromissos"("empresa_id", "data");
ALTER TABLE "compromissos" ADD CONSTRAINT "compromissos_empresa_id_fkey"
FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
