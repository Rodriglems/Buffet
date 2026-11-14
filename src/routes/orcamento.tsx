import { createFileRoute } from "@tanstack/react-router";

import { obterFormularioOrcamentoCurto } from "@/features/orcamentos/solicitacao-publica";
import { FormularioOrcamento } from "@/routes/solicitar-orcamento.$token";

export const Route = createFileRoute("/orcamento")({
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
  return <FormularioOrcamento empresa={formulario} token={token} />;
}
