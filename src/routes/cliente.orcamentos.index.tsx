import { createFileRoute, Link } from "@tanstack/react-router";
import { BellRing, RotateCcw } from "lucide-react";

import { PageHeader, Panel } from "@/components/panel";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  aguardaAprovacaoDoCliente,
  statusParaCliente,
} from "@/features/orcamentos/aprovacao-cliente";
import { listarOrcamentos } from "@/features/orcamentos/server-functions";
import { formatBRL, formatDate } from "@/lib/format";
import { pageMeta } from "@/lib/meta";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/cliente/orcamentos/")({
  head: () => pageMeta("Meus orçamentos", "Veja, aprove ou peça alterações nas suas propostas."),
  loader: () => listarOrcamentos({ data: { page: 1, pageSize: 100 } }),
  component: MeusOrcamentos,
});

function MeusOrcamentos() {
  const { items: lista } = Route.useLoaderData();
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Orçamentos" subtitle="Seus pedidos e propostas" />
      {lista.length ? null : (
        <Panel className="text-muted-foreground p-5 text-sm">
          Nenhum pedido de orçamento ainda.
        </Panel>
      )}
      {lista.map((o) => {
        // Aprovar acontece dentro do orçamento, vendo o cardápio e os valores.
        const aguarda = aguardaAprovacaoDoCliente(o);
        return (
          <Panel key={o.id} className={cn("p-5", aguarda && "ring-primary ring-2")}>
            {aguarda ? (
              <p className="text-primary mb-3 flex items-center gap-2 text-sm font-semibold">
                <BellRing className="size-4" aria-hidden />
                Aguardando sua aprovação
              </p>
            ) : null}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-display text-base font-semibold">
                  {o.evento.tipo} · {formatDate(o.evento.dataEvento)}
                </p>
                <p className="text-muted-foreground text-xs">
                  Orçamento #{o.numero.toString()} · {o._count.itens} item(ns)
                </p>
              </div>
              {/* Etapa do evento: acompanha o que a equipe muda na tela do evento. */}
              <StatusBadge status={statusParaCliente(o)} />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <p className="font-display text-lg font-semibold">
                {Number(o.total) > 0 ? formatBRL(Number(o.total)) : "Valor a definir"}
              </p>
              <div className="flex flex-wrap gap-2">
                {/* Pede de novo o mesmo cardápio: o formulário abre já marcado, falta só a data. */}
                <Button variant="outline" asChild>
                  <Link to="/orcamento" search={{ refazer: o.id }}>
                    <RotateCcw className="size-4" /> Refazer pedido
                  </Link>
                </Button>
                <Button variant={aguarda ? "default" : "outline"} asChild>
                  <Link to="/cliente/orcamentos/$id" params={{ id: o.id }}>
                    {aguarda ? "Ver e aprovar" : "Ver pedido"}
                  </Link>
                </Button>
              </div>
            </div>
          </Panel>
        );
      })}
    </div>
  );
}
