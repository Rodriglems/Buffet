import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { PageHeader, Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { ResumoPedido } from "@/features/orcamentos/resumo-pedido";
import { obterOrcamento } from "@/features/orcamentos/server-functions";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/cliente/orcamentos/$id")({
  head: () => pageMeta("Meu pedido", "Resumo do pedido de orçamento com os itens escolhidos."),
  loader: ({ params }) => obterOrcamento({ data: { id: params.id } }),
  component: MeuPedido,
});

function MeuPedido() {
  const orcamento = Route.useLoaderData();
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Meu pedido"
        subtitle={`Orçamento #${orcamento.numero.toString()}`}
        actions={
          <Button variant="outline" asChild>
            <Link to="/cliente/orcamentos">
              <ArrowLeft className="size-4" /> Voltar
            </Link>
          </Button>
        }
      />
      <Panel className="p-5 sm:p-6">
        <ResumoPedido orcamento={orcamento} />
      </Panel>
    </div>
  );
}
