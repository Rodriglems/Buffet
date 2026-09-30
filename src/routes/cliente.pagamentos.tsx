import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { PageHeader, Panel } from "@/components/panel";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { clienteLogado, nomeEvento, parcelas } from "@/data/mock";
import { formatBRL, formatDate } from "@/lib/format";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/cliente/pagamentos")({
  head: () => pageMeta("Meus pagamentos", "Parcelas, vencimentos e comprovantes."),
  component: MeusPagamentos,
});

function MeusPagamentos() {
  const lista = parcelas.filter((p) => p.clienteId === clienteLogado.id);
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Pagamentos" subtitle={`${lista.length} parcelas`} />
      <Panel className="p-5">
        <ul className="divide-y divide-border">
          {lista.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-medium">Parcela {p.parcela} · {formatBRL(p.valor)}</p>
                <p className="text-muted-foreground text-xs">{nomeEvento(p.eventoId)} · vence {formatDate(p.vencimento)}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={p.status} />
                {p.status === "Pago" ? (
                  <Button size="sm" variant="outline" onClick={() => toast.success("Comprovante baixado.")}>Comprovante</Button>
                ) : (
                  <Button size="sm" onClick={() => toast.success("Código Pix copiado.")}>Pagar com Pix</Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
