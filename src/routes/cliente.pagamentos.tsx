import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { PageHeader, Panel } from "@/components/panel";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { listarPagamentos } from "@/features/pagamentos/server-functions";
import { formatBRL, formatDate } from "@/lib/format";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/cliente/pagamentos")({
  head: () => pageMeta("Meus pagamentos", "Parcelas, vencimentos e comprovantes."),
  loader: () => listarPagamentos({ data: { page: 1, pageSize: 100 } }),
  component: MeusPagamentos,
});

function MeusPagamentos() {
  const { items: lista } = Route.useLoaderData();
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Pagamentos" subtitle={`${lista.length} parcelas`} />
      <Panel className="p-5">
        <ul className="divide-y divide-border">
          {lista.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-medium">
                  Parcela {p.numeroParcela} · {formatBRL(Number(p.valor))}
                </p>
                <p className="text-muted-foreground text-xs">
                  {p.contrato.evento.nome} · vence {formatDate(p.dataVencimento)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={p.status} />
                {p.status === "PAGO" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toast.success("Comprovante baixado.")}
                  >
                    Comprovante
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => toast.success("Código Pix copiado.")}>
                    Pagar com Pix
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
