-- Registro da aprovação do orçamento: quando foi aprovado e se foi o cliente, pelo portal.
-- Orçamentos aprovados antes disto ficam sem data (a data real não foi guardada).
ALTER TABLE "orcamentos" ADD COLUMN "aprovado_em" TIMESTAMPTZ(6);
ALTER TABLE "orcamentos" ADD COLUMN "aprovado_pelo_cliente" BOOLEAN NOT NULL DEFAULT false;
