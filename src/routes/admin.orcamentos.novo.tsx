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
import { clientes, eventos } from "@/data/mock";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/admin/orcamentos/novo")({
  head: () => ({
    meta: [
      { title: "Criar orçamento — Mesa Buffet & Eventos" },
      {
        name: "description",
        content: "Monte a proposta comercial com itens, quantidades, descontos e condições de pagamento.",
      },
      { property: "og:title", content: "Criar orçamento — Mesa Buffet & Eventos" },
      { property: "og:description", content: "Editor de propostas comerciais do buffet." },
    ],
  }),
  component: NovoOrcamento,
});

interface Linha {
  id: number;
  servico: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  valorUnitario: number;
  desconto: number;
}

function NovoOrcamento() {
  const navigate = useNavigate();
  const [itens, setItens] = useState<Linha[]>([
    {
      id: 1,
      servico: "Jantar completo",
      descricao: "Entrada, prato principal e sobremesa",
      quantidade: 120,
      unidade: "pessoa",
      valorUnitario: 165,
      desconto: 0,
    },
  ]);
  const [descontoGeral, setDescontoGeral] = useState(0);

  const subtotal = itens.reduce((a, i) => a + i.quantidade * i.valorUnitario - i.desconto, 0);
  const total = Math.max(subtotal - descontoGeral, 0);

  function atualizar(id: number, campo: keyof Linha, valor: string) {
    setItens((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              [campo]:
                campo === "quantidade" || campo === "valorUnitario" || campo === "desconto"
                  ? Number(valor) || 0
                  : valor,
            }
          : i,
      ),
    );
  }

  function adicionar() {
    setItens((p) => [
      ...p,
      { id: Date.now(), servico: "", descricao: "", quantidade: 1, unidade: "pessoa", valorUnitario: 0, desconto: 0 },
    ]);
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Criar orçamento" subtitle="Monte a proposta e envie ao cliente" />

      <Panel className="p-5">
        <PanelHeader title="Informações da proposta" />
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <Label className="mb-1.5 block">Cliente</Label>
            <Select>
              <SelectTrigger className="bg-surface w-full border-0 ring-1 ring-black/5">
                <SelectValue placeholder="Selecione" />
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
          <div>
            <Label className="mb-1.5 block">Evento</Label>
            <Select>
              <SelectTrigger className="bg-surface w-full border-0 ring-1 ring-black/5">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {eventos.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="validade" className="mb-1.5 block">
              Validade da proposta
            </Label>
            <Input id="validade" type="date" className="bg-surface border-0 ring-1 ring-black/5" />
          </div>
          <div>
            <Label htmlFor="dataev" className="mb-1.5 block">
              Data do evento
            </Label>
            <Input id="dataev" type="date" className="bg-surface border-0 ring-1 ring-black/5" />
          </div>
        </div>
      </Panel>

      <Panel className="p-5">
        <PanelHeader
          title="Itens do orçamento"
          subtitle="Serviços e produtos que compõem a proposta"
          action={
            <Button variant="outline" size="sm" onClick={adicionar}>
              <Plus className="size-4" />
              Adicionar item
            </Button>
          }
        />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="text-muted-foreground border-b border-border text-[11px] uppercase">
                <th className="pb-2 font-medium">Serviço/produto</th>
                <th className="pb-2 font-medium">Descrição</th>
                <th className="pb-2 font-medium">Qtd.</th>
                <th className="pb-2 font-medium">Unidade</th>
                <th className="pb-2 font-medium">Valor unit.</th>
                <th className="pb-2 font-medium">Desconto</th>
                <th className="pb-2 font-medium">Total</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {itens.map((i) => (
                <tr key={i.id}>
                  <td className="py-2 pr-2">
                    <Input
                      value={i.servico}
                      onChange={(e) => atualizar(i.id, "servico", e.target.value)}
                      className="bg-surface border-0 ring-1 ring-black/5"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <Input
                      value={i.descricao}
                      onChange={(e) => atualizar(i.id, "descricao", e.target.value)}
                      className="bg-surface border-0 ring-1 ring-black/5"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <Input
                      type="number"
                      value={i.quantidade}
                      onChange={(e) => atualizar(i.id, "quantidade", e.target.value)}
                      className="bg-surface w-20 border-0 ring-1 ring-black/5"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <Input
                      value={i.unidade}
                      onChange={(e) => atualizar(i.id, "unidade", e.target.value)}
                      className="bg-surface w-24 border-0 ring-1 ring-black/5"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <Input
                      type="number"
                      value={i.valorUnitario}
                      onChange={(e) => atualizar(i.id, "valorUnitario", e.target.value)}
                      className="bg-surface w-28 border-0 ring-1 ring-black/5"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <Input
                      type="number"
                      value={i.desconto}
                      onChange={(e) => atualizar(i.id, "desconto", e.target.value)}
                      className="bg-surface w-24 border-0 ring-1 ring-black/5"
                    />
                  </td>
                  <td className="py-2 pr-2 font-medium whitespace-nowrap">
                    {formatBRL(i.quantidade * i.valorUnitario - i.desconto)}
                  </td>
                  <td className="py-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remover item"
                      onClick={() => setItens((p) => p.filter((x) => x.id !== i.id))}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="p-5 xl:col-span-2">
          <PanelHeader title="Observações e condições comerciais" />
          <div className="mt-4 grid grid-cols-1 gap-4">
            <Textarea
              rows={3}
              placeholder="Observações visíveis ao cliente"
              className="bg-surface border-0 ring-1 ring-black/5"
            />
            <Textarea
              rows={3}
              placeholder="Condições de pagamento, prazos e políticas de cancelamento"
              className="bg-surface border-0 ring-1 ring-black/5"
            />
          </div>
        </Panel>

        <Panel className="p-5">
          <PanelHeader title="Resumo financeiro" />
          <div className="mt-4 flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatBRL(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Desconto</span>
              <Input
                type="number"
                value={descontoGeral}
                onChange={(e) => setDescontoGeral(Number(e.target.value) || 0)}
                className="bg-surface w-32 border-0 text-right ring-1 ring-black/5"
              />
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-border pt-3">
              <span className="font-display font-semibold">Valor total</span>
              <span className="font-display text-lg font-semibold">{formatBRL(total)}</span>
            </div>
          </div>
        </Panel>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" asChild>
          <Link to="/admin/orcamentos">Cancelar</Link>
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            toast.success("Rascunho salvo.");
            navigate({ to: "/admin/orcamentos" });
          }}
        >
          Salvar rascunho
        </Button>
        <Button
          onClick={() => {
            toast.success("Orçamento enviado ao cliente.");
            navigate({ to: "/admin/orcamentos" });
          }}
        >
          Enviar orçamento
        </Button>
      </div>
    </div>
  );
}
