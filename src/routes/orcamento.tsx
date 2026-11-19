import { createFileRoute } from "@tanstack/react-router";

import { obterFormularioOrcamentoCurto } from "@/features/orcamentos/solicitacao-publica";
import { FormularioOrcamento } from "@/routes/solicitar-orcamento.$token";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/orcamento")({
  // ?refazer=<orçamento>: o cliente conectado refaz um pedido antigo com o mesmo cardápio.
  validateSearch: (search: Record<string, unknown>): { refazer?: string } => {
    const refazer = search["refazer"];
    return { refazer: typeof refazer === "string" && UUID.test(refazer) ? refazer : undefined };
  },
  loader: () => obterFormularioOrcamentoCurto(),
  head: ({ loaderData }) => {
    const empresa = loaderData?.formulario;
    const titulo = `Monte seu cardápio — ${empresa?.nomeFantasia ?? "Buffet"}`;
    const descricao =
      "Conte sobre seu evento, escolha o cardápio e receba uma proposta personalizada.";
    const imagem = empresa?.logoOrcamentoUrl ?? empresa?.logoUrl;

    return {
      meta: [
        { title: titulo },
        { name: "description", content: descricao },
        { property: "og:title", content: titulo },
        { property: "og:description", content: descricao },
        ...(empresa?.urlPublica ? [{ property: "og:url", content: empresa.urlPublica }] : []),
        ...(imagem ? [{ property: "og:image", content: imagem }] : []),
      ],
      links: empresa?.urlPublica ? [{ rel: "canonical", href: empresa.urlPublica }] : [],
    };
  },
  component: OrcamentoPublico,
});

function OrcamentoPublico() {
  const { token, formulario } = Route.useLoaderData();
  const { refazer } = Route.useSearch();
  return <FormularioOrcamento empresa={formulario} token={token} refazer={refazer} />;
}
