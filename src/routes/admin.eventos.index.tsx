import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Copy, ExternalLink, List } from "lucide-react";
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
      listarEventos({ data: { page: 1, pageSize: 100 } }),
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
          <>
            {/* No celular o botão de copiar mostra só o ícone; o do formulário é o principal. */}
            <Button
              variant="outline"
              aria-label="Copiar link do formulário de orçamento"
              title="Copiar link do formulário"
              onClick={() => {
                const link = `${window.location.origin}/solicitar-orcamento/${formulario.token}`;
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
              <span className="hidden sm:inline">Copiar link</span>
            </Button>
            <Button asChild>
              <a href={`/solicitar-orcamento/${formulario.token}`} target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" />
                Abrir formulário
              </a>
            </Button>
          </>
        }
      />
      <Panel className="p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={placeholderBusca}
            className="bg-surface border-0 ring-1 ring-black/5"
          />
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger className="bg-surface w-full border-0 ring-1 ring-black/5">
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
            <SelectTrigger className="bg-surface w-full border-0 ring-1 ring-black/5">
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
            value={data}
            onChange={(event) => setData(event.target.value)}
            className="bg-surface border-0 ring-1 ring-black/5"
          />
          <Select value={ordem} onValueChange={setOrdem}>
            <SelectTrigger className="bg-surface w-full border-0 ring-1 ring-black/5">
              <SelectValue placeholder="Ordenar registros" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={MAIS_RECENTES}>Registros mais recentes</SelectItem>
              <SelectItem value={MAIS_ANTIGOS}>Registros mais antigos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Panel>

      <Tabs defaultValue="lista">
        <TabsList>
          <TabsTrigger value="lista">
            <List className="size-4" /> Lista
          </TabsTrigger>
          <TabsTrigger value="calendario">
            <CalendarDays className="size-4" /> Calendário
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="mt-4">
          <Panel className="p-5">
            {lista.length === 0 ? (
              <EmptyState
                title="Nenhum evento encontrado"
                description="Ajuste os filtros aplicados."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full sm:min-w-[840px] text-left text-sm">
                  <thead>
                    <tr className="text-muted-foreground border-b border-border text-[11px] uppercase">
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
                          {e.orcamentos[0] ? (
                            <p className="text-xs font-medium sm:hidden">
                              {formatBRL(Number(e.orcamentos[0].total))}
                            </p>
                          ) : null}
                        </td>
                        <td className="text-muted-foreground py-3 pr-3 max-sm:hidden">
                          {e.cliente.nome}
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
                        <td className="py-3 text-right sm:text-left">
                          <StatusBadge status={e.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
