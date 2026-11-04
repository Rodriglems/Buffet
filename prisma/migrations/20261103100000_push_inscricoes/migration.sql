-- Aparelhos que aceitaram receber notificações push (uma linha por navegador/app instalado).
CREATE TABLE "push_inscricoes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "push_inscricoes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "push_inscricoes_endpoint_key" ON "push_inscricoes"("endpoint");
CREATE INDEX "push_inscricoes_usuario_id_idx" ON "push_inscricoes"("usuario_id");
ALTER TABLE "push_inscricoes" ADD CONSTRAINT "push_inscricoes_usuario_id_fkey"
FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
