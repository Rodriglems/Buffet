import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Copy, ExternalLink, Plus } from "lucide-react";
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
import { listarOrcamentos } from "@/features/orcamentos/server-functions";
import { obterLinkFormularioOrcamento } from "@/features/orcamentos/solicitacao-publica";
import { formatBRL, formatDate } from "@/lib/format";
import { usePlaceholderBusca } from "@/lib/placeholder-busca";
import { copiarTexto } from "@/lib/copiar-texto";

export const Route = createFileRoute("/admin/orcamentos/")({
  head: () => ({
    meta: [
      { title: "Orçamentos — Mesly Buffet & Eventos" },
      {
        name: "description",
        content:
          "Controle de propostas comerciais: versões, validade, status e valores por evento.",
      },
      { property: "og:title", content: "Orçamentos — Mesly Buffet & Eventos" },
      { property: "og:description", content: "Gestão de propostas e negociações do buffet." },
    ],
  }),
  loader: async () => {
    const [orcamentos, formulario] = await Promise.all([
      listarOrcamentos({ data: { page: 1, pageSize: 100 } }),
      obterLinkFormularioOrcamento(),
    ]);
    return { orcamentos, formulario };
  },
  component: OrcamentosPage,
});

const TODOS = "todos";

function OrcamentosPage() {
  const placeholderBusca = usePlaceholderBusca("Buscar por código ou cliente");
  const { orcamentos: resultado, formulario } = Route.useLoaderData();
  const orcamentos = resultado.items;
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState(TODOS);

  const lista = orcamentos.filter(
    (o) =>
      (o.numero.toString().includes(busca) ||
        o.evento.cliente.nome.toLowerCase().includes(busca.toLowerCase())) &&
      (status === TODOS || o.status === status),
  );
  const statusList = Array.from(new Set(orcamentos.map((o) => o.status)));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Orçamentos"
        subtitle={`${orcamentos.length} propostas registradas`}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => {
                const link = `${window.location.origin}/solicitar-orcamento/${formulario.token}`;
                void copiarTexto(link).then(
                  () => toast.success("Link copiado. Envie-o ao cliente para preencher os dados."),
                  () => toast.error("Não foi possível copiar o link."),
                );
              }}
            >
              <Copy className="size-4" /> Link para o cliente
            </Button>
            <Button variant="outline" asChild>
              <a href={`/solicitar-orcamento/${formulario.token}`} target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" /> Abrir formulário
              </a>
            </Button>
            <Button asChild>
              <Link to="/admin/orcamentos/novo">
                <Plus className="size-4" />
                Novo orçamento
              </Link>
            </Button>
          </>
        }
      />

      <Panel className="p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={placeholderBusca}
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
          <EmptyState
            title="Nenhum orçamento encontrado"
            description="Ajuste os filtros aplicados."
          />
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full sm:min-w-[880px] text-left text-sm">
              <thead>
                <tr className="text-muted-foreground border-b border-border text-[11px] uppercase">
                  <th className="pb-2 font-medium">Código</th>
                  <th className="pb-2 font-medium max-sm:hidden">Cliente</th>
                  <th className="pb-2 font-medium max-sm:hidden">Evento</th>
                  <th className="pb-2 font-medium max-sm:hidden">Data</th>
                  <th className="pb-2 font-medium">Valor</th>
                  <th className="pb-2 font-medium max-sm:hidden">Versão</th>
                  <th className="pb-2 font-medium max-sm:hidden">Validade</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lista.map((o) => (
                  <tr key={o.id}>
                    <td className="py-3 pr-3">
                      <Link
                        to="/admin/orcamentos/$id"
                        params={{ id: o.id }}
                        className="font-medium hover:underline"
                      >
                        #{o.numero.toString()}
                      </Link>
                      <p className="text-muted-foreground text-xs sm:hidden">
                        {o.evento.cliente.nome} · {formatDate(o.createdAt)}
                      </p>
                    </td>
                    <td className="text-muted-foreground py-3 pr-3 max-sm:hidden">
                      {o.evento.cliente.nome}
                    </td>
                    <td className="text-muted-foreground py-3 pr-3 max-sm:hidden">
                      {o.evento.nome}
                    </td>
                    <td className="text-muted-foreground py-3 pr-3 max-sm:hidden">
                      {formatDate(o.createdAt)}
                    </td>
                    <td className="py-3 pr-3 font-medium whitespace-nowrap">
                      {formatBRL(Number(o.total))}
                    </td>
                    <td className="py-3 pr-3 max-sm:hidden">v{o.versao}</td>
                    <td className="text-muted-foreground py-3 pr-3 max-sm:hidden">
                      {o.validade ? formatDate(o.validade) : "—"}
                    </td>
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
