import assert from "node:assert/strict";
import { test } from "vitest";

import { renderErrorPage } from "@/lib/error-page";

test("a página de erro do servidor orienta a pessoa em português", () => {
  const pagina = renderErrorPage();

  assert.match(pagina, /lang="pt-BR"/);
  assert.match(pagina, /Não foi possível carregar a página/);
  assert.match(pagina, /Tentar novamente/);
  assert.doesNotMatch(pagina, /This page didn't load|Try again|Go home/);
});
