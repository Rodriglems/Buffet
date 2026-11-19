-- Etapas do evento: Orçamento → Aprovado → Confirmado → Finalizado (e Cancelado).
-- "Pagamento" deixa de ser uma etapa: confirmar o evento é definir o pagamento (parcelas).
-- Eventos que estavam em "Pagamento" já têm parcelas, então passam a "Confirmado".
CREATE TYPE "status_evento_novo" AS ENUM (
  'ORCAMENTO',
  'APROVADO',
  'CONFIRMADO',
  'CANCELADO',
  'FINALIZADO'
);

ALTER TABLE "eventos" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "eventos"
ALTER COLUMN "status" TYPE "status_evento_novo"
USING (
  CASE "status"::TEXT
    WHEN 'PAGAMENTO' THEN 'CONFIRMADO'
    ELSE "status"::TEXT
  END
)::"status_evento_novo";

ALTER TABLE "eventos" ALTER COLUMN "status" SET DEFAULT 'ORCAMENTO';

DROP TYPE "status_evento";
ALTER TYPE "status_evento_novo" RENAME TO "status_evento";
