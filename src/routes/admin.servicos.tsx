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
import { Textarea } from "@/components/ui/textarea";
import {
  createServico,
  listServicos,
  type CreateServicoInput,
  type ServicoStatus,
} from "@/features/servicos/server-functions";
import { formatBRL } from "@/lib/format";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/admin/servicos")({
  head: () => pageMeta("Serviços", "Cadastre os serviços oferecidos pelo buffet."),
  component: ServicosPage,
});

const initialForm: CreateServicoInput = {
  nome: "",
  categoria: "",
  descricao: "",
  valorBase: 0,
  unidade: "por evento",
  status: "Ativo",
};

function ServicosPage() {
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState<CreateServicoInput>(initialForm);
  const query = useQuery({ queryKey: ["servicos"], queryFn: listServicos });
  const mutation = useMutation({
    mutationFn: createServico,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["servicos"] });
      setForm(initialForm);
      setAberto(false);
      toast.success("Serviço cadastrado.");
    },
    onError: () => toast.error("Não foi possível cadastrar o serviço."),
  });
  const lista = (query.data ?? []).filter((servico) =>
    [servico.nome, servico.categoria, servico.descricao].some((valor) =>
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
        title="Serviços"
        subtitle="Catálogo de itens usados em propostas e eventos"
        actions={
          <Button onClick={() => setAberto(true)}>
            <Plus className="size-4" />
            Novo serviço
          </Button>
        }
      />
      <Panel className="p-5">
        <div className="relative max-w-sm">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar serviços"
            className="bg-surface border-0 pl-9 ring-1 ring-black/5"
          />
        </div>
        {query.isPending ? (
          <LoadingState label="Carregando serviços…" />
        ) : query.isError ? (
          <ErrorState onRetry={() => void query.refetch()} />
        ) : lista.length === 0 ? (
          <EmptyState
            title="Nenhum serviço encontrado"
            description="Cadastre o primeiro item do catálogo."
            action={<Button onClick={() => setAberto(true)}>Novo serviço</Button>}
          />
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="text-muted-foreground border-b border-border text-[11px] uppercase">
                  <th className="pb-2 font-medium">Serviço</th>
                  <th className="pb-2 font-medium">Categoria</th>
                  <th className="pb-2 font-medium">Valor base</th>
                  <th className="pb-2 font-medium">Unidade</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lista.map((servico) => (
                  <tr key={servico.id}>
                    <td className="py-3 pr-3 font-medium">
                      {servico.nome}
                      <p className="text-muted-foreground max-w-sm truncate text-[11px] font-normal">
                        {servico.descricao}
                      </p>
                    </td>
                    <td className="text-muted-foreground py-3 pr-3">{servico.categoria}</td>
                    <td className="py-3 pr-3 font-medium">{formatBRL(servico.valorBase)}</td>
                    <td className="text-muted-foreground py-3 pr-3">{servico.unidade}</td>
                    <td className="py-3">
                      <StatusBadge status={servico.status} />
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
              <DialogTitle>Novo serviço</DialogTitle>
              <DialogDescription>Adicione um item ao catálogo comercial.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="servico-nome">Nome</Label>
                <Input
                  id="servico-nome"
                  required
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="servico-categoria">Categoria</Label>
                <Input
                  id="servico-categoria"
                  required
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="servico-valor">Valor base</Label>
                <Input
                  id="servico-valor"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={form.valorBase || ""}
                  onChange={(e) => setForm({ ...form, valorBase: Number(e.target.value) })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="servico-unidade">Unidade</Label>
                <Input
                  id="servico-unidade"
                  required
                  placeholder="por pessoa, por evento…"
                  value={form.unidade}
                  onChange={(e) => setForm({ ...form, unidade: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(status) => setForm({ ...form, status: status as ServicoStatus })}
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
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="servico-descricao">Descrição</Label>
                <Textarea
                  id="servico-descricao"
                  required
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAberto(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Salvando…" : "Salvar serviço"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
