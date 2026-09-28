import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
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
import { clientes } from "@/data/mock";

export const Route = createFileRoute("/admin/eventos/novo")({
  head: () => ({
    meta: [
      { title: "Novo evento — Mesa Buffet & Eventos" },
      {
        name: "description",
        content: "Cadastre um evento com data, local, convidados, cliente e serviços contratados.",
      },
      { property: "og:title", content: "Novo evento — Mesa Buffet & Eventos" },
      { property: "og:description", content: "Formulário de cadastro de eventos do buffet." },
    ],
  }),
  component: NovoEvento,
});

function NovoEvento() {
  const navigate = useNavigate();
  const [servicos, setServicos] = useState([{ id: 1, nome: "", qtd: "" }]);

  function salvar() {
    toast.success("Evento salvo com sucesso.");
    navigate({ to: "/admin/eventos" });
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Novo evento" subtitle="Informe os dados do evento e os serviços previstos" />

      <Panel className="p-5">
        <PanelHeader title="Informações do evento" />
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="sm:col-span-2">
            <Label htmlFor="nome" className="mb-1.5 block">
              Nome do evento
            </Label>
            <Input id="nome" placeholder="Casamento Ferreira" className="bg-surface border-0 ring-1 ring-black/5" />
          </div>
          <div>
            <Label className="mb-1.5 block">Tipo de evento</Label>
            <Select>
              <SelectTrigger className="bg-surface w-full border-0 ring-1 ring-black/5">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {["Casamento", "Aniversário", "Formatura", "Corporativo", "Confraternização"].map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="data" className="mb-1.5 block">
              Data
            </Label>
            <Input id="data" type="date" className="bg-surface border-0 ring-1 ring-black/5" />
          </div>
          <div>
            <Label htmlFor="ini" className="mb-1.5 block">
              Horário inicial
            </Label>
            <Input id="ini" type="time" className="bg-surface border-0 ring-1 ring-black/5" />
          </div>
          <div>
            <Label htmlFor="fim" className="mb-1.5 block">
              Horário final
            </Label>
            <Input id="fim" type="time" className="bg-surface border-0 ring-1 ring-black/5" />
          </div>
          <div>
            <Label htmlFor="conv" className="mb-1.5 block">
              Quantidade de convidados
            </Label>
            <Input id="conv" type="number" placeholder="180" className="bg-surface border-0 ring-1 ring-black/5" />
          </div>
          <div>
            <Label htmlFor="local" className="mb-1.5 block">
              Local
            </Label>
            <Input id="local" placeholder="Espaço Villa Bosque" className="bg-surface border-0 ring-1 ring-black/5" />
          </div>
          <div className="sm:col-span-2 xl:col-span-3">
            <Label htmlFor="end" className="mb-1.5 block">
              Endereço
            </Label>
            <Input id="end" placeholder="Estrada do Carmo, 2100 — Cotia/SP" className="bg-surface border-0 ring-1 ring-black/5" />
          </div>
        </div>
      </Panel>

      <Panel className="p-5">
        <PanelHeader title="Cliente" subtitle="Selecione um cliente já cadastrado" />
        <div className="mt-4 max-w-sm">
          <Select>
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
        <PanelHeader
          title="Serviços"
          subtitle="Produtos e serviços previstos para o evento"
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setServicos((s) => [...s, { id: Date.now(), nome: "", qtd: "" }])}
            >
              <Plus className="size-4" />
              Adicionar serviço
            </Button>
          }
        />
        <div className="mt-4 flex flex-col gap-3">
          {servicos.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-3">
              <Input placeholder="Serviço / produto" className="bg-surface min-w-48 flex-1 border-0 ring-1 ring-black/5" />
              <Input placeholder="Quantidade" type="number" className="bg-surface w-32 border-0 ring-1 ring-black/5" />
              <Button
                variant="ghost"
                size="icon"
                aria-label="Remover serviço"
                onClick={() => setServicos((prev) => prev.filter((p) => p.id !== s.id))}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="p-5">
        <PanelHeader title="Observações" />
        <Textarea
          rows={4}
          placeholder="Restrições alimentares, plano B em caso de chuva, contatos no local…"
          className="bg-surface mt-4 border-0 ring-1 ring-black/5"
        />
      </Panel>

      <div className="flex justify-end gap-2">
        <Button variant="outline" asChild>
          <Link to="/admin/eventos">Cancelar</Link>
        </Button>
        <Button onClick={salvar}>Salvar evento</Button>
      </div>
    </div>
  );
}
