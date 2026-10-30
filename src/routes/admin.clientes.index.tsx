import { useState } from "react";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, MoreHorizontal, Plus, Search, Trash2 } from "lucide-react";
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
import {
  RedefinirSenhaDialog,
  type AlvoRedefinicao,
} from "@/features/usuarios/redefinir-senha-dialog";
import { useConfirmar } from "@/lib/confirmacao";
import { formatDate } from "@/lib/format";
import { telefoneDe } from "@/lib/empresa-cabecalho";
import { usePlaceholderBusca } from "@/lib/placeholder-busca";

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
  const placeholderBusca = usePlaceholderBusca("Buscar por nome, documento ou e-mail");
  const router = useRouter();
  const navigate = useNavigate();
  const excluir = useServerFn(excluirCliente);
  const [busca, setBusca] = useState("");
  const { items: clientes } = Route.useLoaderData();
  const confirmar = useConfirmar();
  const [senhaDe, setSenhaDe] = useState<AlvoRedefinicao | null>(null);

  async function remover(id: string, nome: string) {
    const ok = await confirmar({
      titulo: `Excluir o cliente ${nome}?`,
      descricao: "Essa ação não pode ser desfeita.",
      textoConfirmar: "Excluir cliente",
      perigoso: true,
    });
    if (!ok) return;
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
            placeholder={placeholderBusca}
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
            <table className="w-full sm:min-w-[860px] text-left text-sm">
              <thead>
                <tr className="text-muted-foreground border-b border-border text-[11px] tracking-wide uppercase">
                  <th className="pb-2 font-medium">Cliente</th>
                  <th className="pb-2 font-medium max-sm:hidden">CPF/CNPJ</th>
                  <th className="pb-2 font-medium max-sm:hidden">Telefone</th>
                  <th className="pb-2 font-medium max-sm:hidden">E-mail</th>
                  <th className="pb-2 font-medium max-sm:hidden">Eventos</th>
                  <th className="pb-2 font-medium max-sm:hidden">Cadastro</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lista.map((c) => (
                  <tr
                    key={c.id}
                    // A linha inteira abre o cadastro; botões e links dentro dela seguem normais.
                    className="hover:bg-accent/40 cursor-pointer"
                    onClick={(evento) => {
                      if ((evento.target as HTMLElement).closest("a, button, [role=menu]")) return;
                      void navigate({ to: "/admin/clientes/$id", params: { id: c.id } });
                    }}
                  >
                    <td className="py-3 pr-3">
                      <Link
                        to="/admin/clientes/$id"
                        params={{ id: c.id }}
                        className="font-medium hover:underline"
                      >
                        {c.nome}
                      </Link>
                      <p className="text-muted-foreground text-[11px] max-sm:hidden">
                        {c.tipoPessoa === "FISICA" ? "Pessoa física" : "Pessoa jurídica"}
                      </p>
                      {/* No celular, telefone e e-mail aparecem um embaixo do outro. */}
                      <div className="text-muted-foreground text-xs sm:hidden">
                        {telefoneDe(c.telefone ?? c.whatsapp) ? (
                          <p>{telefoneDe(c.telefone ?? c.whatsapp)}</p>
                        ) : null}
                        {c.email ? <p className="break-all">{c.email}</p> : null}
                        {!c.telefone && !c.whatsapp && !c.email ? <p>Sem contato</p> : null}
                      </div>
                    </td>
                    <td className="text-muted-foreground py-3 pr-3 max-sm:hidden">
                      {c.cpfCnpj ?? "—"}
                    </td>
                    <td className="text-muted-foreground py-3 pr-3 max-sm:hidden">
                      {telefoneDe(c.telefone ?? c.whatsapp) ?? "—"}
                    </td>
                    <td className="text-muted-foreground py-3 pr-3 max-sm:hidden">
                      {c.email ?? "—"}
                    </td>
                    <td className="py-3 pr-3 max-sm:hidden">{c._count.eventos}</td>
                    <td className="text-muted-foreground py-3 pr-3 max-sm:hidden">
                      {formatDate(c.createdAt)}
                    </td>
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
                          <DropdownMenuItem
                            onSelect={() =>
                              setSenhaDe({
                                clienteId: c.id,
                                nome: c.nome,
                                perfil: "CLIENT",
                                criarAcesso: !c.usuarioId,
                              })
                            }
                          >
                            <KeyRound className="size-4" />
                            {c.usuarioId ? "Redefinir senha" : "Criar acesso ao portal"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onSelect={() => void remover(c.id, c.nome)}
                          >
                            <Trash2 className="size-4" />
                            Excluir
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
      <RedefinirSenhaDialog
        alvo={senhaDe}
        onOpenChange={(aberto) => {
          if (!aberto) setSenhaDe(null);
        }}
        onConcluido={() => router.invalidate()}
      />
    </div>
  );
}
