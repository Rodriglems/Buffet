import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, CreditCard } from "lucide-react";
import { ptBR } from "date-fns/locale";

import { PageHeader, Panel, PanelHeader } from "@/components/panel";
import { StatusBadge } from "@/components/status-badge";
import { Calendar } from "@/components/ui/calendar";
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
        detalhe: p.evento.nome,
        tipo: "Vencimento" as const,
        status: p.status,
      })),
  ].sort((a, b) => a.data.localeCompare(b.data));

  const porMes = itens.reduce<Record<string, Item[]>>((acc, i) => {
    const k = i.data.slice(0, 7);
    (acc[k] ??= []).push(i);
    return acc;
  }, {});
  const hoje = new Date();
  const [selecionada, setSelecionada] = useState<Date>(hoje);
  const chaveData = (data: Date) =>
    `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
  const dataLocal = (iso: string) => {
    const [ano, mes, dia] = iso.split("-").map(Number);
    return new Date(ano!, mes! - 1, dia!, 12);
  };
  const selecionados = itens.filter((item) => item.data === chaveData(selecionada));
  const diasComEvento = itens
    .filter((item) => item.tipo === "Evento")
    .map((item) => dataLocal(item.data));
  const diasComVencimento = itens
    .filter((item) => item.tipo === "Vencimento")
    .map((item) => dataLocal(item.data));

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
      <Panel className="grid gap-6 p-5 lg:grid-cols-[auto_1fr]">
        <div>
          <div className="mb-3 flex flex-wrap gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="bg-brand size-2 rounded-full" /> Evento
            </span>
            <span className="flex items-center gap-1.5">
              <span className="bg-warning size-2 rounded-full" /> Vencimento
            </span>
          </div>
          <Calendar
            mode="single"
            selected={selecionada}
            onSelect={(data) => data && setSelecionada(data)}
            locale={ptBR}
            modifiers={{ evento: diasComEvento, vencimento: diasComVencimento }}
            modifiersClassNames={{
              evento:
                "after:absolute after:bottom-0.5 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-brand",
              vencimento:
                "before:absolute before:right-1 before:top-1 before:size-1 before:rounded-full before:bg-warning",
            }}
            className="w-full rounded-xl bg-surface p-3 ring-1 ring-black/5 [--cell-size:2.6rem]"
          />
        </div>
        <div className="min-w-0">
          <PanelHeader
            title={selecionada
              .toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })
              .replace(/^./, (letra) => letra.toUpperCase())}
            subtitle={`${selecionados.length} compromisso${selecionados.length === 1 ? "" : "s"}`}
          />
          {selecionados.length ? (
            <ul className="mt-3 divide-y divide-border">
              {selecionados.map((item, index) => {
                const Icon = item.tipo === "Evento" ? CalendarDays : CreditCard;
                const conteudo = (
                  <div className="flex items-center gap-3 py-3">
                    <span className="bg-background grid size-10 shrink-0 place-items-center rounded-xl ring-1 ring-black/5">
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.titulo}</p>
                      <p className="text-muted-foreground truncate text-xs">{item.detalhe}</p>
                    </div>
                    <StatusBadge status={item.status as never} />
                  </div>
                );
                return (
                  <li key={`${item.data}-${index}`}>
                    {item.to ? (
                      <a href={item.to} className="block rounded-lg hover:bg-accent/40">
                        {conteudo}
                      </a>
                    ) : (
                      conteudo
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-muted-foreground mt-6 rounded-xl border border-dashed border-border p-6 text-center text-sm">
              Nenhum compromisso nesta data.
            </div>
          )}
        </div>
      </Panel>
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
