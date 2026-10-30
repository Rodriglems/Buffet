import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, Check, ClipboardList, CreditCard, Plus, Trash2 } from "lucide-react";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

import { PageHeader, Panel, PanelHeader } from "@/components/panel";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { NovoCompromissoDialog } from "@/features/compromissos/novo-compromisso-dialog";
import {
  alternarCompromissoConcluido,
  excluirCompromisso,
  listarCompromissos,
} from "@/features/compromissos/server-functions";
import { listarEventos } from "@/features/eventos/server-functions";
import { listarPagamentos } from "@/features/pagamentos/server-functions";
import { useConfirmar } from "@/lib/confirmacao";
import { formatBRL, formatDate } from "@/lib/format";
import { pageMeta } from "@/lib/meta";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/agenda")({
  head: () => pageMeta("Agenda", "Eventos, vencimentos e compromissos organizados por data."),
  loader: async () => {
    const [eventos, pagamentos, compromissos] = await Promise.all([
      listarEventos({ data: { page: 1, pageSize: 100 } }),
      listarPagamentos({ data: { page: 1, pageSize: 100 } }),
      listarCompromissos(),
    ]);
    return { eventos: eventos.items, pagamentos: pagamentos.items, compromissos };
  },
  component: Agenda,
});

type Item = {
  data: string;
  titulo: string;
  detalhe: string;
  tipo: "Evento" | "Vencimento" | "Compromisso";
  status: string;
  to?: string;
  /** Só para compromissos: permite concluir e excluir. */
  compromissoId?: string;
  concluido?: boolean;
};

const ICONES = { Evento: CalendarDays, Vencimento: CreditCard, Compromisso: ClipboardList };

function chaveData(data: Date) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}

function dataLocal(iso: string) {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(ano!, mes! - 1, dia!, 12);
}

function Agenda() {
  const { eventos, pagamentos, compromissos } = Route.useLoaderData();
  const router = useRouter();
  const [novoAberto, setNovoAberto] = useState(false);
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
    ...compromissos.map((c) => ({
      data: c.data.slice(0, 10),
      titulo: c.hora ? `${c.hora} · ${c.titulo}` : c.titulo,
      detalhe: c.observacoes ?? "Compromisso da equipe",
      tipo: "Compromisso" as const,
      status: c.concluido ? "CONCLUIDO" : "PENDENTE",
      compromissoId: c.id,
      concluido: c.concluido,
    })),
  ].sort((a, b) => a.data.localeCompare(b.data));

  const porMes = itens.reduce<Record<string, Item[]>>((acc, i) => {
    const k = i.data.slice(0, 7);
    (acc[k] ??= []).push(i);
    return acc;
  }, {});
  const [selecionada, setSelecionada] = useState<Date>(new Date());
  const selecionados = itens.filter((item) => item.data === chaveData(selecionada));
  const diasDo = (tipo: Item["tipo"]) =>
    itens.filter((item) => item.tipo === tipo && !item.concluido).map((i) => dataLocal(i.data));

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
        subtitle={`${itens.length} compromissos entre eventos, vencimentos e lembretes`}
        actions={
          <Button onClick={() => setNovoAberto(true)}>
            <Plus className="size-4" /> Novo compromisso
          </Button>
        }
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
            <span className="flex items-center gap-1.5">
              <span className="bg-info size-2 rounded-full" /> Compromisso
            </span>
          </div>
          <Calendar
            mode="single"
            selected={selecionada}
            onSelect={(data) => data && setSelecionada(data)}
            locale={ptBR}
            modifiers={{
              evento: diasDo("Evento"),
              vencimento: diasDo("Vencimento"),
              compromisso: diasDo("Compromisso"),
            }}
            modifiersClassNames={{
              evento:
                "after:absolute after:bottom-0.5 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-brand",
              vencimento:
                "before:absolute before:right-1 before:top-1 before:size-1 before:rounded-full before:bg-warning",
              compromisso:
                "[&_button]:underline [&_button]:decoration-info [&_button]:decoration-2 [&_button]:underline-offset-4",
            }}
            className="w-full rounded-xl bg-surface p-3 ring-1 ring-black/5 [--cell-size:min(2.6rem,calc((100vw_-_7rem)/7))]"
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
              {selecionados.map((item, index) => (
                <li key={`${item.data}-${index}`}>
                  <LinhaDaAgenda item={item} />
                </li>
              ))}
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
            {lista.map((i, idx) => (
              <li key={idx}>
                <LinhaDaAgenda item={i} comData />
              </li>
            ))}
          </ul>
        </Panel>
      ))}
      <NovoCompromissoDialog
        aberto={novoAberto}
        onOpenChange={setNovoAberto}
        dataInicial={chaveData(selecionada)}
        onSalvo={() => router.invalidate()}
      />
    </div>
  );
}

/** Uma linha da agenda; eventos abrem o detalhe e compromissos podem ser concluídos ou excluídos. */
function LinhaDaAgenda({ item, comData = false }: { item: Item; comData?: boolean }) {
  const router = useRouter();
  const alternar = useServerFn(alternarCompromissoConcluido);
  const excluir = useServerFn(excluirCompromisso);
  const confirmar = useConfirmar();
  const [processando, setProcessando] = useState(false);
  const Icon = ICONES[item.tipo];

  async function executar(acao: () => Promise<unknown>, sucesso: string) {
    setProcessando(true);
    try {
      await acao();
      toast.success(sucesso);
      await router.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível concluir a ação.");
    } finally {
      setProcessando(false);
    }
  }

  const conteudo = (
    <div className="flex items-center gap-3 py-3">
      {comData ? (
        <div className="bg-surface grid size-12 shrink-0 place-items-center rounded-xl ring-1 ring-black/5">
          <span className="font-display text-lg font-semibold">{item.data.slice(8, 10)}</span>
        </div>
      ) : (
        <span className="bg-background grid size-10 shrink-0 place-items-center rounded-xl ring-1 ring-black/5">
          <Icon className="size-4" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm font-medium",
            item.concluido && "line-through opacity-60",
          )}
        >
          {item.titulo}
        </p>
        <p className="text-muted-foreground truncate text-xs">
          {comData ? `${item.tipo} · ${item.detalhe} · ${formatDate(item.data)}` : item.detalhe}
        </p>
      </div>
      <StatusBadge status={item.status} />
      {item.compromissoId ? (
        <div className="flex shrink-0 gap-1">
          <Button
            size="icon"
            variant="ghost"
            disabled={processando}
            aria-label={item.concluido ? "Marcar como pendente" : "Marcar como concluído"}
            title={item.concluido ? "Marcar como pendente" : "Marcar como concluído"}
            onClick={() =>
              void executar(
                () => alternar({ data: { id: item.compromissoId!, concluido: !item.concluido } }),
                item.concluido ? "Compromisso reaberto." : "Compromisso concluído.",
              )
            }
          >
            <Check className={cn("size-4", item.concluido && "text-success")} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            disabled={processando}
            aria-label="Excluir compromisso"
            title="Excluir compromisso"
            onClick={async () => {
              const ok = await confirmar({
                titulo: "Excluir este compromisso?",
                descricao: item.titulo,
                textoConfirmar: "Excluir",
                perigoso: true,
              });
              if (ok) {
                void executar(
                  () => excluir({ data: { id: item.compromissoId! } }),
                  "Compromisso excluído.",
                );
              }
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );

  return item.to ? (
    <Link to={item.to} className="block rounded-lg hover:bg-accent/40">
      {conteudo}
    </Link>
  ) : (
    conteudo
  );
}
