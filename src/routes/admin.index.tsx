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
  MapPin,
  MessageSquare,
  PenLine,
  Plus,
  Send,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";

import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { eventos, nomeCliente, orcamentos, parcelas, receitaMensal } from "@/data/mock";
import { formatBRLShort } from "@/lib/format";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/admin/")({
  head: () => pageMeta("Seu dia", "Pendências, próximos eventos, agenda da semana e resumo financeiro do buffet."),
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

const proximaAcao: Record<string, string> = {
  Contrato: "Confirmar cardápio",
  Aprovado: "Abrir evento",
  Negociação: "Revisar proposta",
  Orçamento: "Enviar proposta",
  Assinado: "Planejar equipe",
  Planejamento: "Definir cardápio",
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
  const hoje = new Date();
  const dataHoje = hoje.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });

  const futuros = eventos
    .filter((e) => e.status !== "Finalizado" && e.status !== "Cancelado")
    .sort((a, b) => a.data.localeCompare(b.data));
  const proximo = futuros[0];

  const atrasada = parcelas.find((p) => p.status === "Atrasado");
  const negociando = orcamentos.find((o) => o.status === "Em negociação");
  const pendencias = [
    negociando && {
      icon: FileText,
      titulo: `Retornar proposta de ${nomeCliente(negociando.clienteId).split(" ")[0]}`,
      meta: `${negociando.codigo} em negociação`,
      acao: "Preparar retorno",
    },
    proximo && {
      icon: ConciergeBell,
      titulo: `Confirmar cardápio do ${proximo.nome}`,
      meta: `Prazo: ${curta(proximo.data)}`,
      acao: "Revisar cardápio",
    },
    atrasada && {
      icon: CreditCard,
      titulo: `Parcela de ${nomeCliente(atrasada.clienteId).split(" ")[0]} vencida`,
      meta: `${formatBRLShort(atrasada.valor)} · venceu em ${curta(atrasada.vencimento)}`,
      acao: "Ver cobrança",
    },
  ].filter(Boolean) as { icon: LucideIcon; titulo: string; meta: string; acao: string }[];

  const recebido = parcelas.filter((p) => p.status === "Pago").reduce((s, p) => s + p.valor, 0);
  const aReceber = parcelas.filter((p) => p.status === "Pendente").reduce((s, p) => s + p.valor, 0);
  const vencido = parcelas.filter((p) => p.status === "Atrasado").reduce((s, p) => s + p.valor, 0);
  const ultimo = receitaMensal[receitaMensal.length - 1]!;
  const resultado = ultimo.receita - ultimo.custos;

  const agenda = [
    { icon: CalendarDays, quando: "05 out · 14h", oque: "Degustação — Casamento Duarte" },
    { icon: MapPin, quando: "08 out · 10h", oque: "Visita técnica — Casamento Ferreira" },
    { icon: Users, quando: "09 out · 16h", oque: "Confirmar equipe" },
  ];

  const contar = (st: string[]) => orcamentos.filter((o) => st.includes(o.status)).length;
  const funil = [
    { icon: FileText, label: "Novos", total: contar(["Rascunho"]) },
    { icon: Send, label: "Propostas enviadas", total: contar(["Enviado", "Visualizado"]) },
    { icon: MessageSquare, label: "Negociação", total: contar(["Em negociação"]) },
    { icon: PenLine, label: "Aguardando assinatura", total: contar(["Aguardando aprovação"]) },
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
              <Link to="/admin/clientes/novo">
                <Plus className="size-4" /> Novo atendimento
              </Link>
            </Button>
            <Button asChild variant="outline" className="bg-surface h-11 rounded-xl px-5">
              <Link to="/admin/orcamentos/novo">
                <FileText className="size-4" /> Criar proposta
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
          <ul className="mt-3 divide-y divide-border">
            {pendencias.map((p) => (
              <li key={p.titulo} className="flex flex-wrap items-center gap-4 py-3">
                <p.icon className="text-foreground/70 size-5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{p.titulo}</p>
                  <p className="text-muted-foreground text-xs">{p.meta}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-surface h-9 min-w-36 rounded-lg"
                  onClick={() => toast.success(`${p.acao}: aberto.`)}
                >
                  {p.acao}
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
                    <tr key={e.id} className="hover:bg-background/70 border-b border-border last:border-0">
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-3">
                          <IconBox icon={Icon} />
                          <div>
                            <p className="font-medium">{e.nome}</p>
                            <p className="text-muted-foreground text-xs">{nomeCliente(e.clienteId)}</p>
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
                          {proximaAcao[e.status] ?? "Abrir evento"} <ArrowRight className="size-3.5" />
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
            <span className="bg-surface rounded-lg px-3 py-1.5 text-xs ring-1 ring-black/5">Outubro de 2026</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { icon: Wallet, label: "Recebido", v: recebido },
              { icon: FileText, label: "A receber", v: aReceber },
              { icon: Clock, label: "Vencido", v: vencido },
              { icon: BarChart3, label: "Resultado previsto", v: resultado },
            ].map((k) => (
              <div key={k.label} className="bg-surface flex items-center gap-3 rounded-xl p-3 ring-1 ring-black/5">
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
              <span className="flex items-center gap-1.5"><span className="bg-chart-1 size-2 rounded-full" />Receitas</span>
              <span className="flex items-center gap-1.5"><span className="bg-chart-2 size-2 rounded-full" />Custos</span>
            </div>
          </div>
          <div className="mt-2 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={receitaMensal} barGap={4}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} width={44} tickFormatter={(v) => `${v / 1000} mil`} />
                <Tooltip cursor={{ fill: "var(--muted)" }} formatter={(v: number) => formatBRLShort(v)} />
                <Bar dataKey="receita" name="Receitas" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={18} />
                <Bar dataKey="custos" name="Custos" fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={18} />
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
            <Progress value={75} className="bg-primary-foreground/20 mt-4 h-2.5 [&>div]:bg-primary-foreground" />
            <p className="mt-3 text-sm font-medium">Preparação do evento</p>
            <p className="text-primary-foreground/70 text-xs">6 de 8 tarefas concluídas</p>
            <Button asChild variant="secondary" className="bg-primary-foreground text-primary mt-5 h-11 w-full rounded-xl hover:bg-primary-foreground/90">
              <Link to="/admin/eventos/$id" params={{ id: proximo.id }}>Abrir evento</Link>
            </Button>
          </section>
        )}

        <Panel className="p-5">
          <h2 className="font-display text-base font-semibold">Agenda da semana</h2>
          <ul className="mt-3 divide-y divide-border">
            {agenda.map((a) => (
              <li key={a.quando} className="flex items-center gap-3 py-3">
                <IconBox icon={a.icon} />
                <div>
                  <p className="text-sm font-semibold">{a.quando}</p>
                  <p className="text-muted-foreground text-xs">{a.oque}</p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel className="p-5">
          <h2 className="font-display text-base font-semibold">Atendimentos em andamento</h2>
          <ul className="mt-3 divide-y divide-border">
            {funil.map((f) => (
              <li key={f.label}>
                <Link to="/admin/orcamentos" className="flex items-center gap-3 py-3 text-sm">
                  <f.icon className="text-foreground/70 size-[18px]" />
                  <span className="flex-1">{f.label}</span>
                  <span className="font-display font-bold">{f.total}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
