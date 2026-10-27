-- Simplifica os status de evento para: Orçamento, Aprovado, Pagamento, Confirmado,
-- Cancelado e Finalizado, convertendo os registros existentes.
CREATE TYPE "status_evento_novo" AS ENUM (
  'ORCAMENTO',
  'APROVADO',
  'PAGAMENTO',
  'CONFIRMADO',
  'CANCELADO',
  'FINALIZADO'
);

ALTER TABLE "eventos" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "eventos"
ALTER COLUMN "status" TYPE "status_evento_novo"
USING (
  CASE "status"::TEXT
    WHEN 'PLANEJAMENTO' THEN 'ORCAMENTO'
    WHEN 'NEGOCIACAO' THEN 'ORCAMENTO'
    WHEN 'CONTRATO' THEN 'APROVADO'
    WHEN 'ASSINADO' THEN 'PAGAMENTO'
    WHEN 'REALIZADO' THEN 'FINALIZADO'
    ELSE "status"::TEXT
  END
)::"status_evento_novo";

ALTER TABLE "eventos" ALTER COLUMN "status" SET DEFAULT 'ORCAMENTO';

DROP TYPE "status_evento";
ALTER TYPE "status_evento_novo" RENAME TO "status_evento";

-- Eventos com contrato assinado e todas as parcelas pagas passam a "Confirmado".
UPDATE "eventos" AS e
SET "status" = 'CONFIRMADO'
WHERE e."status" = 'PAGAMENTO'
  AND EXISTS (
    SELECT 1
    FROM "contratos" c
    JOIN "pagamentos" p ON p."contrato_id" = c."id"
    WHERE c."evento_id" = e."id" AND p."status" = 'PAGO'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM "contratos" c
    JOIN "pagamentos" p ON p."contrato_id" = c."id"
    WHERE c."evento_id" = e."id" AND p."status" IN ('PENDENTE', 'ATRASADO')
  );
