-- Um item pode pedir mais de uma escolha ao cliente (ex.: recheio e molho da massa).
-- Cada opção passa a dizer de qual grupo é; as opções atuais ficam no grupo com o nome que o
-- item já usava (servicos.opcoes_rotulo), ou "Opção" quando não havia nome.
ALTER TABLE "servico_opcoes" ADD COLUMN "grupo" TEXT NOT NULL DEFAULT 'Opção';
ALTER TABLE "servico_opcoes" ADD COLUMN "grupo_ordem" INTEGER NOT NULL DEFAULT 0;

UPDATE "servico_opcoes" o
SET "grupo" = coalesce(nullif(trim(s."opcoes_rotulo"), ''), 'Opção')
FROM "servicos" s
WHERE s."id" = o."servico_id";
