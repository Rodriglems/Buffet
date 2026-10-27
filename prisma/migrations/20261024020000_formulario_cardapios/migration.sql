ALTER TABLE "eventos"
ADD COLUMN "formato_servico" TEXT,
ADD COLUMN "servicos_adicionais" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "servicos"
ADD COLUMN "cardapios" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
