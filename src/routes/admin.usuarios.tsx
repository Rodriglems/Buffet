import { type FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
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
import {
  createUsuario,
  listUsuarios,
  type CreateUsuarioInput,
  type UsuarioPerfil,
  type UsuarioStatus,
} from "@/features/usuarios/server-functions";
import { pageMeta } from "@/lib/meta";

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
};

function UsuariosPage() {
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState<CreateUsuarioInput>(initialForm);
  const query = useQuery({ queryKey: ["usuarios"], queryFn: listUsuarios });
  const mutation = useMutation({
    mutationFn: createUsuario,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      setForm(initialForm);
      setAberto(false);
      toast.success("Usuário convidado.");
    },
    onError: () => toast.error("Não foi possível convidar o usuário."),
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
            Convidar usuário
          </Button>
        }
      />
      <Panel className="p-5">
        <div className="relative max-w-sm">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, e-mail ou perfil"
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
            action={<Button onClick={() => setAberto(true)}>Convidar usuário</Button>}
          />
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="text-muted-foreground border-b border-border text-[11px] uppercase">
                  <th className="pb-2 font-medium">Usuário</th>
                  <th className="pb-2 font-medium">Perfil</th>
                  <th className="pb-2 font-medium">Último acesso</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lista.map((usuario) => (
                  <tr key={usuario.id}>
                    <td className="py-3 pr-3 font-medium">
                      {usuario.nome}
                      <p className="text-muted-foreground text-[11px] font-normal">
                        {usuario.email}
                      </p>
                    </td>
                    <td className="text-muted-foreground py-3 pr-3">{usuario.perfil}</td>
                    <td className="text-muted-foreground py-3 pr-3">
                      {usuario.ultimoAcesso
                        ? new Intl.DateTimeFormat("pt-BR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          }).format(new Date(usuario.ultimoAcesso))
                        : "Convite pendente"}
                    </td>
                    <td className="py-3">
                      <StatusBadge status={usuario.status} />
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
              <DialogTitle>Convidar usuário</DialogTitle>
              <DialogDescription>
                Defina o perfil inicial de acesso à administração.
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
                <Label htmlFor="usuario-senha">Senha temporária</Label>
                <Input
                  id="usuario-senha"
                  type="password"
                  minLength={12}
                  required
                  value={form.senha}
                  onChange={(e) => setForm({ ...form, senha: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Perfil</Label>
                <Select
                  value={form.perfil}
                  onValueChange={(perfil) => setForm({ ...form, perfil: perfil as UsuarioPerfil })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Administrador">Administrador</SelectItem>
                  </SelectContent>
                </Select>
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
                {mutation.isPending ? "Enviando…" : "Enviar convite"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
