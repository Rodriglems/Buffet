UPDATE "usuarios"
SET "permissoes" = "permissoes" - 'atividades'
WHERE "permissoes" ? 'atividades';

DROP TABLE IF EXISTS "atividades";
