import { useState, type FormEvent } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { FinanceiroTabs } from "@/components/layout/section-nav";
import { PageHeader, Panel, StatCard } from "@/components/panel";
import { StatusBadge } from "@/components/status-badge";
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
import { listarContratos } from "@/features/contratos/server-functions";
import {
  criarPagamento,
  listarPagamentos,
  registrarPagamento,
} from "@/features/pagamentos/server-functions";
import { formatBRL, formatBRLShort, formatDate } from "@/lib/format";

export const Route = createFileRoute("/admin/pagamentos")({
  head: () => ({
    meta: [
      { title: "Pagamentos — Mesly Buffet & Eventos" },
      {
        name: "description",
        content: "Controle de parcelas, vencimentos e recebimentos dos eventos.",
      },
      { property: "og:title", content: "Pagamentos — Mesly Buffet & Eventos" },
      { property: "og:description", content: "Parcelas, vencimentos e status de recebimento." },
    ],
  }),
  loader: async () => {
    const [pagamentos, contratos] = await Promise.all([
      listarPagamentos({ data: { page: 1, pageSize: 100 } }),
      listarContratos({ data: { page: 1, pageSize: 100 } }),
    ]);
    return { pagamentos, contratos: contratos.items.filter((item) => item.status !== "CANCELADO") };
  },
  component: Pagamentos,
});

const TODOS = "todos";

function Pagamentos() {
  const { pagamentos, contratos } = Route.useLoaderData();
  const parcelas = pagamentos.items;
  const confirmar = useServerFn(registrarPagamento);
  const criar = useServerFn(criarPagamento);
  const router = useRouter();
  const [status, setStatus] = useState(TODOS);
  const [aberto, setAberto] = useState(false);
  const [contratoId, setContratoId] = useState("");
  const [salvando, setSalvando] = useState(false);
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

  async function novaParcela(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "").trim();
    setSalvando(true);
    try {
      await criar({
        data: {
          contratoId,
          numeroParcela: Number(value("numeroParcela")),
          descricao: value("descricao") || null,
          valor: Number(value("valor")),
          dataVencimento: new Date(`${value("dataVencimento")}T12:00:00`),
          formaPagamento: value("formaPagamento") || null,
        },
      });
      toast.success("Parcela cadastrada.");
      setAberto(false);
      setContratoId("");
      await router.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao cadastrar parcela.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Pagamentos"
        subtitle={`${parcelas.length} parcelas lançadas`}
        actions={
          <Button
            onClick={() => setAberto(true)}
            disabled={!contratos.length}
            title={!contratos.length ? "Cadastre um contrato antes" : undefined}
          >
            Nova parcela
          </Button>
        }
      />
      <FinanceiroTabs />

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

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent>
          <form className="grid gap-4" onSubmit={novaParcela}>
            <DialogHeader>
              <DialogTitle>Nova parcela</DialogTitle>
              <DialogDescription>
                Vincule o recebimento a um contrato e informe o vencimento.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5 sm:col-span-2">
                <Label>Contrato</Label>
                <Select value={contratoId} onValueChange={setContratoId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o contrato" />
                  </SelectTrigger>
                  <SelectContent>
                    {contratos.map((contrato) => (
                      <SelectItem key={contrato.id} value={contrato.id}>
                        #{contrato.numero} · {contrato.evento.nome} · {contrato.evento.cliente.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="numeroParcela">Número da parcela</Label>
                <Input id="numeroParcela" name="numeroParcela" type="number" min="1" required />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="valor">Valor</Label>
                <Input id="valor" name="valor" type="number" min="0.01" step="0.01" required />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="dataVencimento">Vencimento</Label>
                <Input id="dataVencimento" name="dataVencimento" type="date" required />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="formaPagamento">Forma de pagamento</Label>
                <Input
                  id="formaPagamento"
                  name="formaPagamento"
                  placeholder="PIX, cartão, transferência…"
                />
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Input id="descricao" name="descricao" placeholder="Entrada, saldo final…" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAberto(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={salvando || !contratoId}>
                {salvando ? "Salvando…" : "Cadastrar parcela"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
