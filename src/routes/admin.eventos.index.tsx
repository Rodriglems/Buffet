import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, List, Plus } from "lucide-react";

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
import { eventos, nomeCliente } from "@/data/mock";
import { formatBRL, formatDate } from "@/lib/format";

export const Route = createFileRoute("/admin/eventos/")({
  head: () => ({
    meta: [
      { title: "Eventos — Mesa Buffet & Eventos" },
      {
        name: "description",
        content: "Gerencie todos os eventos do buffet em lista ou calendário, com filtros e status.",
      },
      { property: "og:title", content: "Eventos — Mesa Buffet & Eventos" },
      { property: "og:description", content: "Lista e calendário de eventos do buffet." },
    ],
  }),
  component: EventosPage,
});

const TODOS = "todos";

function EventosPage() {
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState(TODOS);
  const [status, setStatus] = useState(TODOS);

  const lista = eventos.filter(
    (e) =>
      (e.nome.toLowerCase().includes(busca.toLowerCase()) ||
        nomeCliente(e.clienteId).toLowerCase().includes(busca.toLowerCase())) &&
      (tipo === TODOS || e.tipo === tipo) &&
      (status === TODOS || e.status === status),
  );

  const tipos = Array.from(new Set(eventos.map((e) => e.tipo)));
  const statusList = Array.from(new Set(eventos.map((e) => e.status)));

  // Calendário simples do mês com maior concentração de eventos.
  const porData = lista.reduce<Record<string, typeof eventos>>((acc, e) => {
    (acc[e.data] ||= []).push(e);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Eventos"
        subtitle={`${eventos.length} eventos cadastrados`}
        actions={
          <Button asChild>
            <Link to="/admin/eventos/novo">
              <Plus className="size-4" />
              Novo evento
            </Link>
          </Button>
        }
      />

      <Panel className="p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por evento ou cliente"
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
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" className="bg-surface border-0 ring-1 ring-black/5" />
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
              <EmptyState title="Nenhum evento encontrado" description="Ajuste os filtros aplicados." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[840px] text-left text-sm">
                  <thead>
                    <tr className="text-muted-foreground border-b border-border text-[11px] uppercase">
                      <th className="pb-2 font-medium">Evento</th>
                      <th className="pb-2 font-medium">Cliente</th>
                      <th className="pb-2 font-medium">Data</th>
                      <th className="pb-2 font-medium">Local</th>
                      <th className="pb-2 font-medium">Convidados</th>
                      <th className="pb-2 font-medium">Valor</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {lista.map((e) => (
                      <tr key={e.id}>
                        <td className="py-3 pr-3">
                          <Link to="/admin/eventos/$id" params={{ id: e.id }} className="font-medium hover:underline">
                            {e.nome}
                          </Link>
                          <p className="text-muted-foreground text-[11px]">{e.tipo}</p>
                        </td>
                        <td className="text-muted-foreground py-3 pr-3">{nomeCliente(e.clienteId)}</td>
                        <td className="text-muted-foreground py-3 pr-3">{formatDate(e.data)}</td>
                        <td className="text-muted-foreground py-3 pr-3">{e.local}</td>
                        <td className="py-3 pr-3">{e.convidados}</td>
                        <td className="py-3 pr-3 font-medium">{formatBRL(e.valor)}</td>
                        <td className="py-3">
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
                            <Link to="/admin/eventos/$id" params={{ id: e.id }} className="text-xs font-medium hover:underline">
                              {e.nome}
                            </Link>
                            <p className="text-muted-foreground text-[11px]">
                              {e.horaInicio}–{e.horaFim} · {e.local}
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
