-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "role_usuario" AS ENUM ('ADMIN', 'CLIENT');

-- CreateEnum
CREATE TYPE "tipo_pessoa" AS ENUM ('FISICA', 'JURIDICA');

-- CreateEnum
CREATE TYPE "status_lead" AS ENUM ('NOVO', 'CONTATO_REALIZADO', 'QUALIFICADO', 'PROPOSTA', 'CONVERTIDO', 'PERDIDO');

-- CreateEnum
CREATE TYPE "status_evento" AS ENUM ('PLANEJAMENTO', 'ORCAMENTO', 'NEGOCIACAO', 'APROVADO', 'CONTRATO', 'ASSINADO', 'CONFIRMADO', 'REALIZADO', 'FINALIZADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "status_orcamento" AS ENUM ('RASCUNHO', 'ENVIADO', 'VISUALIZADO', 'EM_NEGOCIACAO', 'AGUARDANDO_APROVACAO', 'APROVADO', 'REJEITADO', 'EXPIRADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "status_contrato" AS ENUM ('RASCUNHO', 'ENVIADO', 'AGUARDANDO_ASSINATURA', 'ASSINADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "tipo_assinatura" AS ENUM ('CLIENTE');

-- CreateEnum
CREATE TYPE "status_assinatura" AS ENUM ('PENDENTE', 'ASSINADA', 'RECUSADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "status_pagamento" AS ENUM ('PENDENTE', 'PAGO', 'ATRASADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "tipo_documento" AS ENUM ('CONTRATO', 'COMPROVANTE', 'DOCUMENTO_CLIENTE', 'OUTRO');

-- CreateTable
CREATE TABLE "empresas" (
    "id" UUID NOT NULL,
    "razao_social" TEXT NOT NULL,
    "nome_fantasia" TEXT NOT NULL,
    "cnpj" VARCHAR(14) NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" VARCHAR(20),
    "whatsapp" VARCHAR(20),
    "cep" VARCHAR(8),
    "estado" CHAR(2),
    "cidade" TEXT,
    "bairro" TEXT,
    "logradouro" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "logo_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "role" "role_usuario" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ultimo_login" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "usuario_id" UUID,
    "nome" TEXT NOT NULL,
    "tipo_pessoa" "tipo_pessoa" NOT NULL,
    "cpf_cnpj" VARCHAR(14),
    "email" TEXT,
    "telefone" VARCHAR(20),
    "whatsapp" VARCHAR(20),
    "cep" VARCHAR(8),
    "estado" CHAR(2),
    "cidade" TEXT,
    "bairro" TEXT,
    "logradouro" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "observacoes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT,
    "telefone" VARCHAR(20),
    "whatsapp" VARCHAR(20),
    "tipo_evento" TEXT,
    "data_evento" DATE,
    "quantidade_convidados" INTEGER,
    "origem" TEXT,
    "observacoes" TEXT,
    "status" "status_lead" NOT NULL DEFAULT 'NOVO',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos" (
    "id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "cliente_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "data_evento" DATE NOT NULL,
    "hora_inicio" TIME(0),
    "hora_fim" TIME(0),
    "quantidade_convidados" INTEGER NOT NULL,
    "local_nome" TEXT,
    "cep" VARCHAR(8),
    "estado" CHAR(2),
    "cidade" TEXT,
    "bairro" TEXT,
    "logradouro" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "status" "status_evento" NOT NULL DEFAULT 'PLANEJAMENTO',
    "observacoes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eventos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servicos" (
    "id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "unidade" TEXT NOT NULL,
    "preco_base" DECIMAL(14,2) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "servicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orcamentos" (
    "id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "evento_id" UUID NOT NULL,
    "numero" BIGINT NOT NULL,
    "versao" INTEGER NOT NULL DEFAULT 1,
    "status" "status_orcamento" NOT NULL DEFAULT 'RASCUNHO',
    "validade" DATE,
    "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "desconto" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "observacoes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orcamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orcamento_itens" (
    "id" UUID NOT NULL,
    "orcamento_id" UUID NOT NULL,
    "servico_id" UUID,
    "descricao" TEXT NOT NULL,
    "quantidade" DECIMAL(12,3) NOT NULL,
    "unidade" TEXT NOT NULL,
    "valor_unitario" DECIMAL(14,2) NOT NULL,
    "desconto" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "valor_total" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orcamento_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contratos" (
    "id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "evento_id" UUID NOT NULL,
    "orcamento_id" UUID NOT NULL,
    "numero" BIGINT NOT NULL,
    "status" "status_contrato" NOT NULL DEFAULT 'RASCUNHO',
    "valor_total" DECIMAL(14,2) NOT NULL,
    "conteudo" TEXT,
    "documento_url" TEXT,
    "enviado_em" TIMESTAMPTZ(6),
    "assinado_em" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contratos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assinaturas" (
    "id" UUID NOT NULL,
    "contrato_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "tipo" "tipo_assinatura" NOT NULL DEFAULT 'CLIENTE',
    "status" "status_assinatura" NOT NULL DEFAULT 'PENDENTE',
    "assinado_em" TIMESTAMPTZ(6),
    "ip" INET,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assinaturas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagamentos" (
    "id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "contrato_id" UUID NOT NULL,
    "numero_parcela" INTEGER NOT NULL,
    "descricao" TEXT,
    "valor" DECIMAL(14,2) NOT NULL,
    "data_vencimento" DATE NOT NULL,
    "data_pagamento" DATE,
    "status" "status_pagamento" NOT NULL DEFAULT 'PENDENTE',
    "forma_pagamento" TEXT,
    "observacoes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custos" (
    "id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "evento_id" UUID NOT NULL,
    "categoria" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "fornecedor" TEXT,
    "valor" DECIMAL(14,2) NOT NULL,
    "data" DATE NOT NULL,
    "observacoes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atividades" (
    "id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "usuario_id" UUID,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "entidade_tipo" TEXT,
    "entidade_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "atividades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacoes" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lida_em" TIMESTAMPTZ(6),

    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos" (
    "id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "usuario_id" UUID,
    "cliente_id" UUID,
    "evento_id" UUID,
    "contrato_id" UUID,
    "nome" TEXT NOT NULL,
    "tipo" "tipo_documento" NOT NULL,
    "url" TEXT NOT NULL,
    "tamanho" BIGINT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "empresas_cnpj_key" ON "empresas"("cnpj");

-- CreateIndex
CREATE INDEX "usuarios_empresa_id_ativo_idx" ON "usuarios"("empresa_id", "ativo");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_empresa_id_email_key" ON "usuarios"("empresa_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_empresa_id_id_key" ON "usuarios"("empresa_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_usuario_id_key" ON "clientes"("usuario_id");

-- CreateIndex
CREATE INDEX "clientes_empresa_id_nome_idx" ON "clientes"("empresa_id", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_empresa_id_cpf_cnpj_key" ON "clientes"("empresa_id", "cpf_cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_empresa_id_usuario_id_key" ON "clientes"("empresa_id", "usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_empresa_id_id_key" ON "clientes"("empresa_id", "id");

-- CreateIndex
CREATE INDEX "leads_empresa_id_status_idx" ON "leads"("empresa_id", "status");

-- CreateIndex
CREATE INDEX "eventos_empresa_id_data_evento_idx" ON "eventos"("empresa_id", "data_evento");

-- CreateIndex
CREATE INDEX "eventos_cliente_id_idx" ON "eventos"("cliente_id");

-- CreateIndex
CREATE UNIQUE INDEX "eventos_empresa_id_id_key" ON "eventos"("empresa_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "servicos_empresa_id_nome_key" ON "servicos"("empresa_id", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "servicos_empresa_id_id_key" ON "servicos"("empresa_id", "id");

-- CreateIndex
CREATE INDEX "orcamentos_evento_id_versao_idx" ON "orcamentos"("evento_id", "versao" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "orcamentos_empresa_id_numero_versao_key" ON "orcamentos"("empresa_id", "numero", "versao");

-- CreateIndex
CREATE UNIQUE INDEX "orcamentos_empresa_id_id_key" ON "orcamentos"("empresa_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "orcamentos_empresa_id_evento_id_id_key" ON "orcamentos"("empresa_id", "evento_id", "id");

-- CreateIndex
CREATE INDEX "orcamento_itens_orcamento_id_idx" ON "orcamento_itens"("orcamento_id");

-- CreateIndex
CREATE INDEX "contratos_evento_id_idx" ON "contratos"("evento_id");

-- CreateIndex
CREATE UNIQUE INDEX "contratos_empresa_id_numero_key" ON "contratos"("empresa_id", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "contratos_empresa_id_id_key" ON "contratos"("empresa_id", "id");

-- CreateIndex
CREATE INDEX "pagamentos_empresa_id_data_vencimento_status_idx" ON "pagamentos"("empresa_id", "data_vencimento", "status");

-- CreateIndex
CREATE UNIQUE INDEX "pagamentos_contrato_id_numero_parcela_key" ON "pagamentos"("contrato_id", "numero_parcela");

-- CreateIndex
CREATE INDEX "custos_evento_id_data_idx" ON "custos"("evento_id", "data");

-- CreateIndex
CREATE INDEX "atividades_empresa_id_created_at_idx" ON "atividades"("empresa_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "atividades_entidade_tipo_entidade_id_idx" ON "atividades"("entidade_tipo", "entidade_id");

-- CreateIndex
CREATE INDEX "notificacoes_usuario_id_lida_created_at_idx" ON "notificacoes"("usuario_id", "lida", "created_at" DESC);

-- CreateIndex
CREATE INDEX "documentos_empresa_id_created_at_idx" ON "documentos"("empresa_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_empresa_id_usuario_id_fkey" FOREIGN KEY ("empresa_id", "usuario_id") REFERENCES "usuarios"("empresa_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_empresa_id_cliente_id_fkey" FOREIGN KEY ("empresa_id", "cliente_id") REFERENCES "clientes"("empresa_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicos" ADD CONSTRAINT "servicos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orcamentos" ADD CONSTRAINT "orcamentos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orcamentos" ADD CONSTRAINT "orcamentos_empresa_id_evento_id_fkey" FOREIGN KEY ("empresa_id", "evento_id") REFERENCES "eventos"("empresa_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orcamento_itens" ADD CONSTRAINT "orcamento_itens_orcamento_id_fkey" FOREIGN KEY ("orcamento_id") REFERENCES "orcamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orcamento_itens" ADD CONSTRAINT "orcamento_itens_servico_id_fkey" FOREIGN KEY ("servico_id") REFERENCES "servicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_empresa_id_evento_id_fkey" FOREIGN KEY ("empresa_id", "evento_id") REFERENCES "eventos"("empresa_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_empresa_id_evento_id_orcamento_id_fkey" FOREIGN KEY ("empresa_id", "evento_id", "orcamento_id") REFERENCES "orcamentos"("empresa_id", "evento_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_contrato_id_fkey" FOREIGN KEY ("contrato_id") REFERENCES "contratos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_empresa_id_contrato_id_fkey" FOREIGN KEY ("empresa_id", "contrato_id") REFERENCES "contratos"("empresa_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custos" ADD CONSTRAINT "custos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custos" ADD CONSTRAINT "custos_empresa_id_evento_id_fkey" FOREIGN KEY ("empresa_id", "evento_id") REFERENCES "eventos"("empresa_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atividades" ADD CONSTRAINT "atividades_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atividades" ADD CONSTRAINT "atividades_empresa_id_usuario_id_fkey" FOREIGN KEY ("empresa_id", "usuario_id") REFERENCES "usuarios"("empresa_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_empresa_id_usuario_id_fkey" FOREIGN KEY ("empresa_id", "usuario_id") REFERENCES "usuarios"("empresa_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_empresa_id_cliente_id_fkey" FOREIGN KEY ("empresa_id", "cliente_id") REFERENCES "clientes"("empresa_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_empresa_id_evento_id_fkey" FOREIGN KEY ("empresa_id", "evento_id") REFERENCES "eventos"("empresa_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_empresa_id_contrato_id_fkey" FOREIGN KEY ("empresa_id", "contrato_id") REFERENCES "contratos"("empresa_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Regras de dominio que o Prisma Schema ainda nao representa.
ALTER TABLE "empresas"
  ADD CONSTRAINT "empresas_cnpj_check" CHECK ("cnpj" ~ '^[0-9]{14}$'),
  ADD CONSTRAINT "empresas_cep_check" CHECK ("cep" IS NULL OR "cep" ~ '^[0-9]{8}$');

ALTER TABLE "clientes"
  ADD CONSTRAINT "clientes_cpf_cnpj_check" CHECK ("cpf_cnpj" IS NULL OR "cpf_cnpj" ~ '^[0-9]{11}([0-9]{3})?$'),
  ADD CONSTRAINT "clientes_cep_check" CHECK ("cep" IS NULL OR "cep" ~ '^[0-9]{8}$');

ALTER TABLE "leads"
  ADD CONSTRAINT "leads_quantidade_convidados_check" CHECK ("quantidade_convidados" IS NULL OR "quantidade_convidados" > 0);

ALTER TABLE "eventos"
  ADD CONSTRAINT "eventos_quantidade_convidados_check" CHECK ("quantidade_convidados" > 0),
  ADD CONSTRAINT "eventos_cep_check" CHECK ("cep" IS NULL OR "cep" ~ '^[0-9]{8}$'),
  ADD CONSTRAINT "eventos_horario_check" CHECK ("hora_inicio" IS NULL OR "hora_fim" IS NULL OR "hora_fim" > "hora_inicio");

ALTER TABLE "servicos"
  ADD CONSTRAINT "servicos_preco_base_check" CHECK ("preco_base" >= 0);

ALTER TABLE "orcamentos"
  ADD CONSTRAINT "orcamentos_versao_check" CHECK ("versao" > 0),
  ADD CONSTRAINT "orcamentos_subtotal_check" CHECK ("subtotal" >= 0),
  ADD CONSTRAINT "orcamentos_desconto_check" CHECK ("desconto" >= 0 AND "desconto" <= "subtotal"),
  ADD CONSTRAINT "orcamentos_total_check" CHECK ("total" = "subtotal" - "desconto");

ALTER TABLE "orcamento_itens"
  ADD CONSTRAINT "orcamento_itens_quantidade_check" CHECK ("quantidade" > 0),
  ADD CONSTRAINT "orcamento_itens_valor_unitario_check" CHECK ("valor_unitario" >= 0),
  ADD CONSTRAINT "orcamento_itens_desconto_check" CHECK ("desconto" >= 0 AND "desconto" <= "quantidade" * "valor_unitario"),
  ADD CONSTRAINT "orcamento_itens_valor_total_check" CHECK ("valor_total" = ("quantidade" * "valor_unitario") - "desconto");

ALTER TABLE "contratos"
  ADD CONSTRAINT "contratos_valor_total_check" CHECK ("valor_total" >= 0);

ALTER TABLE "assinaturas"
  ADD CONSTRAINT "assinaturas_status_data_check" CHECK (
    ("status" = 'ASSINADA' AND "assinado_em" IS NOT NULL)
    OR ("status" <> 'ASSINADA' AND "assinado_em" IS NULL)
  );

ALTER TABLE "pagamentos"
  ADD CONSTRAINT "pagamentos_numero_parcela_check" CHECK ("numero_parcela" > 0),
  ADD CONSTRAINT "pagamentos_valor_check" CHECK ("valor" > 0),
  ADD CONSTRAINT "pagamentos_status_data_check" CHECK (
    ("status" = 'PAGO' AND "data_pagamento" IS NOT NULL)
    OR ("status" <> 'PAGO' AND "data_pagamento" IS NULL)
  );

ALTER TABLE "custos"
  ADD CONSTRAINT "custos_valor_check" CHECK ("valor" >= 0);

ALTER TABLE "atividades"
  ADD CONSTRAINT "atividades_metadata_check" CHECK (jsonb_typeof("metadata") = 'object');

ALTER TABLE "notificacoes"
  ADD CONSTRAINT "notificacoes_leitura_check" CHECK (
    ("lida" AND "lida_em" IS NOT NULL)
    OR (NOT "lida" AND "lida_em" IS NULL)
  );

ALTER TABLE "documentos"
  ADD CONSTRAINT "documentos_tamanho_check" CHECK ("tamanho" IS NULL OR "tamanho" >= 0);

-- As duas tabelas abaixo herdam o tenant dos pais e nao repetem empresa_id.
CREATE OR REPLACE FUNCTION "validar_tenant_item_orcamento"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."servico_id" IS NOT NULL AND NOT EXISTS (
    SELECT 1
      FROM "orcamentos" o
      JOIN "servicos" s ON s."empresa_id" = o."empresa_id"
     WHERE o."id" = NEW."orcamento_id"
       AND s."id" = NEW."servico_id"
  ) THEN
    RAISE EXCEPTION 'O servico e o orcamento devem pertencer a mesma empresa';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "orcamento_itens_validar_tenant"
BEFORE INSERT OR UPDATE OF "orcamento_id", "servico_id" ON "orcamento_itens"
FOR EACH ROW EXECUTE FUNCTION "validar_tenant_item_orcamento"();

CREATE OR REPLACE FUNCTION "validar_tenant_assinatura"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM "contratos" c
      JOIN "usuarios" u ON u."empresa_id" = c."empresa_id"
     WHERE c."id" = NEW."contrato_id"
       AND u."id" = NEW."usuario_id"
  ) THEN
    RAISE EXCEPTION 'O usuario e o contrato devem pertencer a mesma empresa';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "assinaturas_validar_tenant"
BEFORE INSERT OR UPDATE OF "contrato_id", "usuario_id" ON "assinaturas"
FOR EACH ROW EXECUTE FUNCTION "validar_tenant_assinatura"();
