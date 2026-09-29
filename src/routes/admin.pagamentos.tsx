import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { PageHeader, Panel, StatCard } from "@/components/panel";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { nomeCliente, nomeEvento, parcelas } from "@/data/mock";
import { formatBRL, formatBRLShort, formatDate } from "@/lib/format";

export const Route = createFileRoute("/admin/pagamentos")({
  head: () => ({
    meta: [
      { title: "Pagamentos — Mesa Buffet & Eventos" },
      { name: "description", content: "Controle de parcelas, vencimentos e recebimentos dos eventos." },
      { property: "og:title", content: "Pagamentos — Mesa Buffet & Eventos" },
      { property: "og:description", content: "Parcelas, vencimentos e status de recebimento." },
    ],
  }),
  component: Pagamentos,
});

const TODOS = "todos";

function Pagamentos() {
  const [status, setStatus] = useState(TODOS);
  const lista = parcelas.filter((p) => status === TODOS || p.status === status);

  const pago = parcelas.filter((p) => p.status === "Pago").reduce((a, p) => a + p.valor, 0);
  const pendente = parcelas.filter((p) => p.status === "Pendente").reduce((a, p) => a + p.valor, 0);
  const atrasado = parcelas.filter((p) => p.status === "Atrasado").reduce((a, p) => a + p.valor, 0);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Pagamentos"
        subtitle={`${parcelas.length} parcelas lançadas`}
        actions={
          <Button onClick={() => toast.success("Pagamento registrado.")}>Registrar pagamento</Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Recebido" value={formatBRLShort(pago)} />
        <StatCard label="A receber" value={formatBRLShort(pendente)} badgeTone="info" />
        <StatCard label="Em atraso" value={formatBRLShort(atrasado)} badge="1 título" badgeTone="danger" />
      </div>

      <Panel className="p-5">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="bg-surface w-full max-w-xs border-0 ring-1 ring-black/5">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos os status</SelectItem>
            {["Pendente", "Pago", "Atrasado", "Cancelado"].map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="text-muted-foreground border-b border-border text-[11px] uppercase">
                <th className="pb-2 font-medium">Cliente</th>
                <th className="pb-2 font-medium">Evento</th>
                <th className="pb-2 font-medium">Parcela</th>
                <th className="pb-2 font-medium">Vencimento</th>
                <th className="pb-2 font-medium">Valor</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lista.map((p) => (
                <tr key={p.id}>
                  <td className="py-3 pr-3 font-medium">{nomeCliente(p.clienteId)}</td>
                  <td className="text-muted-foreground py-3 pr-3">{nomeEvento(p.eventoId)}</td>
                  <td className="py-3 pr-3">{p.parcela}</td>
                  <td className="text-muted-foreground py-3 pr-3">{formatDate(p.vencimento)}</td>
                  <td className="py-3 pr-3 font-medium">{formatBRL(p.valor)}</td>
                  <td className="py-3">
                    <StatusBadge status={p.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
