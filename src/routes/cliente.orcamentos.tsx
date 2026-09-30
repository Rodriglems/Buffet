import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { PageHeader, Panel } from "@/components/panel";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { clienteLogado, nomeEvento, orcamentos, totalOrcamento } from "@/data/mock";
import { formatBRL, formatDate } from "@/lib/format";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/cliente/orcamentos")({
  head: () => pageMeta("Meus orçamentos", "Veja, aprove ou peça alterações nas suas propostas."),
  component: MeusOrcamentos,
});

function MeusOrcamentos() {
  const lista = orcamentos.filter((o) => o.clienteId === clienteLogado.id);
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Orçamentos" subtitle="Suas propostas" />
      {lista.map((o) => (
        <Panel key={o.id} className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-display text-base font-semibold">{o.codigo} · {nomeEvento(o.eventoId)}</p>
              <p className="text-muted-foreground text-xs">Versão {o.versao} · válido até {formatDate(o.validade)}</p>
            </div>
            <StatusBadge status={o.status} />
          </div>
          <ul className="mt-4 flex flex-col gap-1.5 text-sm">
            {o.itens.map((i) => (
              <li key={i.id} className="flex justify-between gap-4">
                <span>{i.servico} <span className="text-muted-foreground">· {i.quantidade} {i.unidade}</span></span>
                <span>{formatBRL(i.quantidade * i.valorUnitario - i.desconto)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="font-display text-lg font-semibold">{formatBRL(totalOrcamento(o).total)}</p>
            {o.status === "Enviado" && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => toast("Pedido de alteração enviado.")}>Pedir alteração</Button>
                <Button onClick={() => toast.success("Orçamento aprovado!")}>Aprovar</Button>
              </div>
            )}
          </div>
        </Panel>
      ))}
    </div>
  );
}
