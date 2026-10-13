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
  createDocumento,
  listDocumentos,
  type CreateDocumentoInput,
  type DocumentoStatus,
  type DocumentoTipo,
} from "@/features/documentos/server-functions";
import { formatDate } from "@/lib/format";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/admin/documentos")({
  head: () => pageMeta("Documentos", "Centralize propostas, contratos e termos."),
  component: DocumentosPage,
});

const initialForm: CreateDocumentoInput = {
  titulo: "",
  tipo: "Contrato",
  cliente: "",
  status: "Pendente",
  vencimento: null,
  url: "",
};

function DocumentosPage() {
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState<CreateDocumentoInput>(initialForm);
  const query = useQuery({ queryKey: ["documentos"], queryFn: listDocumentos });
  const mutation = useMutation({
    mutationFn: createDocumento,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["documentos"] });
      setForm(initialForm);
      setAberto(false);
      toast.success("Documento cadastrado.");
    },
    onError: () => toast.error("Não foi possível cadastrar o documento."),
  });
  const lista = (query.data ?? []).filter((documento) =>
    [documento.titulo, documento.cliente, documento.tipo].some((valor) =>
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
        title="Documentos"
        subtitle="Propostas, contratos e termos em um só lugar"
        actions={
          <Button onClick={() => setAberto(true)}>
            <Plus className="size-4" />
            Novo documento
          </Button>
        }
      />
      <Panel className="p-5">
        <div className="relative max-w-sm">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por título, cliente ou tipo"
            className="bg-surface border-0 pl-9 ring-1 ring-black/5"
          />
        </div>
        {query.isPending ? (
          <LoadingState label="Carregando documentos…" />
        ) : query.isError ? (
          <ErrorState onRetry={() => void query.refetch()} />
        ) : lista.length === 0 ? (
          <EmptyState
            title="Nenhum documento encontrado"
            description="Ajuste a busca ou cadastre um novo documento."
            action={<Button onClick={() => setAberto(true)}>Novo documento</Button>}
          />
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="text-muted-foreground border-b border-border text-[11px] uppercase">
                  <th className="pb-2 font-medium">Documento</th>
                  <th className="pb-2 font-medium">Cliente</th>
                  <th className="pb-2 font-medium">Criado em</th>
                  <th className="pb-2 font-medium">Vencimento</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lista.map((documento) => (
                  <tr key={documento.id}>
                    <td className="py-3 pr-3 font-medium">
                      <a
                        href={documento.url}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline"
                      >
                        {documento.titulo}
                      </a>
                      <p className="text-muted-foreground text-[11px] font-normal">
                        {documento.tipo}
                      </p>
                    </td>
                    <td className="text-muted-foreground py-3 pr-3">{documento.cliente}</td>
                    <td className="text-muted-foreground py-3 pr-3">
                      {formatDate(documento.criadoEm)}
                    </td>
                    <td className="text-muted-foreground py-3 pr-3">
                      {documento.vencimento ? formatDate(documento.vencimento) : "Sem vencimento"}
                    </td>
                    <td className="py-3">
                      <StatusBadge status={documento.status} />
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
              <DialogTitle>Novo documento</DialogTitle>
              <DialogDescription>
                Cadastre os dados para vinculação posterior do arquivo.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="documento-titulo">Título</Label>
                <Input
                  id="documento-titulo"
                  required
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="documento-cliente">Cliente</Label>
                <Input
                  id="documento-cliente"
                  value={form.cliente}
                  onChange={(e) => setForm({ ...form, cliente: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="documento-url">URL do arquivo</Label>
                <Input
                  id="documento-url"
                  type="url"
                  required
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Tipo</Label>
                <Select
                  value={form.tipo}
                  onValueChange={(tipo) => setForm({ ...form, tipo: tipo as DocumentoTipo })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["Contrato", "Proposta", "Termo", "Outro"] as const).map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>
                        {tipo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(status) =>
                    setForm({ ...form, status: status as DocumentoStatus })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["Pendente", "Assinado", "Expirado"] as const).map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="documento-vencimento">Vencimento (opcional)</Label>
                <Input
                  id="documento-vencimento"
                  type="date"
                  value={form.vencimento ?? ""}
                  onChange={(e) => setForm({ ...form, vencimento: e.target.value || null })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAberto(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Salvando…" : "Salvar documento"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
