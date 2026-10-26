-- Pagamentos passam a pertencer diretamente ao evento e os contratos deixam de existir.

-- 1. Vincula cada pagamento ao evento do seu contrato.
ALTER TABLE "pagamentos" ADD COLUMN "evento_id" UUID;

UPDATE "pagamentos" AS p
SET "evento_id" = c."evento_id"
FROM "contratos" AS c
WHERE c."id" = p."contrato_id";

ALTER TABLE "pagamentos" ALTER COLUMN "evento_id" SET NOT NULL;

-- 2. Renumera as parcelas por evento (um evento podia ter mais de um contrato).
DROP INDEX "pagamentos_contrato_id_numero_parcela_key";

WITH numeradas AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "evento_id"
      ORDER BY "data_vencimento", "numero_parcela", "created_at"
    ) AS "nova_parcela"
  FROM "pagamentos"
)
UPDATE "pagamentos" AS p
SET "numero_parcela" = n."nova_parcela"
FROM numeradas AS n
WHERE n."id" = p."id";

CREATE UNIQUE INDEX "pagamentos_evento_id_numero_parcela_key"
ON "pagamentos"("evento_id", "numero_parcela");

ALTER TABLE "pagamentos"
ADD CONSTRAINT "pagamentos_empresa_id_evento_id_fkey"
FOREIGN KEY ("empresa_id", "evento_id") REFERENCES "eventos"("empresa_id", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "pagamentos" DROP CONSTRAINT "pagamentos_empresa_id_contrato_id_fkey";
ALTER TABLE "pagamentos" DROP COLUMN "contrato_id";

-- 3. Documentos deixam de referenciar contratos.
ALTER TABLE "documentos" DROP CONSTRAINT "documentos_empresa_id_contrato_id_fkey";
ALTER TABLE "documentos" DROP COLUMN "contrato_id";

-- 4. Remove assinaturas e contratos.
DROP TRIGGER "assinaturas_validar_tenant" ON "assinaturas";
DROP FUNCTION "validar_tenant_assinatura"();
DROP TABLE "assinaturas";
DROP TABLE "contratos";

DROP TYPE "status_assinatura";
DROP TYPE "tipo_assinatura";
DROP TYPE "status_contrato";
