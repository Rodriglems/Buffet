import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { isNotFound, isRedirect } from "@tanstack/react-router";

import { renderErrorPage } from "./lib/error-page";
import { mensagemAmigavel } from "./lib/erros";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

// Erros técnicos (banco, validação) viram mensagens em português para a tela; o detalhe
// completo fica só no log do servidor. Mensagens do próprio sistema e redirecionamentos passam.
const erroAmigavelMiddleware = createMiddleware({ type: "function" }).server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error instanceof Response || isRedirect(error) || isNotFound(error)) throw error;
    const mensagem = mensagemAmigavel(error);
    if (mensagem === null) throw error;
    console.error("[erro em função do servidor]", error);
    throw new Error(mensagem);
  }
});

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware, csrfMiddleware],
  functionMiddleware: [erroAmigavelMiddleware],
}));
