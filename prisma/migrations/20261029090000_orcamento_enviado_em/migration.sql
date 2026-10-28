-- Momento em que a equipe enviou o orçamento ao cliente. Antes disso o portal do cliente
-- não mostra valores.
ALTER TABLE "orcamentos" ADD COLUMN "enviado_em" TIMESTAMPTZ(6);

-- Orçamentos que o cliente já via com valores continuam visíveis.
UPDATE "orcamentos"
SET "enviado_em" = "updated_at"
WHERE "status" IN ('ENVIADO', 'VISUALIZADO', 'EM_NEGOCIACAO', 'AGUARDANDO_APROVACAO', 'APROVADO');
