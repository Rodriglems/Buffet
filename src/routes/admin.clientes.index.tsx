import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MoreHorizontal, Plus, Search } from "lucide-react";

import { PageHeader, Panel } from "@/components/panel";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { clientes } from "@/data/mock";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/admin/clientes/")({
  head: () => ({
    meta: [
      { title: "Clientes — Mesa Buffet & Eventos" },
      {
        name: "description",
        content: "Cadastro e histórico de clientes do buffet, com eventos, orçamentos e contatos.",
      },
      { property: "og:title", content: "Clientes — Mesa Buffet & Eventos" },
      { property: "og:description", content: "Gerencie a base de clientes do seu buffet." },
    ],
  }),
  component: ClientesPage,
});

function ClientesPage() {
  const [busca, setBusca] = useState("");
  const lista = clientes.filter(
    (c) =>
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      c.documento.includes(busca) ||
      c.email.toLowerCase().includes(busca.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Clientes"
        subtitle={`${clientes.length} clientes cadastrados`}
        actions={
          <Button asChild>
            <Link to="/admin/clientes/novo">
              <Plus className="size-4" />
              Novo cliente
            </Link>
          </Button>
        }
      />

      <Panel className="p-5">
        <div className="relative max-w-sm">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, documento ou e-mail"
            className="bg-surface border-0 pl-9 ring-1 ring-black/5"
          />
        </div>

        {lista.length === 0 ? (
          <EmptyState
            title="Nenhum cliente encontrado"
            description="Ajuste a busca ou cadastre um novo cliente."
            action={
              <Button asChild size="sm">
                <Link to="/admin/clientes/novo">Novo cliente</Link>
              </Button>
            }
          />
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="text-muted-foreground border-b border-border text-[11px] tracking-wide uppercase">
                  <th className="pb-2 font-medium">Cliente</th>
                  <th className="pb-2 font-medium">CPF/CNPJ</th>
                  <th className="pb-2 font-medium">Telefone</th>
                  <th className="pb-2 font-medium">E-mail</th>
                  <th className="pb-2 font-medium">Eventos</th>
                  <th className="pb-2 font-medium">Último evento</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lista.map((c) => (
                  <tr key={c.id}>
                    <td className="py-3 pr-3">
                      <Link
                        to="/admin/clientes/$id"
                        params={{ id: c.id }}
                        className="font-medium hover:underline"
                      >
                        {c.nome}
                      </Link>
                      <p className="text-muted-foreground text-[11px]">{c.origem}</p>
                    </td>
                    <td className="text-muted-foreground py-3 pr-3">{c.documento}</td>
                    <td className="text-muted-foreground py-3 pr-3">{c.telefone}</td>
                    <td className="text-muted-foreground py-3 pr-3">{c.email}</td>
                    <td className="py-3 pr-3">{c.qtdEventos}</td>
                    <td className="text-muted-foreground py-3 pr-3">{formatDate(c.ultimoEvento)}</td>
                    <td className="py-3 pr-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Ações">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to="/admin/clientes/$id" params={{ id: c.id }}>
                              Visualizar
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to="/admin/clientes/novo">Editar</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to="/admin/clientes/$id" params={{ id: c.id }}>
                              Histórico
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to="/admin/eventos/novo">Criar evento</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to="/admin/orcamentos/novo">Criar orçamento</Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
