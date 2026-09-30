import { createFileRoute } from "@tanstack/react-router";

import { PageHeader, Panel } from "@/components/panel";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/states";
import { clienteLogado, eventos } from "@/data/mock";
import { formatBRL, formatDate } from "@/lib/format";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/cliente/eventos")({
  head: () => pageMeta("Meus eventos", "Detalhes dos seus eventos contratados."),
  component: MeusEventos,
});

function MeusEventos() {
  const lista = eventos.filter((e) => e.clienteId === clienteLogado.id);
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Meus eventos" subtitle={`${lista.length} evento(s)`} />
      {lista.length === 0 && (
        <Panel className="p-5">
          <EmptyState title="Nenhum evento" description="Seus eventos aparecerão aqui." />
        </Panel>
      )}
      {lista.map((e) => (
        <Panel key={e.id} className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-display text-lg font-semibold">{e.nome}</p>
              <p className="text-muted-foreground text-xs">{e.tipo}</p>
            </div>
            <StatusBadge status={e.status} />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div><dt className="text-muted-foreground text-[11px] uppercase">Data</dt><dd>{formatDate(e.data)}</dd></div>
            <div><dt className="text-muted-foreground text-[11px] uppercase">Horário</dt><dd>{e.horaInicio}–{e.horaFim}</dd></div>
            <div><dt className="text-muted-foreground text-[11px] uppercase">Convidados</dt><dd>{e.convidados}</dd></div>
            <div><dt className="text-muted-foreground text-[11px] uppercase">Valor</dt><dd>{formatBRL(e.valor)}</dd></div>
          </dl>
          <p className="text-muted-foreground mt-3 text-xs">{e.local} · {e.endereco}</p>
        </Panel>
      ))}
    </div>
  );
}
