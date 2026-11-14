-- Conta do administrador da instalação: entra no sistema, mas fica fora da lista de usuários
-- e dos avisos da empresa, e a equipe do buffet não pode alterá-la nem excluí-la.
ALTER TABLE "usuarios" ADD COLUMN "administrador_instalacao" BOOLEAN NOT NULL DEFAULT false;

-- Instalações existentes: o administrador da instalação é o primeiro usuário da equipe criado
-- em cada empresa (o sistema o cria sozinho na primeira subida, antes de qualquer outro).
UPDATE "usuarios" SET "administrador_instalacao" = true
WHERE "id" IN (
  SELECT DISTINCT ON ("empresa_id") "id"
  FROM "usuarios"
  WHERE "role" = 'ADMIN'
  ORDER BY "empresa_id", "created_at", "id"
);
