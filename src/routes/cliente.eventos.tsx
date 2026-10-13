import { createFileRoute } from "@tanstack/react-router";
import { CalendarPlus } from "lucide-react";

import { PageHeader, Panel } from "@/components/panel";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { listarEventos } from "@/features/eventos/server-functions";
import { formatDate } from "@/lib/format";
import { pageMeta } from "@/lib/meta";
import { downloadCalendarFile } from "@/lib/sharing";

export const Route = createFileRoute("/cliente/eventos")({
  head: () => pageMeta("Meus eventos", "Detalhes dos seus eventos contratados."),
  loader: () => listarEventos({ data: { page: 1, pageSize: 100 } }),
  component: MeusEventos,
});

function MeusEventos() {
  const { items: lista } = Route.useLoaderData();
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
            <div>
              <dt className="text-muted-foreground text-[11px] uppercase">Data</dt>
              <dd>{formatDate(e.dataEvento)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-[11px] uppercase">Horário</dt>
              <dd>
                {e.horaInicio
                  ? new Date(e.horaInicio).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "A definir"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-[11px] uppercase">Convidados</dt>
              <dd>{e.quantidadeConvidados}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-[11px] uppercase">Status</dt>
              <dd>{e.status}</dd>
            </div>
          </dl>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-muted-foreground text-xs">{e.localNome ?? "Local a definir"}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                downloadCalendarFile({
                  id: e.id,
                  title: e.nome,
                  date: e.dataEvento,
                  startTime: e.horaInicio,
                  endTime: e.horaFim,
                  location: e.localNome,
                  description: e.observacoes,
                })
              }
            >
              <CalendarPlus className="size-4" /> Adicionar ao calendário
            </Button>
          </div>
        </Panel>
      ))}
    </div>
  );
}
