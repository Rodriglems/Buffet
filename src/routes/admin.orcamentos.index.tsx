import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";

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
import { nomeCliente, nomeEvento, orcamentos, totalOrcamento } from "@/data/mock";
import { formatBRL, formatDate } from "@/lib/format";

export const Route = createFileRoute("/admin/orcamentos/")({
  head: () => ({
    meta: [
      { title: "Orçamentos — Mesa Buffet & Eventos" },
      {
        name: "description",
        content: "Controle de propostas comerciais: versões, validade, status e valores por evento.",
      },
      { property: "og:title", content: "Orçamentos — Mesa Buffet & Eventos" },
      { property: "og:description", content: "Gestão de propostas e negociações do buffet." },
    ],
  }),
  component: OrcamentosPage,
});

const TODOS = "todos";

function OrcamentosPage() {
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState(TODOS);

  const lista = orcamentos.filter(
    (o) =>
      (o.codigo.toLowerCase().includes(busca.toLowerCase()) ||
        nomeCliente(o.clienteId).toLowerCase().includes(busca.toLowerCase())) &&
      (status === TODOS || o.status === status),
  );
  const statusList = Array.from(new Set(orcamentos.map((o) => o.status)));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Orçamentos"
        subtitle={`${orcamentos.length} propostas registradas`}
        actions={
          <Button asChild>
            <Link to="/admin/orcamentos/novo">
              <Plus className="size-4" />
              Novo orçamento
            </Link>
          </Button>
        }
      />

      <Panel className="p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por código ou cliente"
            className="bg-surface border-0 ring-1 ring-black/5"
          />
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
        </div>

        {lista.length === 0 ? (
          <EmptyState title="Nenhum orçamento encontrado" description="Ajuste os filtros aplicados." />
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead>
                <tr className="text-muted-foreground border-b border-border text-[11px] uppercase">
                  <th className="pb-2 font-medium">Código</th>
                  <th className="pb-2 font-medium">Cliente</th>
                  <th className="pb-2 font-medium">Evento</th>
                  <th className="pb-2 font-medium">Data</th>
                  <th className="pb-2 font-medium">Valor</th>
                  <th className="pb-2 font-medium">Versão</th>
                  <th className="pb-2 font-medium">Validade</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lista.map((o) => (
                  <tr key={o.id}>
                    <td className="py-3 pr-3">
                      <Link to="/admin/orcamentos/$id" params={{ id: o.id }} className="font-medium hover:underline">
                        {o.codigo}
                      </Link>
                    </td>
                    <td className="text-muted-foreground py-3 pr-3">{nomeCliente(o.clienteId)}</td>
                    <td className="text-muted-foreground py-3 pr-3">{nomeEvento(o.eventoId)}</td>
                    <td className="text-muted-foreground py-3 pr-3">{formatDate(o.data)}</td>
                    <td className="py-3 pr-3 font-medium">{formatBRL(totalOrcamento(o).total)}</td>
                    <td className="py-3 pr-3">v{o.versao}</td>
                    <td className="text-muted-foreground py-3 pr-3">{formatDate(o.validade)}</td>
                    <td className="py-3">
                      <StatusBadge status={o.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
