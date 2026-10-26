import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { FinanceiroTabs } from "@/components/layout/section-nav";
import { PageHeader, Panel, PanelHeader, StatCard } from "@/components/panel";
import { StatusBadge } from "@/components/status-badge";
import { listarCustos } from "@/features/custos/server-functions";
import { obterResumoFinanceiro } from "@/features/financeiro/server-functions";
import { listarPagamentos } from "@/features/pagamentos/server-functions";
import { formatBRL, formatBRLShort, formatDate, formatPercent } from "@/lib/format";

export const Route = createFileRoute("/admin/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro — Mesly Buffet & Eventos" },
      {
        name: "description",
        content: "Receita, custos, lucro, margem e contas a receber do buffet.",
      },
      { property: "og:title", content: "Financeiro — Mesly Buffet & Eventos" },
      { property: "og:description", content: "Painel financeiro completo do buffet." },
    ],
  }),
  loader: async () => {
    const fim = new Date();
    const inicio = new Date(fim.getFullYear(), 0, 1);
    const [resumo, pagamentos, custos] = await Promise.all([
      obterResumoFinanceiro({ data: { inicio, fim } }),
      listarPagamentos({ data: { page: 1, pageSize: 100 } }),
      listarCustos({ data: { page: 1, pageSize: 100 } }),
    ]);
    return { resumo, pagamentos: pagamentos.items, custos: custos.items };
  },
  component: Financeiro,
});

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--popover)",
  fontSize: 12,
} as const;

function Financeiro() {
  const { resumo, pagamentos, custos } = Route.useLoaderData();
  const receita = Number(resumo.faturamento);
  const custosTotais = Number(resumo.custos);
  const lucro = Number(resumo.lucro);
  const margem = Number(resumo.margem);
  const receber = Number(resumo.aReceber);
  const atrasado = pagamentos
    .filter((p) => p.status === "ATRASADO")
    .reduce((a, p) => a + Number(p.valor), 0);
  const dados = [{ mes: "Período", receita, custos: custosTotais, lucro }];

  const movimentacoes = [
    ...pagamentos
      .filter((p) => p.status === "PAGO")
      .map((p) => ({
        id: `r-${p.id}`,
        data: p.dataPagamento ?? p.dataVencimento,
        descricao: `Recebimento · ${p.evento.nome} (${p.evento.cliente.nome})`,
        tipo: "Entrada" as const,
        valor: Number(p.valor),
      })),
    ...custos.map((c) => ({
      id: `c-${c.id}`,
      data: c.data,
      descricao: `${c.categoria} · ${c.descricao} (${c.fornecedor})`,
      tipo: "Saída" as const,
      valor: Number(c.valor),
    })),
  ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Financeiro" subtitle="Visão geral, pagamentos e custos no mesmo lugar" />
      <FinanceiroTabs />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
        <StatCard label="Receita" value={formatBRLShort(receita)} badge="+11,2%" />
        <StatCard
          label="Custos"
          value={formatBRLShort(custosTotais)}
          badge="+4,4%"
          badgeTone="warning"
        />
        <StatCard
          label="Lucro"
          value={formatBRLShort(lucro)}
          badge={formatPercent(margem)}
          hint="margem média"
        />
        <StatCard label="Contas a receber" value={formatBRLShort(receber)} badgeTone="info" />
        <StatCard
          label="Pagamentos atrasados"
          value={formatBRLShort(atrasado)}
          badge="1 título"
          badgeTone="danger"
        />
        <StatCard
          label="Ticket médio"
          value={formatBRLShort(receita / 48)}
          hint="por evento realizado"
        />
      </div>

      <Panel className="p-5">
        <PanelHeader title="Receita, custos e lucro" subtitle="Comparativo mensal" />
        <div className="mt-5 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dados} barGap={3}>
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
              <Bar dataKey="custos" name="Custos" fill="var(--warning)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="lucro" name="Lucro" fill="var(--brand-soft)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel className="p-5">
        <PanelHeader title="Movimentações" subtitle="Entradas e saídas registradas" />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="text-muted-foreground border-b border-border text-[11px] uppercase">
                <th className="pb-2 font-medium">Data</th>
                <th className="pb-2 font-medium">Descrição</th>
                <th className="pb-2 font-medium">Tipo</th>
                <th className="pb-2 font-medium text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {movimentacoes.map((m) => (
                <tr key={m.id}>
                  <td className="text-muted-foreground py-3 pr-3">{formatDate(m.data)}</td>
                  <td className="py-3 pr-3">{m.descricao}</td>
                  <td className="py-3 pr-3">
                    <StatusBadge status={m.tipo === "Entrada" ? "Pago" : "Pendente"} dot={false} />
                  </td>
                  <td
                    className={`py-3 text-right font-medium ${m.tipo === "Saída" ? "text-destructive" : ""}`}
                  >
                    {m.tipo === "Saída" ? "− " : ""}
                    {formatBRL(m.valor)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
