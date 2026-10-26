import { createFileRoute, Link } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CakeSlice,
  Clock,
  ConciergeBell,
  CreditCard,
  FileText,
  Gem,
  Plus,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { listarEventos } from "@/features/eventos/server-functions";
import { obterResumoFinanceiro } from "@/features/financeiro/server-functions";
import { listarOrcamentos } from "@/features/orcamentos/server-functions";
import { listarPagamentos } from "@/features/pagamentos/server-functions";
import { formatBRLShort, formatDate } from "@/lib/format";
import { pageMeta } from "@/lib/meta";
import { rotuloStatusEvento } from "@/lib/status-evento";

export const Route = createFileRoute("/admin/")({
  head: () =>
    pageMeta(
      "Seu dia",
      "Pendências, próximos eventos, agenda do dia e resumo financeiro do buffet.",
    ),
  loader: async () => {
    const fim = new Date();
    const inicio = new Date(fim.getFullYear(), 0, 1);
    const [eventos, orcamentos, pagamentos, financeiro] = await Promise.all([
      listarEventos({ data: { page: 1, pageSize: 100 } }),
      listarOrcamentos({ data: { page: 1, pageSize: 100 } }),
      listarPagamentos({ data: { page: 1, pageSize: 100 } }),
      obterResumoFinanceiro({ data: { inicio, fim } }),
    ]);
    return {
      eventos: eventos.items,
      orcamentos: orcamentos.items,
      pagamentos: pagamentos.items,
      financeiro,
    };
  },
  component: Dashboard,
});

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const curta = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${d} ${MESES[Number(m) - 1]}`;
};

const iconeTipo: Record<string, LucideIcon> = {
  Casamento: Gem,
  Aniversário: CakeSlice,
  Corporativo: Users,
  Formatura: Users,
  Confraternização: Users,
};

/** "há 5 min", "há 3 h", "há 2 dias" — para destacar pedidos recém-chegados. */
function tempoDesde(iso: string, agora = Date.now()) {
  const minutos = Math.max(0, Math.round((agora - new Date(iso).getTime()) / 60_000));
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.round(horas / 24);
  return `há ${dias} dia${dias === 1 ? "" : "s"}`;
}

const proximaAcao: Record<string, string> = {
  Orçamento: "Enviar proposta",
  Aprovado: "Definir parcelas",
  Pagamento: "Acompanhar pagamentos",
  Confirmado: "Baixar PDF do evento",
};

function IconBox({ icon: Icon, dark }: { icon: LucideIcon; dark?: boolean }) {
  return (
    <span
      className={
        dark
          ? "bg-primary-foreground/10 grid size-10 shrink-0 place-items-center rounded-xl"
          : "bg-background grid size-10 shrink-0 place-items-center rounded-xl ring-1 ring-black/5"
      }
    >
      <Icon className="size-[18px]" />
    </span>
  );
}

function Dashboard() {
  const dados = Route.useLoaderData();
  const eventos = dados.eventos.map((evento) => ({
    ...evento,
    data: evento.dataEvento.slice(0, 10),
    local: evento.localNome ?? "Local a definir",
    convidados: evento.quantidadeConvidados,
    clienteId: evento.clienteId,
    status: rotuloStatusEvento(evento.status),
  }));
  const parcelas = dados.pagamentos.map((pagamento) => ({
    ...pagamento,
    clienteId: pagamento.evento.clienteId,
    vencimento: pagamento.dataVencimento.slice(0, 10),
    valor: Number(pagamento.valor),
    status:
      pagamento.status === "PAGO"
        ? "Pago"
        : pagamento.status === "ATRASADO"
          ? "Atrasado"
          : pagamento.status === "PENDENTE"
            ? "Pendente"
            : "Cancelado",
  }));
  const nomeCliente = (clienteId: string) =>
    dados.eventos.find((evento) => evento.clienteId === clienteId)?.cliente.nome ?? "Cliente";
  const receitaMensal = [
    {
      mes: "Atual",
      receita: Number(dados.financeiro.faturamento),
      custos: Number(dados.financeiro.custos),
    },
  ];
  const hoje = new Date();
  const dataHoje = hoje.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const chaveHoje = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;

  const futuros = eventos
    .filter((e) => e.status !== "Finalizado" && e.status !== "Cancelado")
    .sort((a, b) => a.data.localeCompare(b.data));
  const proximo = futuros[0];

  // Pedidos novos (orçamento ainda em rascunho, evento aguardando) primeiro, do mais recente.
  const pedidosRecentes = dados.orcamentos
    .filter(
      (orcamento) => orcamento.status === "RASCUNHO" && orcamento.evento.status === "ORCAMENTO",
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);
  const pendencias: {
    id: string;
    icon: LucideIcon;
    titulo: string;
    meta: string;
    acao: string;
    eventoId: string;
  }[] = [
    ...pedidosRecentes.map((orcamento) => ({
      id: `pedido-${orcamento.id}`,
      icon: ConciergeBell,
      titulo: `${orcamento.evento.cliente.nome} - PEDIU ORÇAMENTO`,
      meta: `${orcamento.evento.tipo} · ${formatDate(orcamento.evento.dataEvento)} · ${tempoDesde(orcamento.createdAt)}`,
      acao: "Abrir pedido",
      eventoId: orcamento.eventoId,
    })),
    ...parcelas
      .filter((parcela) => parcela.status === "Atrasado")
      .slice(0, 3)
      .map((parcela) => ({
        id: `parcela-${parcela.id}`,
        icon: CreditCard,
        titulo: `Parcela de ${nomeCliente(parcela.clienteId).split(" ")[0]} vencida`,
        meta: `${formatBRLShort(parcela.valor)} · venceu em ${curta(parcela.vencimento)}`,
        acao: "Ver cobrança",
        eventoId: parcela.eventoId,
      })),
  ];

  const recebido = parcelas.filter((p) => p.status === "Pago").reduce((s, p) => s + p.valor, 0);
  const aReceber = parcelas.filter((p) => p.status === "Pendente").reduce((s, p) => s + p.valor, 0);
  const vencido = parcelas.filter((p) => p.status === "Atrasado").reduce((s, p) => s + p.valor, 0);
  const ultimo = receitaMensal[receitaMensal.length - 1]!;
  const resultado = ultimo.receita - ultimo.custos;

  const agenda = [
    ...eventos
      .filter((evento) => evento.data === chaveHoje)
      .map((evento) => ({
        id: `evento-${evento.id}`,
        icon: CalendarDays,
        quando: evento.horaInicio
          ? new Date(evento.horaInicio).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Horário a definir",
        oque: `${evento.nome} · ${evento.local}`,
        href: `/admin/eventos/${evento.id}`,
      })),
    ...parcelas
      .filter((parcela) => parcela.vencimento === chaveHoje && parcela.status !== "Pago")
      .map((parcela) => ({
        id: `pagamento-${parcela.id}`,
        icon: CreditCard,
        quando: "Vence hoje",
        oque: `${nomeCliente(parcela.clienteId)} · ${formatBRLShort(parcela.valor)}`,
        href: "/admin/pagamentos",
      })),
  ];

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_340px]">
      {/* Coluna principal */}
      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Seu dia, organizado</h1>
            <p className="text-muted-foreground mt-1 text-sm">{dataHoje}</p>
          </div>
          <div className="flex gap-2">
            <Button asChild className="h-11 rounded-xl px-5">
              <Link to="/admin/eventos/novo">
                <Plus className="size-4" /> Adicionar evento
              </Link>
            </Button>
          </div>
        </div>

        <Panel className="p-5">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-base font-semibold">Precisa da sua atenção</h2>
            <span className="bg-destructive/10 text-destructive rounded-full px-2.5 py-0.5 text-[11px] font-medium">
              {pendencias.length} pendências
            </span>
          </div>
          {pendencias.length ? null : (
            <p className="text-muted-foreground mt-3 text-sm">
              Nenhum pedido novo ou parcela vencida. Tudo em dia!
            </p>
          )}
          <ul className="mt-3 divide-y divide-border">
            {pendencias.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-4 py-3">
                <p.icon className="text-foreground/70 size-5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{p.titulo}</p>
                  <p className="text-muted-foreground text-xs">{p.meta}</p>
                </div>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="bg-surface h-9 min-w-36 rounded-lg"
                >
                  <Link to="/admin/eventos/$id" params={{ id: p.eventoId }}>
                    {p.acao}
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">Próximos eventos</h2>
            <Link to="/admin/agenda" className="flex items-center gap-1 text-xs font-semibold">
              Ver agenda <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead>
                <tr className="text-muted-foreground border-b border-border text-[10px] tracking-wider uppercase">
                  <th className="py-2 font-medium">Evento</th>
                  <th className="py-2 font-medium">Data</th>
                  <th className="py-2 font-medium">Convidados</th>
                  <th className="py-2 font-medium">Próxima ação</th>
                </tr>
              </thead>
              <tbody>
                {futuros.slice(0, 3).map((e) => {
                  const Icon = iconeTipo[e.tipo] ?? Users;
                  return (
                    <tr
                      key={e.id}
                      className="hover:bg-background/70 border-b border-border last:border-0"
                    >
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-3">
                          <IconBox icon={Icon} />
                          <div>
                            <p className="font-medium">{e.nome}</p>
                            <p className="text-muted-foreground text-xs">
                              {nomeCliente(e.clienteId)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-3">{curta(e.data)}</td>
                      <td className="py-3 pr-3">{e.convidados}</td>
                      <td className="py-3">
                        <Link
                          to="/admin/eventos/$id"
                          params={{ id: e.id }}
                          className="flex items-center gap-1 text-xs font-semibold"
                        >
                          {proximaAcao[e.status] ?? "Abrir evento"}{" "}
                          <ArrowRight className="size-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">Resumo financeiro</h2>
            <span className="bg-surface rounded-lg px-3 py-1.5 text-xs ring-1 ring-black/5">
              {hoje.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { icon: Wallet, label: "Recebido", v: recebido },
              { icon: FileText, label: "A receber", v: aReceber },
              { icon: Clock, label: "Vencido", v: vencido },
              { icon: BarChart3, label: "Resultado previsto", v: resultado },
            ].map((k) => (
              <div
                key={k.label}
                className="bg-surface flex items-center gap-3 rounded-xl p-3 ring-1 ring-black/5"
              >
                <IconBox icon={k.icon} />
                <div className="min-w-0">
                  <p className="text-muted-foreground text-[11px]">{k.label}</p>
                  <p className="font-display truncate text-base font-bold">{formatBRLShort(k.v)}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between">
            <p className="text-sm font-medium">Receitas e custos</p>
            <div className="text-muted-foreground flex gap-4 text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="bg-chart-1 size-2 rounded-full" />
                Receitas
              </span>
              <span className="flex items-center gap-1.5">
                <span className="bg-chart-2 size-2 rounded-full" />
                Custos
              </span>
            </div>
          </div>
          <div className="mt-2 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={receitaMensal} barGap={4}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  width={44}
                  tickFormatter={(v) => `${v / 1000} mil`}
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)" }}
                  formatter={(v: number) => formatBRLShort(v)}
                />
                <Bar
                  dataKey="receita"
                  name="Receitas"
                  fill="var(--chart-1)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={18}
                />
                <Bar
                  dataKey="custos"
                  name="Custos"
                  fill="var(--chart-2)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      {/* Coluna lateral */}
      <div className="flex flex-col gap-5">
        {proximo && (
          <section className="bg-primary text-primary-foreground rounded-3xl p-6">
            <p className="font-display text-lg font-semibold">Próximo evento</p>
            <p className="font-display mt-3 text-xl font-bold">{proximo.nome}</p>
            <p className="text-primary-foreground/70 text-sm">
              {curta(proximo.data)} · {proximo.convidados} convidados
            </p>
            <p className="mt-4 text-sm font-medium">{proximo.tipo}</p>
            <p className="text-primary-foreground/70 text-xs">Etapa atual: {proximo.status}</p>
            <Button
              asChild
              variant="secondary"
              className="bg-primary-foreground text-primary mt-5 h-11 w-full rounded-xl hover:bg-primary-foreground/90"
            >
              <Link to="/admin/eventos/$id" params={{ id: proximo.id }}>
                Abrir evento
              </Link>
            </Button>
          </section>
        )}

        <Panel className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">Agenda do dia</h2>
            <Link to="/admin/agenda" className="text-xs font-semibold">
              Ver calendário
            </Link>
          </div>
          {agenda.length ? (
            <ul className="mt-3 divide-y divide-border">
              {agenda.map((a) => (
                <li key={a.id}>
                  <a
                    href={a.href}
                    className="flex items-center gap-3 rounded-lg py-3 hover:bg-accent/40"
                  >
                    <IconBox icon={a.icon} />
                    <div>
                      <p className="text-sm font-semibold">{a.quando}</p>
                      <p className="text-muted-foreground text-xs">{a.oque}</p>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground mt-4 text-sm">Nenhum compromisso para hoje.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}
