import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Plus } from "lucide-react";

import { PageHeader, Panel, PanelHeader, StatCard } from "@/components/panel";
import { StatusBadge } from "@/components/status-badge";
import { Timeline } from "@/components/timeline";
import { Button } from "@/components/ui/button";
import {
  atividades,
  eventos,
  eventosPorMes,
  funil,
  nomeCliente,
  orcamentos,
  parcelas,
  receitaMensal,
} from "@/data/mock";
import { formatBRLShort, formatDate } from "@/lib/format";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Mesa Buffet & Eventos" },
      {
        name: "description",
        content:
          "Visão geral do buffet: receita prevista, custos, lucro, funil comercial e próximos eventos.",
      },
      { property: "og:title", content: "Dashboard — Mesa Buffet & Eventos" },
      {
        property: "og:description",
        content: "Receita, custos, funil comercial e próximos eventos do seu buffet.",
      },
    ],
  }),
  component: Dashboard,
});

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--popover)",
  fontSize: 12,
} as const;

function Dashboard() {
  const receitaPrevista = eventos
    .filter((e) => !["Cancelado", "Finalizado"].includes(e.status))
    .reduce((a, e) => a + e.valor, 0);
  const custosTotais = receitaMensal.reduce((a, m) => a + m.custos, 0);
  const lucro = receitaPrevista - custosTotais;
  const pendentes = parcelas.filter((p) => p.status !== "Pago" && p.status !== "Cancelado");
  const pendenteTotal = pendentes.reduce((a, p) => a + p.valor, 0);

  const proximos = [...eventos]
    .filter((e) => e.status !== "Finalizado" && e.status !== "Cancelado")
    .sort((a, b) => a.data.localeCompare(b.data))
    .slice(0, 5);

  const emNegociacao = orcamentos.filter((o) => o.status === "Em negociação").length;
  const aprovados = orcamentos.filter((o) => o.status === "Aprovado").length;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Visão geral"
        subtitle="Resumo financeiro e comercial · atualizado em 25/09/2026"
        actions={
          <>
            <Button variant="outline">Exportar</Button>
            <Button asChild>
              <Link to="/admin/eventos/novo">
                <Plus className="size-4" />
                Novo evento
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="Receita prevista"
          value={formatBRLShort(receitaPrevista)}
          badge="+12,4%"
          hint="eventos em aberto"
        />
        <StatCard
          label="Custos"
          value={formatBRLShort(custosTotais)}
          badge="+3,1%"
          badgeTone="warning"
          hint="insumos, equipe e estrutura"
        />
        <StatCard
          label="Lucro previsto"
          value={formatBRLShort(lucro)}
          badge="+18,9%"
          hint={`margem de ${((lucro / receitaPrevista) * 100).toFixed(0)}%`}
        />
        <StatCard
          label="Pagamentos pendentes"
          value={formatBRLShort(pendenteTotal)}
          badge={`${pendentes.length} títulos`}
          badgeTone="danger"
          hint="a receber nos próximos 60 dias"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Eventos próximos" value={String(proximos.length)} hint="nos próximos 90 dias" />
        <StatCard label="Orçamentos em negociação" value={String(emNegociacao)} hint="aguardando retorno" />
        <StatCard label="Orçamentos aprovados" value={String(aprovados)} hint="prontos para contrato" />
        <StatCard label="Contratos assinados" value="2" hint="no mês corrente" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Panel className="p-5 xl:col-span-3">
          <PanelHeader
            title="Receita mensal"
            subtitle="Receita x custos nos últimos 8 meses"
            action={
              <div className="text-muted-foreground flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1.5">
                  <span className="bg-brand size-2 rounded-full" />
                  Receita
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="bg-muted-foreground/40 size-2 rounded-full" />
                  Custos
                </span>
              </div>
            }
          />
          <div className="mt-5 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={receitaMensal} barGap={4}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  tickFormatter={(v: number) => `${v / 1000}k`}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number) => formatBRLShort(v)}
                  cursor={{ fill: "var(--muted)" }}
                />
                <Bar dataKey="receita" name="Receita" fill="var(--brand)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="custos" name="Custos" fill="var(--muted-foreground)" fillOpacity={0.3} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel className="p-5 xl:col-span-2">
          <PanelHeader
            title="Funil comercial"
            action={<span className="text-muted-foreground text-[11px]">47 oportunidades</span>}
          />
          <div className="mt-5 flex flex-col gap-2.5">
            {funil.map((f, i) => (
              <div key={f.etapa} className="flex items-center gap-3">
                <span className="text-muted-foreground w-24 shrink-0 text-xs">{f.etapa}</span>
                <div className="bg-muted h-6 flex-1 overflow-hidden rounded-md">
                  <div
                    className="bg-brand h-full rounded-md"
                    style={{ width: `${f.largura}%`, opacity: 0.35 + i * 0.1 }}
                  />
                </div>
                <span className="w-8 text-right text-xs font-medium">{f.total}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Panel className="p-5 xl:col-span-3">
          <PanelHeader
            title="Próximos eventos"
            action={
              <Link to="/admin/agenda" className="text-brand text-xs font-medium hover:underline">
                Ver agenda
              </Link>
            }
          />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="text-muted-foreground border-b border-border text-[11px] tracking-wide uppercase">
                  <th className="pb-2 font-medium">Evento</th>
                  <th className="pb-2 font-medium">Data</th>
                  <th className="pb-2 font-medium">Convidados</th>
                  <th className="pb-2 font-medium">Valor</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {proximos.map((e) => (
                  <tr key={e.id}>
                    <td className="py-3 pr-3">
                      <Link to="/admin/eventos/$id" params={{ id: e.id }} className="font-medium hover:underline">
                        {e.nome}
                      </Link>
                      <p className="text-muted-foreground text-[11px]">{nomeCliente(e.clienteId)}</p>
                    </td>
                    <td className="text-muted-foreground py-3 pr-3">{formatDate(e.data)}</td>
                    <td className="text-muted-foreground py-3 pr-3">{e.convidados}</td>
                    <td className="py-3 pr-3 font-medium">{formatBRLShort(e.valor)}</td>
                    <td className="py-3">
                      <StatusBadge status={e.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel className="p-5 xl:col-span-2">
          <PanelHeader title="Atividades recentes" subtitle="Últimos registros do sistema" />
          <div className="mt-4">
            <Timeline
              items={atividades.slice(0, 6).map((a) => ({
                id: a.id,
                titulo: a.descricao,
                meta: `${formatDate(a.data)} às ${a.hora} · ${a.usuario}`,
                tone:
                  a.tipo === "Contrato"
                    ? "brand"
                    : a.tipo === "Pagamento"
                      ? "success"
                      : a.tipo === "Orçamento"
                        ? "info"
                        : "neutral",
              }))}
            />
          </div>
        </Panel>
      </div>

      <Panel className="p-5">
        <PanelHeader title="Eventos por mês" subtitle="Volume realizado e previsto" />
        <div className="mt-5 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={eventosPorMes}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="eventos"
                name="Eventos"
                stroke="var(--brand)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>
    </div>
  );
}
