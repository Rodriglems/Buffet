import { createFileRoute } from "@tanstack/react-router";

import { PageHeader, Panel } from "@/components/panel";
import { StatusBadge } from "@/components/status-badge";
import { listarPagamentos } from "@/features/pagamentos/server-functions";
import { formatBRL, formatDate } from "@/lib/format";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/cliente/pagamentos")({
  head: () => pageMeta("Meus pagamentos", "Parcelas, vencimentos e formas de pagamento."),
  loader: () => listarPagamentos({ data: { page: 1, pageSize: 100 } }),
  component: MeusPagamentos,
});

function MeusPagamentos() {
  const { items: lista } = Route.useLoaderData();
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Pagamentos" subtitle={`${lista.length} parcelas`} />
      <Panel className="p-5">
        {lista.length ? (
          <ul className="divide-y divide-border">
            {lista.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium">
                    Parcela {p.numeroParcela} · {formatBRL(Number(p.valor))}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {p.evento.tipo} ·{" "}
                    {p.dataPagamento
                      ? `pago em ${formatDate(p.dataPagamento)}`
                      : `vence ${formatDate(p.dataVencimento)}`}
                    {p.formaPagamento ? ` · ${p.formaPagamento}` : ""}
                  </p>
                </div>
                <StatusBadge status={p.status} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">
            Nenhuma parcela ainda. Elas aparecem aqui quando a equipe definir o pagamento.
          </p>
        )}
      </Panel>
    </div>
  );
}
