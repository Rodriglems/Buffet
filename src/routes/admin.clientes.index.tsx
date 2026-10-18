import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { MoreHorizontal, Plus, Search } from "lucide-react";
import { toast } from "sonner";

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
import { excluirCliente, listarClientes } from "@/features/clientes/server-functions";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/admin/clientes/")({
  head: () => ({
    meta: [
      { title: "Clientes — Mesly Buffet & Eventos" },
      {
        name: "description",
        content: "Clientes do buffet, com telefone, e-mail e histórico de eventos.",
      },
      { property: "og:title", content: "Clientes — Mesly Buffet & Eventos" },
      { property: "og:description", content: "Gerencie a base de clientes do seu buffet." },
    ],
  }),
  loader: () => listarClientes({ data: { page: 1, pageSize: 100, busca: "" } }),
  component: ClientesPage,
});

function ClientesPage() {
  const router = useRouter();
  const excluir = useServerFn(excluirCliente);
  const [busca, setBusca] = useState("");
  const { items: clientes } = Route.useLoaderData();

  async function remover(id: string, nome: string) {
    if (!window.confirm(`Excluir o cliente ${nome}?`)) return;
    try {
      await excluir({ data: { id } });
      toast.success("Cliente excluído.");
      await router.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível excluir o cliente.");
    }
  }
  const lista = clientes.filter(
    (c) =>
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (c.cpfCnpj ?? "").includes(busca) ||
      (c.email ?? "").toLowerCase().includes(busca.toLowerCase()),
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
                  <th className="pb-2 font-medium">Cadastro</th>
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
                      <p className="text-muted-foreground text-[11px]">
                        {c.tipoPessoa === "FISICA" ? "Pessoa física" : "Pessoa jurídica"}
                      </p>
                    </td>
                    <td className="text-muted-foreground py-3 pr-3">{c.cpfCnpj ?? "—"}</td>
                    <td className="text-muted-foreground py-3 pr-3">
                      {c.telefone ?? c.whatsapp ?? "—"}
                    </td>
                    <td className="text-muted-foreground py-3 pr-3">{c.email ?? "—"}</td>
                    <td className="py-3 pr-3">{c._count.eventos}</td>
                    <td className="text-muted-foreground py-3 pr-3">{formatDate(c.createdAt)}</td>
                    <td className="py-3 pr-3">
                      <StatusBadge status="Ativo" />
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
                            <Link to="/admin/clientes/$id" params={{ id: c.id }}>
                              Editar
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => void remover(c.id, c.nome)}>
                            Excluir
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
