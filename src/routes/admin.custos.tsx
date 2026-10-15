import { createFileRoute } from "@tanstack/react-router";

import { FinanceiroTabs } from "@/components/layout/section-nav";
import { PageHeader, Panel, PanelHeader } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { listarCustos } from "@/features/custos/server-functions";
import { formatBRL, formatDate } from "@/lib/format";

export const Route = createFileRoute("/admin/custos")({
  head: () => ({
    meta: [
      { title: "Custos — Mesa Buffet & Eventos" },
      {
        name: "description",
        content: "Lançamento e acompanhamento de custos por evento e categoria.",
      },
      { property: "og:title", content: "Custos — Mesa Buffet & Eventos" },
      { property: "og:description", content: "Custos de alimentos, bebidas, equipe e estrutura." },
    ],
  }),
  loader: () => listarCustos({ data: { page: 1, pageSize: 100 } }),
  component: Custos,
});

function Custos() {
  const { items: custos } = Route.useLoaderData();
  const porEvento = Array.from(
    custos
      .reduce(
        (mapa, custo) =>
          mapa.set(custo.eventoId, {
            id: custo.eventoId,
            nome: custo.evento.nome,
            total: (mapa.get(custo.eventoId)?.total ?? 0) + Number(custo.valor),
          }),
        new Map<string, { id: string; nome: string; total: number }>(),
      )
      .values(),
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Custos"
        subtitle={`${custos.length} lançamentos registrados`}
        actions={<Button disabled>Registrar custo</Button>}
      />
      <FinanceiroTabs />

      <Panel className="p-5">
        <PanelHeader title="Total por evento" />
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {porEvento.map((e) => (
            <div key={e.id} className="bg-surface rounded-xl p-4 ring-1 ring-black/5">
              <p className="text-xs font-medium">{e.nome}</p>
              <p className="font-display mt-1 text-lg font-semibold">{formatBRL(e.total)}</p>
              <p className="text-muted-foreground text-[11px]">Total de despesas lançadas</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="p-5">
        <PanelHeader title="Lançamentos" />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="text-muted-foreground border-b border-border text-[11px] uppercase">
                <th className="pb-2 font-medium">Evento</th>
                <th className="pb-2 font-medium">Categoria</th>
                <th className="pb-2 font-medium">Descrição</th>
                <th className="pb-2 font-medium">Fornecedor</th>
                <th className="pb-2 font-medium">Data</th>
                <th className="pb-2 font-medium text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {custos.map((c) => (
                <tr key={c.id}>
                  <td className="py-3 pr-3 font-medium">{c.evento.nome}</td>
                  <td className="text-muted-foreground py-3 pr-3">{c.categoria}</td>
                  <td className="text-muted-foreground py-3 pr-3">{c.descricao}</td>
                  <td className="text-muted-foreground py-3 pr-3">{c.fornecedor}</td>
                  <td className="text-muted-foreground py-3 pr-3">{formatDate(c.data)}</td>
                  <td className="py-3 text-right font-medium">{formatBRL(Number(c.valor))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
