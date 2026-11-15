import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  CalendarX2,
  Copy,
  ExternalLink,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader, Panel } from "@/components/panel";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/states";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatasBloqueadasDialog } from "@/features/eventos/datas-bloqueadas-dialog";
import { excluirEvento, listarEventos } from "@/features/eventos/server-functions";
import { obterLinkFormularioOrcamento } from "@/features/orcamentos/solicitacao-publica";
import { useConfirmar } from "@/lib/confirmacao";
import { formatBRL, formatDate } from "@/lib/format";
import { rotuloStatusEvento } from "@/lib/status-evento";
import { usePlaceholderBusca } from "@/lib/placeholder-busca";
import { copiarTexto } from "@/lib/copiar-texto";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/eventos/")({
  head: () => ({
    meta: [
      { title: "Eventos — Mesly Buffet & Eventos" },
      {
        name: "description",
        content:
          "Gerencie todos os eventos do buffet em lista ou calendário, com filtros e status.",
      },
      { property: "og:title", content: "Eventos — Mesly Buffet & Eventos" },
      { property: "og:description", content: "Lista e calendário de eventos do buffet." },
    ],
  }),
  loader: async () => {
    const [eventos, formulario] = await Promise.all([
      listarEventos({ data: { page: 1, pageSize: 2000 } }),
      obterLinkFormularioOrcamento(),
    ]);
    return { eventos, formulario };
  },
  component: EventosPage,
});

const TODOS = "todos";

const MAIS_RECENTES = "recentes";
const MAIS_ANTIGOS = "antigos";
const DATA_MAIS_RECENTE = "data-recente";
const DATA_MAIS_ANTIGA = "data-antiga";

/** Abas da situação: a lista principal mostra só o que ainda está em andamento. */
const ABAS_SITUACAO = [
  { valor: "andamento", rotulo: "Em andamento", curto: "Ativos" },
  { valor: "finalizados", rotulo: "Finalizados", curto: "Finalizados" },
  { valor: "cancelados", rotulo: "Cancelados", curto: "Cancelados" },
] as const;
type AbaSituacao = (typeof ABAS_SITUACAO)[number]["valor"];

function estaNaAba(status: string, aba: AbaSituacao): boolean {
  if (aba === "finalizados") return status === "FINALIZADO";
  if (aba === "cancelados") return status === "CANCELADO";
  return status !== "FINALIZADO" && status !== "CANCELADO";
}

function EventosPage() {
  const placeholderBusca = usePlaceholderBusca("Buscar por evento ou cliente");
  const { eventos: resultado, formulario } = Route.useLoaderData();
  const eventos = resultado.items;
  const router = useRouter();
  const excluir = useServerFn(excluirEvento);
  const confirmar = useConfirmar();
  const [busca, setBusca] = useState("");
  // Janela "Datas bloqueadas" (dias sem orçamento no formulário público).
  const [datasAbertas, setDatasAbertas] = useState(false);
  const [tipo, setTipo] = useState(TODOS);
  const [aba, setAba] = useState<AbaSituacao>("andamento");
  const [status, setStatus] = useState(TODOS);
  const [data, setData] = useState("");
  const [ordem, setOrdem] = useState(MAIS_RECENTES);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  // No celular os filtros ficam recolhidos: a lista aparece primeiro.
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const filtrosAtivos =
    Number(tipo !== TODOS) +
    Number(status !== TODOS) +
    Number(Boolean(data)) +
    Number(ordem !== MAIS_RECENTES);
  function limparFiltros() {
    setTipo(TODOS);
    setStatus(TODOS);
    setData("");
    setOrdem(MAIS_RECENTES);
  }

  async function apagarEvento(evento: { id: string; tipo: string; cliente: { nome: string } }) {
    const confirmado = await confirmar({
      titulo: `Excluir ${evento.tipo}?`,
      descricao: `Evento de ${evento.cliente.nome}. Esta ação também exclui o orçamento e as parcelas ainda não recebidas.`,
      textoConfirmar: "Excluir evento",
      perigoso: true,
    });
    if (!confirmado) return;

    setExcluindoId(evento.id);
    try {
      await excluir({ data: { id: evento.id } });
      toast.success("Evento excluído.");
      await router.invalidate();
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível excluir o evento.");
    } finally {
      setExcluindoId(null);
    }
  }

  const lista = eventos
    .filter(
      (e) =>
        (e.nome.toLowerCase().includes(busca.toLowerCase()) ||
          e.tipo.toLowerCase().includes(busca.toLowerCase()) ||
          e.cliente.nome.toLowerCase().includes(busca.toLowerCase())) &&
        estaNaAba(e.status, aba) &&
        (tipo === TODOS || e.tipo === tipo) &&
        (status === TODOS || e.status === status) &&
        (!data || e.dataEvento.slice(0, 10) === data),
    )
    .sort((a, b) => {
      // Data do evento ou data do cadastro, da mais recente para a mais antiga (ou o contrário).
      const porDataDoEvento = ordem === DATA_MAIS_RECENTE || ordem === DATA_MAIS_ANTIGA;
      const campo = porDataDoEvento ? "dataEvento" : "createdAt";
      const diferenca = new Date(b[campo]).getTime() - new Date(a[campo]).getTime();
      // Data do evento: "mais recente" começa pela data mais cedo do calendário (crescente).
      return ordem === MAIS_RECENTES || ordem === DATA_MAIS_ANTIGA ? diferenca : -diferenca;
    });

  const tipos = Array.from(new Set(eventos.map((e) => e.tipo)));
  // O filtro de status só oferece os status da aba aberta.
  const statusList = Array.from(
    new Set(eventos.filter((e) => estaNaAba(e.status, aba)).map((e) => e.status)),
  );
  const totalPorAba = Object.fromEntries(
    ABAS_SITUACAO.map(({ valor }) => [
      valor,
      eventos.filter((e) => estaNaAba(e.status, valor)).length,
    ]),
  ) as Record<AbaSituacao, number>;

  const linkFormulario = formulario.url ?? "/orcamento";
  function copiarLink() {
    const link = formulario.url ?? `${window.location.origin}/orcamento`;
    void copiarTexto(link).then(
      () =>
        toast.success("Link do formulário copiado!", {
          description: "Cole no WhatsApp ou e-mail para enviar ao cliente.",
        }),
      () => toast.error("Não foi possível copiar o link."),
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Eventos"
        subtitle={`${eventos.length} eventos cadastrados`}
        actions={
          // Celular: só "Novo evento" à vista; o resto fica no menu ⋯ (uma ação principal por tela).
          <div className="flex w-full gap-2 sm:w-auto">
            <Button asChild className="h-11 flex-1 sm:order-last sm:h-9 sm:flex-none">
              <Link to="/admin/eventos/novo">
                <Plus className="size-4" />
                Novo evento
              </Link>
            </Button>
            <Button variant="outline" className="max-sm:hidden" onClick={copiarLink}>
              <Copy className="size-4" />
              Copiar link
            </Button>
            <Button variant="outline" asChild className="max-sm:hidden">
              <a href={linkFormulario} target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" />
                Abrir formulário
              </a>
            </Button>
            <Button
              variant="outline"
              className="max-sm:hidden"
              onClick={() => setDatasAbertas(true)}
            >
              <CalendarX2 className="size-4" />
              Datas bloqueadas
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-11 shrink-0 sm:hidden"
                  aria-label="Mais ações de eventos"
                >
                  <MoreHorizontal className="size-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuItem className="min-h-11" onSelect={copiarLink}>
                  <Copy className="size-4" />
                  Copiar link do formulário
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="min-h-11">
                  <a href={linkFormulario} target="_blank" rel="noreferrer">
                    <ExternalLink className="size-4" />
                    Abrir formulário
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem className="min-h-11" onSelect={() => setDatasAbertas(true)}>
                  <CalendarX2 className="size-4" />
                  Datas bloqueadas
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />
      <DatasBloqueadasDialog aberto={datasAbertas} onOpenChange={setDatasAbertas} />
      <div className="flex flex-col gap-4">
        <Panel className="grid gap-3 p-3 sm:p-5">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                aria-label="Buscar evento ou cliente"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder={placeholderBusca}
                className="bg-surface border-0 pl-9 ring-1 ring-black/5 max-sm:h-11"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="relative size-11 shrink-0 sm:hidden"
              aria-label={filtrosAtivos ? `Filtros (${filtrosAtivos} ativos)` : "Filtros"}
              aria-expanded={filtrosAbertos}
              aria-controls="eventos-filtros"
              onClick={() => setFiltrosAbertos((atual) => !atual)}
            >
              <SlidersHorizontal className="size-5" />
              {filtrosAtivos ? (
                <span className="bg-primary text-primary-foreground absolute -top-1 -right-1 grid size-5 place-items-center rounded-full text-[11px] font-semibold">
                  {filtrosAtivos}
                </span>
              ) : null}
            </Button>
          </div>
          <div
            id="eventos-filtros"
            className={cn(
              "grid grid-cols-1 gap-3 sm:grid sm:grid-cols-2 xl:grid-cols-4",
              !filtrosAbertos && "max-sm:hidden",
            )}
          >
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger
                aria-label="Tipo de evento"
                className="bg-surface w-full border-0 ring-1 ring-black/5 max-sm:h-11"
              >
                <SelectValue placeholder="Tipo de evento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todos os tipos</SelectItem>
                {tipos.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger
                aria-label="Status do evento"
                className="bg-surface w-full border-0 ring-1 ring-black/5 max-sm:h-11"
              >
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todos os status</SelectItem>
                {statusList.map((s) => (
                  <SelectItem key={s} value={s}>
                    {rotuloStatusEvento(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              aria-label="Data do evento"
              title="Data do evento"
              value={data}
              onChange={(event) => setData(event.target.value)}
              className="bg-surface border-0 ring-1 ring-black/5 max-sm:h-11"
            />
            <Select value={ordem} onValueChange={setOrdem}>
              <SelectTrigger
                aria-label="Ordem da lista"
                className="bg-surface w-full border-0 ring-1 ring-black/5 max-sm:h-11"
              >
                <SelectValue placeholder="Ordenar registros" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={MAIS_RECENTES}>Registros mais recentes</SelectItem>
                <SelectItem value={MAIS_ANTIGOS}>Registros mais antigos</SelectItem>
                <SelectItem value={DATA_MAIS_RECENTE}>Data do evento: mais recente</SelectItem>
                <SelectItem value={DATA_MAIS_ANTIGA}>Data do evento: mais antiga</SelectItem>
              </SelectContent>
            </Select>
            {filtrosAtivos ? (
              <Button
                type="button"
                variant="ghost"
                className="justify-self-start max-sm:h-11 sm:col-span-2 xl:col-span-4"
                onClick={limparFiltros}
              >
                Limpar filtros
              </Button>
            ) : null}
          </div>
        </Panel>

        {/* Barra da lista: situação dos eventos. */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs
            value={aba}
            onValueChange={(valor) => {
              setAba(valor as AbaSituacao);
              setStatus(TODOS);
            }}
          >
            <TabsList
              aria-label="Situação dos eventos"
              className="bg-surface flex h-11 w-full gap-1 rounded-xl p-1 ring-1 ring-black/5 sm:inline-flex sm:w-auto"
            >
              {ABAS_SITUACAO.map(({ valor, rotulo, curto }) => (
                <TabsTrigger
                  key={valor}
                  value={valor}
                  className="group data-[state=active]:bg-primary/8 data-[state=active]:text-primary h-9 min-w-0 flex-auto gap-1 rounded-lg px-1.5 text-[13px] sm:flex-none data-[state=active]:shadow-none sm:gap-2 sm:px-4 sm:text-sm"
                >
                  {/* No celular o nome curto cabe com o número ao lado. */}
                  <span className="truncate sm:hidden">{curto}</span>
                  <span className="max-sm:hidden">{rotulo}</span>
                  <span className="bg-muted text-muted-foreground group-data-[state=active]:bg-primary group-data-[state=active]:text-primary-foreground inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums transition-colors">
                    {totalPorAba[valor]}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div>
          <Panel className="p-2 sm:p-5">
            {lista.length === 0 ? (
              <EmptyState
                title={
                  filtrosAtivos || busca
                    ? "Nenhum evento encontrado"
                    : aba === "finalizados"
                      ? "Nenhum evento finalizado"
                      : aba === "cancelados"
                        ? "Nenhum evento cancelado"
                        : "Nenhum evento em andamento"
                }
                description={
                  filtrosAtivos || busca
                    ? "Ajuste a busca ou os filtros aplicados."
                    : aba === "andamento"
                      ? "Crie um evento ou envie o formulário de orçamento ao cliente."
                      : "Os eventos aparecem aqui quando mudam para esta situação."
                }
              />
            ) : (
              <>
                {/* Celular: um cartão por evento; tocar em qualquer ponto abre os detalhes. */}
                <ul className="grid gap-2 sm:hidden">
                  {lista.map((e) => (
                    <li
                      key={e.id}
                      className="bg-surface relative min-w-0 rounded-xl ring-1 ring-black/5"
                    >
                      <Link
                        to="/admin/eventos/$id"
                        params={{ id: e.id }}
                        className="hover:bg-secondary/60 focus-visible:ring-ring grid min-w-0 grid-cols-[minmax(0,1fr)] gap-0.5 rounded-xl p-3 focus-visible:ring-2 focus-visible:outline-none"
                      >
                        <span className="flex items-start justify-between gap-2 pr-9">
                          <span className="min-w-0 flex-1 truncate font-medium">{e.tipo}</span>
                          <StatusBadge status={e.status} className="shrink-0" />
                        </span>
                        <span className="text-muted-foreground truncate text-sm">
                          {e.cliente.nome}
                        </span>
                        {/* Data e convidados juntos; o valor em destaque à direita. */}
                        <span className="mt-1.5 flex items-baseline justify-between gap-3 text-sm">
                          <span className="text-muted-foreground flex min-w-0 items-center gap-1.5">
                            <span className="text-foreground">{formatDate(e.dataEvento)}</span>
                            <span aria-hidden>·</span>
                            <Users className="size-3.5 shrink-0" aria-hidden />
                            <span className="truncate">
                              {e.quantidadeConvidados}
                              <span className="sr-only"> convidados</span>
                            </span>
                          </span>
                          {e.orcamentos[0] ? (
                            <span className="shrink-0 font-semibold tabular-nums">
                              {formatBRL(Number(e.orcamentos[0].total))}
                            </span>
                          ) : null}
                        </span>
                        {e.cliente.acesso === "SEM_ACESSO" ? (
                          <StatusBadge
                            status={e.cliente.acesso}
                            dot={false}
                            className="mt-1.5 justify-self-start"
                          />
                        ) : null}
                      </Link>
                      {/* Excluir fica no menu ⋯: não dá para tocar sem querer ao rolar a lista. */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="text-muted-foreground absolute top-0.5 right-0.5 size-11"
                            disabled={excluindoId !== null}
                            aria-label={`Ações do evento ${e.tipo} de ${e.cliente.nome}`}
                          >
                            {excluindoId === e.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <MoreHorizontal className="size-5" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem asChild className="min-h-11">
                            <Link to="/admin/eventos/$id" params={{ id: e.id }}>
                              <ExternalLink className="size-4" />
                              Abrir evento
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive [&_svg]:text-destructive min-h-11"
                            onSelect={() => void apagarEvento(e)}
                          >
                            <Trash2 className="size-4" />
                            Excluir evento
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </li>
                  ))}
                </ul>

                <div className="hidden overflow-x-auto sm:block">
                  <table className="w-full min-w-[840px] text-left text-sm">
                    <thead>
                      <tr className="text-muted-foreground border-b border-border text-xs">
                        <th className="pb-2 font-medium">Evento</th>
                        <th className="pb-2 font-medium max-sm:hidden">Cliente</th>
                        <th className="pb-2 font-medium max-sm:hidden">Data</th>
                        <th className="pb-2 font-medium max-sm:hidden">Local</th>
                        <th className="pb-2 font-medium max-sm:hidden">Convidados</th>
                        <th className="pb-2 font-medium max-sm:hidden">Valor</th>
                        <th className="pb-2 font-medium text-right sm:text-left">Status</th>
                        <th className="w-10 pb-2 text-right font-medium">
                          <span className="sr-only">Ações</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {lista.map((e) => (
                        <tr key={e.id}>
                          <td className="py-3 pr-3">
                            <Link
                              to="/admin/eventos/$id"
                              params={{ id: e.id }}
                              className="font-medium hover:underline"
                            >
                              {e.tipo}
                            </Link>
                            {e.formatoServico ? (
                              <p className="text-muted-foreground text-[11px] max-sm:hidden">
                                {e.formatoServico}
                              </p>
                            ) : null}
                            <p className="text-muted-foreground text-xs sm:hidden">
                              {e.cliente.nome} · {formatDate(e.dataEvento)}
                            </p>
                            {e.cliente.acesso === "SEM_ACESSO" ? (
                              <StatusBadge
                                status={e.cliente.acesso}
                                dot={false}
                                className="mt-1 sm:hidden"
                              />
                            ) : null}
                            {e.orcamentos[0] ? (
                              <p className="text-xs font-medium sm:hidden">
                                {formatBRL(Number(e.orcamentos[0].total))}
                              </p>
                            ) : null}
                          </td>
                          <td className="text-muted-foreground py-3 pr-3 max-sm:hidden">
                            {e.cliente.nome}
                            {e.cliente.acesso === "SEM_ACESSO" ? (
                              <StatusBadge
                                status={e.cliente.acesso}
                                dot={false}
                                className="ml-2 align-middle"
                              />
                            ) : null}
                          </td>
                          <td className="text-muted-foreground py-3 pr-3 max-sm:hidden">
                            {formatDate(e.dataEvento)}
                          </td>
                          <td className="text-muted-foreground py-3 pr-3 max-sm:hidden">
                            {e.localNome ?? "—"}
                          </td>
                          <td className="py-3 pr-3 max-sm:hidden">{e.quantidadeConvidados}</td>
                          <td className="py-3 pr-3 font-medium whitespace-nowrap max-sm:hidden">
                            {e.orcamentos[0] ? formatBRL(Number(e.orcamentos[0].total)) : "—"}
                          </td>
                          <td className="py-3 pr-3 text-right sm:text-left">
                            <StatusBadge status={e.status} />
                          </td>
                          <td className="py-2 text-right">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              disabled={excluindoId !== null}
                              aria-label={`Excluir evento ${e.tipo} de ${e.cliente.nome}`}
                              title="Excluir evento"
                              onClick={() => void apagarEvento(e)}
                            >
                              {excluindoId === e.id ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <Trash2 className="size-4" />
                              )}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
