-- Datas bloqueadas para o formulário público de orçamento (uma linha por dia e por empresa).
CREATE TABLE "datas_bloqueadas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "data" DATE NOT NULL,
    "motivo" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "datas_bloqueadas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "datas_bloqueadas_empresa_id_data_key" ON "datas_bloqueadas"("empresa_id", "data");

ALTER TABLE "datas_bloqueadas" ADD CONSTRAINT "datas_bloqueadas_empresa_id_fkey"
FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
