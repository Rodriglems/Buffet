import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
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
import { listarPagamentos, registrarPagamento } from "@/features/pagamentos/server-functions";
import { formatBRL, formatBRLShort, formatDate } from "@/lib/format";

export const Route = createFileRoute("/admin/pagamentos")({
  head: () => ({
    meta: [
      { title: "Pagamentos — Mesa Buffet & Eventos" },
      {
        name: "description",
        content: "Controle de parcelas, vencimentos e recebimentos dos eventos.",
      },
      { property: "og:title", content: "Pagamentos — Mesa Buffet & Eventos" },
      { property: "og:description", content: "Parcelas, vencimentos e status de recebimento." },
    ],
  }),
  loader: () => listarPagamentos({ data: { page: 1, pageSize: 100 } }),
  component: Pagamentos,
});

const TODOS = "todos";

function Pagamentos() {
  const { items: parcelas } = Route.useLoaderData();
  const confirmar = useServerFn(registrarPagamento);
  const router = useRouter();
  const [status, setStatus] = useState(TODOS);
  const lista = parcelas.filter((p) => status === TODOS || p.status === status);

  const pago = parcelas.filter((p) => p.status === "PAGO").reduce((a, p) => a + Number(p.valor), 0);
  const pendente = parcelas
    .filter((p) => p.status === "PENDENTE")
    .reduce((a, p) => a + Number(p.valor), 0);
  const atrasado = parcelas
    .filter((p) => p.status === "ATRASADO")
    .reduce((a, p) => a + Number(p.valor), 0);

  async function marcarPago(id: string) {
    try {
      await confirmar({
        data: { id, dataPagamento: new Date(), formaPagamento: "Informado pelo administrador" },
      });
      toast.success("Pagamento registrado.");
      await router.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao registrar pagamento.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Pagamentos"
        subtitle={`${parcelas.length} parcelas lançadas`}
        actions={
          <Button disabled title="Cadastre parcelas a partir do contrato">
            Nova parcela
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Recebido" value={formatBRLShort(pago)} />
        <StatCard label="A receber" value={formatBRLShort(pendente)} badgeTone="info" />
        <StatCard
          label="Em atraso"
          value={formatBRLShort(atrasado)}
          badge="1 título"
          badgeTone="danger"
        />
      </div>

      <Panel className="p-5">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="bg-surface w-full max-w-xs border-0 ring-1 ring-black/5">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos os status</SelectItem>
            {["PENDENTE", "PAGO", "ATRASADO", "CANCELADO"].map((s) => (
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
                  <td className="py-3 pr-3 font-medium">{p.contrato.evento.cliente.nome}</td>
                  <td className="text-muted-foreground py-3 pr-3">{p.contrato.evento.nome}</td>
                  <td className="py-3 pr-3">{p.numeroParcela}</td>
                  <td className="text-muted-foreground py-3 pr-3">
                    {formatDate(p.dataVencimento)}
                  </td>
                  <td className="py-3 pr-3 font-medium">{formatBRL(Number(p.valor))}</td>
                  <td className="py-3">
                    <StatusBadge status={p.status} />
                    {p.status === "PENDENTE" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-2"
                        onClick={() => void marcarPago(p.id)}
                      >
                        Marcar pago
                      </Button>
                    )}
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
