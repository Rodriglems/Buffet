-- Eventos passam a exibir só o nome da pessoa: "Casamento — Maria" vira "Maria".
UPDATE "eventos"
SET "nome" = substr("nome", char_length("tipo") + 4)
WHERE left("nome", char_length("tipo") + 3) = "tipo" || ' — '
  AND char_length("nome") > char_length("tipo") + 3;
