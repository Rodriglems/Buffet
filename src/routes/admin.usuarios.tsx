import { type FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { KeyRound, Plus, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, Panel } from "@/components/panel";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PermissoesDialog } from "@/features/usuarios/permissoes-dialog";
import {
  RedefinirSenhaDialog,
  type AlvoRedefinicao,
} from "@/features/usuarios/redefinir-senha-dialog";
import {
  createUsuario,
  listUsuarios,
  type CreateUsuarioInput,
  type Usuario,
  type UsuarioStatus,
} from "@/features/usuarios/server-functions";
import { pageMeta } from "@/lib/meta";
import { usePlaceholderBusca } from "@/lib/placeholder-busca";
import { InputSenha } from "@/components/input-senha";

export const Route = createFileRoute("/admin/usuarios")({
  head: () => pageMeta("Usuários", "Gerencie os acessos e perfis da equipe."),
  component: UsuariosPage,
});

const initialForm: CreateUsuarioInput = {
  nome: "",
  email: "",
  perfil: "Administrador",
  status: "Ativo",
  senha: "",
  clienteId: null,
};

function UsuariosPage() {
  const placeholderBusca = usePlaceholderBusca("Buscar por nome, e-mail ou perfil");
  const { usuario: atual } = useRouteContext({ from: "/admin" });
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [permissoesDe, setPermissoesDe] = useState<Usuario | null>(null);
  const [senhaDe, setSenhaDe] = useState<AlvoRedefinicao | null>(null);
  const [form, setForm] = useState<CreateUsuarioInput>(initialForm);
  const query = useQuery({ queryKey: ["usuarios"], queryFn: listUsuarios });
  const mutation = useMutation({
    mutationFn: createUsuario,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      setForm(initialForm);
      setAberto(false);
      toast.success("Usuário cadastrado. O acesso já vale com o e-mail e a senha informados.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível cadastrar o usuário."),
  });
  const lista = (query.data ?? []).filter((usuario) =>
    [usuario.nome, usuario.email, usuario.perfil].some((valor) =>
      valor.toLowerCase().includes(busca.toLowerCase()),
    ),
  );

  function submit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate(form);
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Usuários"
        subtitle="Controle os acessos da equipe administrativa"
        actions={
          <Button onClick={() => setAberto(true)}>
            <Plus className="size-4" />
            Cadastrar usuário
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
        {query.isPending ? (
          <LoadingState label="Carregando usuários…" />
        ) : query.isError ? (
          <ErrorState onRetry={() => void query.refetch()} />
        ) : lista.length === 0 ? (
          <EmptyState
            title="Nenhum usuário encontrado"
            description="Ajuste a busca ou convide uma pessoa da equipe."
            action={<Button onClick={() => setAberto(true)}>Cadastrar usuário</Button>}
          />
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full sm:min-w-[680px] text-left text-sm">
              <thead>
                <tr className="text-muted-foreground border-b border-border text-[11px] uppercase">
                  <th className="pb-2 font-medium">Usuário</th>
                  <th className="pb-2 font-medium max-sm:hidden">Perfil</th>
                  <th className="pb-2 font-medium max-sm:hidden">Último acesso</th>
                  <th className="pb-2 font-medium max-sm:hidden">Status</th>
                  <th className="pb-2 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lista.map((usuario) => (
                  <tr key={usuario.id}>
                    <td className="py-3 pr-3 font-medium">
                      {usuario.nome}
                      <p className="text-muted-foreground text-[11px] font-normal break-all">
                        {usuario.email}
                      </p>
                      <p className="text-muted-foreground text-xs font-normal sm:hidden">
                        {usuario.perfil} · {usuario.status}
                      </p>
                    </td>
                    <td className="text-muted-foreground py-3 pr-3 max-sm:hidden">
                      {usuario.perfil}
                    </td>
                    <td className="text-muted-foreground py-3 pr-3 max-sm:hidden">
                      {usuario.ultimoAcesso
                        ? new Intl.DateTimeFormat("pt-BR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          }).format(new Date(usuario.ultimoAcesso))
                        : "Ainda não acessou"}
                    </td>
                    <td className="py-3 max-sm:hidden">
                      <StatusBadge status={usuario.status} />
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          aria-label={`Redefinir a senha de ${usuario.nome}`}
                          title="Redefinir senha"
                          onClick={() =>
                            setSenhaDe({
                              usuarioId: usuario.id,
                              nome: usuario.nome,
                              perfil: usuario.perfil === "Cliente" ? "CLIENT" : "ADMIN",
                            })
                          }
                        >
                          <KeyRound className="size-4" />
                          <span className="hidden sm:inline">Redefinir senha</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          aria-label={`Permissões de ${usuario.nome}`}
                          title="Permissões"
                          onClick={() => setPermissoesDe(usuario)}
                        >
                          <ShieldCheck className="size-4" />
                          <span className="hidden sm:inline">Permissões</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent>
          <form onSubmit={submit} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Cadastrar usuário</DialogTitle>
              <DialogDescription>
                A pessoa entra com o e-mail e a senha definidos aqui. Nenhum e-mail é enviado.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="usuario-nome">Nome</Label>
                <Input
                  id="usuario-nome"
                  required
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="usuario-email">E-mail</Label>
                <Input
                  id="usuario-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="usuario-senha">Senha</Label>
                <InputSenha
                  id="usuario-senha"
                  autoComplete="new-password"
                  minLength={12}
                  required
                  value={form.senha}
                  onChange={(e) => setForm({ ...form, senha: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(status) => setForm({ ...form, status: status as UsuarioStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAberto(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Salvando…" : "Cadastrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <RedefinirSenhaDialog
        alvo={senhaDe}
        onOpenChange={(aberto) => {
          if (!aberto) setSenhaDe(null);
        }}
        onConcluido={() => queryClient.invalidateQueries({ queryKey: ["usuarios"] })}
      />
      {permissoesDe ? (
        <PermissoesDialog
          aberto
          onOpenChange={(next) => {
            if (!next) setPermissoesDe(null);
          }}
          proprio={permissoesDe.id === atual.usuarioId}
          usuario={{
            id: permissoesDe.id,
            nome: permissoesDe.nome,
            role: permissoesDe.perfil === "Cliente" ? "CLIENT" : "ADMIN",
            permissoes: permissoesDe.permissoes,
          }}
        />
      ) : null}
    </div>
  );
}
