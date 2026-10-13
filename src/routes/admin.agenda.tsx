import { createFileRoute, Link } from "@tanstack/react-router";

import { PageHeader, Panel, PanelHeader } from "@/components/panel";
import { StatusBadge } from "@/components/status-badge";
import { listarEventos } from "@/features/eventos/server-functions";
import { listarPagamentos } from "@/features/pagamentos/server-functions";
import { formatBRL, formatDate } from "@/lib/format";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/admin/agenda")({
  head: () => pageMeta("Agenda", "Eventos e vencimentos organizados por data."),
  loader: async () => {
    const [eventos, pagamentos] = await Promise.all([
      listarEventos({ data: { page: 1, pageSize: 100 } }),
      listarPagamentos({ data: { page: 1, pageSize: 100 } }),
    ]);
    return { eventos: eventos.items, pagamentos: pagamentos.items };
  },
  component: Agenda,
});

type Item = {
  data: string;
  titulo: string;
  detalhe: string;
  tipo: "Evento" | "Vencimento";
  status: string;
  to?: string;
};

function Agenda() {
  const { eventos, pagamentos } = Route.useLoaderData();
  const itens: Item[] = [
    ...eventos.map((e) => ({
      data: e.dataEvento.slice(0, 10),
      titulo: e.nome,
      detalhe: `${e.localNome ?? "Local a definir"} · ${e.cliente.nome}`,
      tipo: "Evento" as const,
      status: e.status,
      to: `/admin/eventos/${e.id}`,
    })),
    ...pagamentos
      .filter((p) => p.status !== "PAGO")
      .map((p) => ({
        data: p.dataVencimento.slice(0, 10),
        titulo: `Parcela ${p.numeroParcela} · ${formatBRL(Number(p.valor))}`,
        detalhe: p.contrato.evento.nome,
        tipo: "Vencimento" as const,
        status: p.status,
      })),
  ].sort((a, b) => a.data.localeCompare(b.data));

  const porMes = itens.reduce<Record<string, Item[]>>((acc, i) => {
    const k = i.data.slice(0, 7);
    (acc[k] ??= []).push(i);
    return acc;
  }, {});

  const nomeMes = (k: string) => {
    const [y, m] = k.split("-");
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Agenda"
        subtitle={`${itens.length} compromissos entre eventos e vencimentos`}
      />
      {Object.entries(porMes).map(([mes, lista]) => (
        <Panel key={mes} className="p-5">
          <PanelHeader
            title={nomeMes(mes).replace(/^./, (c) => c.toUpperCase())}
            subtitle={`${lista.length} itens`}
          />
          <ul className="mt-4 divide-y divide-border">
            {lista.map((i, idx) => {
              const [, , d] = i.data.split("-");
              const body = (
                <div className="flex items-center gap-4 py-3">
                  <div className="bg-surface grid size-12 shrink-0 place-items-center rounded-xl ring-1 ring-black/5">
                    <span className="font-display text-lg font-semibold">{d}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{i.titulo}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {i.tipo} · {i.detalhe} · {formatDate(i.data)}
                    </p>
                  </div>
                  <StatusBadge status={i.status as never} />
                </div>
              );
              return (
                <li key={idx}>
                  {i.to ? (
                    <Link to={i.to} className="block rounded-lg hover:bg-accent/40">
                      {body}
                    </Link>
                  ) : (
                    body
                  )}
                </li>
              );
            })}
          </ul>
        </Panel>
      ))}
    </div>
  );
}
