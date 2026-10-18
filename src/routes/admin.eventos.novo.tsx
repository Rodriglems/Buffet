import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { PageHeader, Panel, PanelHeader } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listarClientes } from "@/features/clientes/server-functions";
import { criarEvento } from "@/features/eventos/server-functions";

export const Route = createFileRoute("/admin/eventos/novo")({
  head: () => ({
    meta: [
      { title: "Novo evento — Mesly Buffet & Eventos" },
      {
        name: "description",
        content: "Cadastre um evento com data, local, convidados, cliente e serviços contratados.",
      },
      { property: "og:title", content: "Novo evento — Mesly Buffet & Eventos" },
      { property: "og:description", content: "Formulário de cadastro de eventos do buffet." },
    ],
  }),
  loader: () => listarClientes({ data: { page: 1, pageSize: 100, busca: "" } }),
  component: NovoEvento,
});

function NovoEvento() {
  const navigate = useNavigate();
  const { items: clientes } = Route.useLoaderData();
  const criar = useServerFn(criarEvento);
  const [clienteId, setClienteId] = useState("");
  const [tipo, setTipo] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "").trim();
    const time = (name: string) =>
      text(name) ? new Date(`1970-01-01T${text(name)}:00.000Z`) : null;
    setSalvando(true);
    try {
      await criar({
        data: {
          clienteId,
          nome: text("nome"),
          tipo,
          dataEvento: new Date(`${text("data")}T00:00:00.000Z`),
          horaInicio: time("ini"),
          horaFim: time("fim"),
          quantidadeConvidados: Number(text("conv")),
          localNome: text("local") || null,
          observacoes: text("obs") || null,
        },
      });
      toast.success("Evento salvo com sucesso.");
      await navigate({ to: "/admin/eventos" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel salvar o evento.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={salvar}>
      <PageHeader
        title="Novo evento"
        subtitle="Informe os dados do evento e os serviços previstos"
      />

      <Panel className="p-5">
        <PanelHeader title="Informações do evento" />
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="sm:col-span-2">
            <Label htmlFor="nome" className="mb-1.5 block">
              Nome do evento
            </Label>
            <Input
              id="nome"
              name="nome"
              required
              placeholder="Casamento Ferreira"
              className="bg-surface border-0 ring-1 ring-black/5"
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Tipo de evento</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger className="bg-surface w-full border-0 ring-1 ring-black/5">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {["Casamento", "Aniversário", "Formatura", "Corporativo", "Confraternização"].map(
                  (t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="data" className="mb-1.5 block">
              Data
            </Label>
            <Input
              id="data"
              name="data"
              required
              type="date"
              className="bg-surface border-0 ring-1 ring-black/5"
            />
          </div>
          <div>
            <Label htmlFor="ini" className="mb-1.5 block">
              Horário inicial
            </Label>
            <Input
              id="ini"
              name="ini"
              type="time"
              className="bg-surface border-0 ring-1 ring-black/5"
            />
          </div>
          <div>
            <Label htmlFor="fim" className="mb-1.5 block">
              Horário final
            </Label>
            <Input
              id="fim"
              name="fim"
              type="time"
              className="bg-surface border-0 ring-1 ring-black/5"
            />
          </div>
          <div>
            <Label htmlFor="conv" className="mb-1.5 block">
              Quantidade de convidados
            </Label>
            <Input
              id="conv"
              name="conv"
              required
              min={1}
              type="number"
              placeholder="180"
              className="bg-surface border-0 ring-1 ring-black/5"
            />
          </div>
          <div>
            <Label htmlFor="local" className="mb-1.5 block">
              Local
            </Label>
            <Input
              id="local"
              name="local"
              placeholder="Espaço Villa Bosque"
              className="bg-surface border-0 ring-1 ring-black/5"
            />
          </div>
          <div className="sm:col-span-2 xl:col-span-3">
            <Label htmlFor="end" className="mb-1.5 block">
              Endereço
            </Label>
            <Input
              id="end"
              placeholder="Estrada do Carmo, 2100 — Cotia/SP"
              className="bg-surface border-0 ring-1 ring-black/5"
            />
          </div>
        </div>
      </Panel>

      <Panel className="p-5">
        <PanelHeader title="Cliente" subtitle="Selecione um cliente já cadastrado" />
        <div className="mt-4 max-w-sm">
          <Select value={clienteId} onValueChange={setClienteId}>
            <SelectTrigger className="bg-surface w-full border-0 ring-1 ring-black/5">
              <SelectValue placeholder="Selecione o cliente" />
            </SelectTrigger>
            <SelectContent>
              {clientes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Panel>

      <Panel className="p-5">
        <PanelHeader title="Observações" />
        <Textarea
          id="obs"
          name="obs"
          rows={4}
          placeholder="Restrições alimentares, plano B em caso de chuva, contatos no local…"
          className="bg-surface mt-4 border-0 ring-1 ring-black/5"
        />
      </Panel>

      <div className="flex justify-end gap-2">
        <Button variant="outline" asChild>
          <Link to="/admin/eventos">Cancelar</Link>
        </Button>
        <Button type="submit" disabled={salvando || !clienteId || !tipo}>
          {salvando ? "Salvando…" : "Salvar evento"}
        </Button>
      </div>
    </form>
  );
}
