import { useState, type FormEvent } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { FinanceiroTabs } from "@/components/layout/section-nav";
import { PageHeader, Panel, PanelHeader } from "@/components/panel";
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
import { criarCusto, listarCustos } from "@/features/custos/server-functions";
import { listarEventos } from "@/features/eventos/server-functions";
import { formatBRL, formatDate } from "@/lib/format";

export const Route = createFileRoute("/admin/custos")({
  head: () => ({
    meta: [
      { title: "Custos — Mesly Buffet & Eventos" },
      {
        name: "description",
        content: "Lançamento e acompanhamento de custos por evento e categoria.",
      },
      { property: "og:title", content: "Custos — Mesly Buffet & Eventos" },
      { property: "og:description", content: "Custos de alimentos, bebidas, equipe e estrutura." },
    ],
  }),
  loader: async () => {
    const [custos, eventos] = await Promise.all([
      listarCustos({ data: { page: 1, pageSize: 100 } }),
      listarEventos({ data: { page: 1, pageSize: 100 } }),
    ]);
    return { custos, eventos: eventos.items };
  },
  component: Custos,
});

function Custos() {
  const { custos: resultado, eventos } = Route.useLoaderData();
  const custos = resultado.items;
  const criar = useServerFn(criarCusto);
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [eventoId, setEventoId] = useState("");
  const [salvando, setSalvando] = useState(false);
  const porEvento = Array.from(
    custos
      .reduce(
        (mapa, custo) =>
          mapa.set(custo.eventoId, {
            id: custo.eventoId,
            nome: custo.evento.nome,
            total: (mapa.get(custo.eventoId)?.total ?? 0) + Number(custo.valor),
          }),
        new Map<string, { id: string; nome: string; total: number }>(),
      )
      .values(),
  );

  async function registrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "").trim();
    setSalvando(true);
    try {
      await criar({
        data: {
          eventoId,
          categoria: value("categoria"),
          descricao: value("descricao"),
          fornecedor: value("fornecedor") || null,
          valor: Number(value("valor")),
          data: new Date(`${value("data")}T12:00:00`),
          observacoes: value("observacoes") || null,
        },
      });
      toast.success("Custo registrado.");
      setAberto(false);
      setEventoId("");
      await router.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível registrar o custo.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Custos"
        subtitle={`${custos.length} lançamentos registrados`}
        actions={
          <Button onClick={() => setAberto(true)} disabled={!eventos.length}>
            Registrar custo
          </Button>
        }
      />
      <FinanceiroTabs />

      <Panel className="p-5">
        <PanelHeader title="Total por evento" />
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {porEvento.map((e) => (
            <div key={e.id} className="bg-surface rounded-xl p-4 ring-1 ring-black/5">
              <p className="text-xs font-medium">{e.nome}</p>
              <p className="font-display mt-1 text-lg font-semibold">{formatBRL(e.total)}</p>
              <p className="text-muted-foreground text-[11px]">Total de despesas lançadas</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="p-5">
        <PanelHeader title="Lançamentos" />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="text-muted-foreground border-b border-border text-[11px] uppercase">
                <th className="pb-2 font-medium">Evento</th>
                <th className="pb-2 font-medium">Categoria</th>
                <th className="pb-2 font-medium">Descrição</th>
                <th className="pb-2 font-medium">Fornecedor</th>
                <th className="pb-2 font-medium">Data</th>
                <th className="pb-2 font-medium text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {custos.map((c) => (
                <tr key={c.id}>
                  <td className="py-3 pr-3 font-medium">{c.evento.nome}</td>
                  <td className="text-muted-foreground py-3 pr-3">{c.categoria}</td>
                  <td className="text-muted-foreground py-3 pr-3">{c.descricao}</td>
                  <td className="text-muted-foreground py-3 pr-3">{c.fornecedor}</td>
                  <td className="text-muted-foreground py-3 pr-3">{formatDate(c.data)}</td>
                  <td className="py-3 text-right font-medium">{formatBRL(Number(c.valor))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent>
          <form className="grid gap-4" onSubmit={registrar}>
            <DialogHeader>
              <DialogTitle>Registrar custo</DialogTitle>
              <DialogDescription>Adicione uma despesa vinculada ao evento.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5 sm:col-span-2">
                <Label>Evento</Label>
                <Select value={eventoId} onValueChange={setEventoId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o evento" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventos.map((evento) => (
                      <SelectItem key={evento.id} value={evento.id}>
                        {evento.nome} · {evento.cliente.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="categoria">Categoria</Label>
                <Input
                  id="categoria"
                  name="categoria"
                  placeholder="Alimentos, equipe, estrutura…"
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="fornecedor">Fornecedor</Label>
                <Input id="fornecedor" name="fornecedor" />
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Input id="descricao" name="descricao" required />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="valor">Valor</Label>
                <Input id="valor" name="valor" type="number" min="0" step="0.01" required />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="data">Data</Label>
                <Input id="data" name="data" type="date" required />
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea id="observacoes" name="observacoes" rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAberto(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={salvando || !eventoId}>
                {salvando ? "Salvando…" : "Registrar custo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
