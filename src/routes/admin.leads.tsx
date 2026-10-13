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
  createLead,
  listLeads,
  type CreateLeadInput,
  type LeadStatus,
} from "@/features/leads/server-functions";
import { formatDate } from "@/lib/format";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/admin/leads")({
  head: () => pageMeta("Leads", "Acompanhe oportunidades e novos contatos comerciais."),
  component: LeadsPage,
});

const initialForm: CreateLeadInput = {
  nome: "",
  contato: "",
  interesse: "",
  origem: "",
  status: "Novo",
};

function LeadsPage() {
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState<CreateLeadInput>(initialForm);
  const query = useQuery({ queryKey: ["leads"], queryFn: listLeads });
  const mutation = useMutation({
    mutationFn: createLead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["leads"] });
      setForm(initialForm);
      setAberto(false);
      toast.success("Lead cadastrado.");
    },
    onError: () => toast.error("Não foi possível cadastrar o lead."),
  });

  const lista = (query.data ?? []).filter((lead) =>
    [lead.nome, lead.contato, lead.interesse].some((valor) =>
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
        title="Leads"
        subtitle="Organize os contatos até a conversão em cliente"
        actions={
          <Button onClick={() => setAberto(true)}>
            <Plus className="size-4" />
            Novo lead
          </Button>
        }
      />
      <Panel className="p-5">
        <div className="relative max-w-sm">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por nome, contato ou interesse"
            className="bg-surface border-0 pl-9 ring-1 ring-black/5"
          />
        </div>
        {query.isPending ? (
          <LoadingState label="Carregando leads…" />
        ) : query.isError ? (
          <ErrorState onRetry={() => void query.refetch()} />
        ) : lista.length === 0 ? (
          <EmptyState
            title="Nenhum lead encontrado"
            description="Ajuste a busca ou cadastre uma nova oportunidade."
            action={<Button onClick={() => setAberto(true)}>Novo lead</Button>}
          />
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="text-muted-foreground border-b border-border text-[11px] uppercase">
                  <th className="pb-2 font-medium">Lead</th>
                  <th className="pb-2 font-medium">Interesse</th>
                  <th className="pb-2 font-medium">Origem</th>
                  <th className="pb-2 font-medium">Entrada</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lista.map((lead) => (
                  <tr key={lead.id}>
                    <td className="py-3 pr-3 font-medium">
                      {lead.nome}
                      <p className="text-muted-foreground text-[11px] font-normal">
                        {lead.contato}
                      </p>
                    </td>
                    <td className="text-muted-foreground py-3 pr-3">{lead.interesse}</td>
                    <td className="py-3 pr-3">{lead.origem}</td>
                    <td className="text-muted-foreground py-3 pr-3">{formatDate(lead.criadoEm)}</td>
                    <td className="py-3">
                      <StatusBadge status={lead.status} />
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
              <DialogTitle>Novo lead</DialogTitle>
              <DialogDescription>Registre o contato e o interesse inicial.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="lead-nome">Nome</Label>
                <Input
                  id="lead-nome"
                  required
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="lead-contato">Telefone ou e-mail</Label>
                <Input
                  id="lead-contato"
                  required
                  value={form.contato}
                  onChange={(e) => setForm({ ...form, contato: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="lead-origem">Origem</Label>
                <Input
                  id="lead-origem"
                  required
                  placeholder="Instagram, indicação…"
                  value={form.origem}
                  onChange={(e) => setForm({ ...form, origem: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(status) => setForm({ ...form, status: status as LeadStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["Novo", "Em contato", "Qualificado", "Convertido"] as const).map(
                      (status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="lead-interesse">Interesse</Label>
                <Textarea
                  id="lead-interesse"
                  required
                  value={form.interesse}
                  onChange={(e) => setForm({ ...form, interesse: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAberto(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Salvando…" : "Salvar lead"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
