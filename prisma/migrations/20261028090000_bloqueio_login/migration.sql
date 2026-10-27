-- Bloqueio temporário após várias senhas erradas (protege senhas curtas de clientes).
ALTER TABLE "usuarios"
ADD COLUMN "tentativas_login" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "bloqueado_ate" TIMESTAMPTZ(6);
