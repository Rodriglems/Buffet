import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarDays,
  ChevronDown,
  Copy,
  ExternalLink,
  List,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader, Panel } from "@/components/panel";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listarEventos } from "@/features/eventos/server-functions";
import { obterLinkFormularioOrcamento } from "@/features/orcamentos/solicitacao-publica";
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

function EventosPage() {
  const placeholderBusca = usePlaceholderBusca("Buscar por evento ou cliente");
  const { eventos: resultado, formulario } = Route.useLoaderData();
  const eventos = resultado.items;
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState(TODOS);
  const [status, setStatus] = useState(TODOS);
  const [data, setData] = useState("");
  const [ordem, setOrdem] = useState(MAIS_RECENTES);
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

  const lista = eventos
    .filter(
      (e) =>
        (e.nome.toLowerCase().includes(busca.toLowerCase()) ||
          e.tipo.toLowerCase().includes(busca.toLowerCase()) ||
          e.cliente.nome.toLowerCase().includes(busca.toLowerCase())) &&
        (tipo === TODOS || e.tipo === tipo) &&
        (status === TODOS || e.status === status) &&
        (!data || e.dataEvento.slice(0, 10) === data),
    )
    .sort((a, b) => {
      const diferenca = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return ordem === MAIS_RECENTES ? diferenca : -diferenca;
    });

  const tipos = Array.from(new Set(eventos.map((e) => e.tipo)));
  const statusList = Array.from(new Set(eventos.map((e) => e.status)));

  // Calendário simples do mês com maior concentração de eventos.
  const porData = lista.reduce<Record<string, typeof eventos>>((acc, e) => {
    const data = new Date(e.dataEvento).toISOString().slice(0, 10);
    (acc[data] ||= []).push(e);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Eventos"
        subtitle={`${eventos.length} eventos cadastrados`}
        actions={
          // Celular: "Novo evento" em largura total; os dois atalhos do formulário lado a lado.
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
            <Button asChild className="col-span-2 max-sm:h-11 sm:order-last">
              <Link to="/admin/eventos/novo">
                <Plus className="size-4" />
                Novo evento
              </Link>
            </Button>
            <Button
              variant="outline"
              className="max-sm:h-11"
              title="Copiar o link do formulário de orçamento"
              onClick={() => {
                const caminho = `/solicitar-orcamento/${formulario.token}`;
                const link = formulario.url ?? `${window.location.origin}${caminho}`;
                void copiarTexto(link).then(
                  () =>
                    toast.success("Link do formulário copiado!", {
                      description: "Cole no WhatsApp ou e-mail para enviar ao cliente.",
                    }),
                  () => toast.error("Não foi possível copiar o link."),
                );
              }}
            >
              <Copy className="size-4" />
              Copiar link
            </Button>
            <Button variant="outline" asChild className="max-sm:h-11">
              <a
                href={formulario.url ?? `/solicitar-orcamento/${formulario.token}`}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink className="size-4" />
                Abrir formulário
              </a>
            </Button>
          </div>
        }
      />
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
            className="h-11 shrink-0 sm:hidden"
            aria-expanded={filtrosAbertos}
            aria-controls="eventos-filtros"
            onClick={() => setFiltrosAbertos((atual) => !atual)}
          >
            <SlidersHorizontal className="size-4" />
            Filtros
            {filtrosAtivos ? (
              <span className="bg-primary text-primary-foreground grid size-5 place-items-center rounded-full text-[11px]">
                {filtrosAtivos}
              </span>
            ) : (
              <ChevronDown
                className={cn("size-4 transition-transform", filtrosAbertos && "rotate-180")}
              />
            )}
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

      <Tabs defaultValue="lista">
        <TabsList className="max-sm:h-12 max-sm:w-full">
          <TabsTrigger value="lista" className="max-sm:h-10 max-sm:flex-1">
            <List className="size-4" /> Lista
          </TabsTrigger>
          <TabsTrigger value="calendario" className="max-sm:h-10 max-sm:flex-1">
            <CalendarDays className="size-4" /> Calendário
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="mt-4">
          <Panel className="p-2 sm:p-5">
            {lista.length === 0 ? (
              <EmptyState
                title="Nenhum evento encontrado"
                description="Ajuste os filtros aplicados."
              />
            ) : (
              <>
                {/* Celular: um cartão por evento; tocar em qualquer ponto abre os detalhes. */}
                <ul className="grid gap-2 sm:hidden">
                  {lista.map((e) => (
                    <li
                      key={e.id}
                      className="bg-surface flex items-start gap-1 rounded-xl ring-1 ring-black/5"
                    >
                      <Link
                        to="/admin/eventos/$id"
                        params={{ id: e.id }}
                        className="hover:bg-secondary/60 focus-visible:ring-ring flex min-h-16 min-w-0 flex-1 items-start gap-3 rounded-xl p-3 focus-visible:ring-2 focus-visible:outline-none"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">{e.tipo}</span>
                          <span className="text-muted-foreground block text-sm">
                            {e.cliente.nome}
                          </span>
                          <span className="text-muted-foreground mt-1 flex flex-wrap gap-x-3 text-sm">
                            <span className="text-foreground">{formatDate(e.dataEvento)}</span>
                            <span>{e.quantidadeConvidados} convidados</span>
                            {e.orcamentos[0] ? (
                              <span className="text-foreground font-medium">
                                {formatBRL(Number(e.orcamentos[0].total))}
                              </span>
                            ) : null}
                          </span>
                          {e.cliente.acesso === "SEM_ACESSO" ? (
                            <StatusBadge status={e.cliente.acesso} dot={false} className="mt-2" />
                          ) : null}
                        </span>
                        <StatusBadge status={e.status} className="shrink-0" />
                      </Link>
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="calendario" className="mt-4">
          <Panel className="p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Object.entries(porData)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([data, itens]) => (
                  <div key={data} className="bg-surface rounded-xl p-4 ring-1 ring-black/5">
                    <p className="font-display text-sm font-semibold">{formatDate(data)}</p>
                    <ul className="mt-2 flex flex-col gap-2">
                      {itens.map((e) => (
                        <li key={e.id} className="flex items-start justify-between gap-2">
                          <div>
                            <Link
                              to="/admin/eventos/$id"
                              params={{ id: e.id }}
                              className="text-xs font-medium hover:underline"
                            >
                              {e.nome}
                            </Link>
                            <p className="text-muted-foreground text-[11px]">
                              {e.horaInicio
                                ? new Date(e.horaInicio).toLocaleTimeString("pt-BR", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "Horário a definir"}{" "}
                              · {e.localNome ?? "Local a definir"}
                            </p>
                          </div>
                          <StatusBadge status={e.status} dot={false} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}
