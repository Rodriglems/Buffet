import { useMemo, useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, MessageCircle, Search } from "lucide-react";
import { toast } from "sonner";

import { FinanceiroTabs } from "@/components/layout/section-nav";
import { PageHeader, Panel, StatCard } from "@/components/panel";
import { EmptyState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  agruparPorCliente,
  descreverPrazo,
  hojeIso,
  mensagemCobranca,
  ROTULOS_SITUACAO,
  situacaoDaParcela,
  type SituacaoParcela,
} from "@/features/pagamentos/a-receber";
import { GerarParcelasDialog } from "@/features/pagamentos/gerar-parcelas-dialog";
import { listarContasAReceber, registrarPagamento } from "@/features/pagamentos/server-functions";
import { useConfirmar } from "@/lib/confirmacao";
import { formatBRL, formatBRLShort, formatDate } from "@/lib/format";
import { pageMeta } from "@/lib/meta";
import { createWhatsAppUrl } from "@/lib/sharing";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/pagamentos")({
  head: () => pageMeta("A receber", "Todas as parcelas em aberto dos clientes, por vencimento."),
  loader: () => listarContasAReceber(),
  component: AReceber,
});

type Filtro = "TODAS" | SituacaoParcela;
type Parcela = Awaited<ReturnType<typeof listarContasAReceber>>["pendentes"][number];

const CORES_SITUACAO: Record<SituacaoParcela, string> = {
  ATRASADA: "text-destructive",
  VENCE_HOJE: "text-warning-foreground font-medium",
  PROXIMOS_7_DIAS: "text-foreground",
  A_VENCER: "text-muted-foreground",
};

function AReceber() {
  const { pendentes, recebidoNoMes, eventosParaParcelas } = Route.useLoaderData();
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("TODAS");
  const hoje = hojeIso();

  const comSituacao = pendentes.map((parcela) => ({
    ...parcela,
    ...situacaoDaParcela(parcela.dataVencimento, hoje),
  }));
  const soma = (lista: { valor: string }[]) =>
    lista.reduce((total, parcela) => total + Number(parcela.valor), 0);
  const atrasadas = comSituacao.filter((p) => p.situacao === "ATRASADA");
  const proximas = comSituacao.filter((p) => p.dias >= 0 && p.dias <= 7);

  const termo = busca.trim().toLocaleLowerCase("pt-BR");
  const filtradas = comSituacao.filter(
    (p) =>
      (filtro === "TODAS" ||
        p.situacao === filtro ||
        (filtro === "PROXIMOS_7_DIAS" && p.situacao === "VENCE_HOJE")) &&
      (!termo ||
        p.evento.cliente.nome.toLocaleLowerCase("pt-BR").includes(termo) ||
        p.evento.nome.toLocaleLowerCase("pt-BR").includes(termo)),
  );
  const grupos = useMemo(() => agruparPorCliente(filtradas, hoje), [filtradas, hoje]);
  const totalClientes = new Set(pendentes.map((p) => p.evento.cliente.id)).size;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="A receber"
        subtitle={
          pendentes.length
            ? `${formatBRL(soma(pendentes))} em ${pendentes.length} parcela${pendentes.length === 1 ? "" : "s"} de ${totalClientes} cliente${totalClientes === 1 ? "" : "s"}`
            : "Nenhuma parcela em aberto"
        }
        actions={
          <Button
            onClick={() => setAberto(true)}
            disabled={!eventosParaParcelas.length}
            title={
              !eventosParaParcelas.length
                ? "Nenhum evento aprovado aguardando pagamento"
                : undefined
            }
          >
            Gerar parcelas
          </Button>
        }
      />
      <FinanceiroTabs />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total a receber" value={formatBRLShort(soma(pendentes))} />
        <StatCard
          label="Em atraso"
          value={formatBRLShort(soma(atrasadas))}
          badge={
            atrasadas.length
              ? `${atrasadas.length} parcela${atrasadas.length === 1 ? "" : "s"}`
              : undefined
          }
          badgeTone="danger"
        />
        <StatCard
          label="Vence em 7 dias"
          value={formatBRLShort(soma(proximas))}
          badge={
            proximas.length
              ? `${proximas.length} parcela${proximas.length === 1 ? "" : "s"}`
              : undefined
          }
          badgeTone="warning"
        />
        <StatCard label="Recebido este mês" value={formatBRLShort(recebidoNoMes)} />
      </div>

      <Panel className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-sm">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar cliente ou evento"
            className="pl-9"
            aria-label="Buscar cliente ou evento"
          />
        </div>
        <Select value={filtro} onValueChange={(valor) => setFiltro(valor as Filtro)}>
          <SelectTrigger className="w-full sm:w-56" aria-label="Situação">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODAS">Todas em aberto</SelectItem>
            <SelectItem value="ATRASADA">{ROTULOS_SITUACAO.ATRASADA}</SelectItem>
            <SelectItem value="VENCE_HOJE">{ROTULOS_SITUACAO.VENCE_HOJE}</SelectItem>
            <SelectItem value="PROXIMOS_7_DIAS">{ROTULOS_SITUACAO.PROXIMOS_7_DIAS}</SelectItem>
            <SelectItem value="A_VENCER">{ROTULOS_SITUACAO.A_VENCER}</SelectItem>
          </SelectContent>
        </Select>
      </Panel>

      {grupos.length ? (
        grupos.map((grupo) => <ContaDoCliente key={grupo.cliente.id} grupo={grupo} hoje={hoje} />)
      ) : (
        <Panel className="p-5">
          <EmptyState
            title={pendentes.length ? "Nada encontrado" : "Nenhuma parcela em aberto"}
            description={
              pendentes.length
                ? "Ajuste a busca ou a situação para ver outras parcelas."
                : "Quando houver parcelas pendentes dos clientes, elas aparecem aqui."
            }
          />
        </Panel>
      )}

      <GerarParcelasDialog
        aberto={aberto}
        onOpenChange={setAberto}
        eventos={eventosParaParcelas}
        onSalvo={() => router.invalidate()}
      />
    </div>
  );
}

function ContaDoCliente({
  grupo,
  hoje,
}: {
  grupo: ReturnType<
    typeof agruparPorCliente<Parcela & { dias: number; situacao: SituacaoParcela }>
  >[number];
  hoje: string;
}) {
  const router = useRouter();
  const registrar = useServerFn(registrarPagamento);
  const confirmar = useConfirmar();
  const [processando, setProcessando] = useState<string | null>(null);
  const { cliente } = grupo;

  async function marcarRecebido(parcela: (typeof grupo.parcelas)[number]) {
    const ok = await confirmar({
      titulo: `Confirmar o recebimento de ${formatBRL(Number(parcela.valor))}?`,
      descricao: `${cliente.nome} · ${parcela.evento.nome} · parcela ${parcela.numeroParcela}. A data de hoje fica registrada como data do pagamento.`,
      textoConfirmar: "Marcar como recebido",
    });
    if (!ok) return;
    setProcessando(parcela.id);
    try {
      // Sem forma de pagamento: mantém a que foi definida ao gerar as parcelas.
      await registrar({ data: { id: parcela.id, dataPagamento: new Date() } });
      toast.success("Recebimento registrado.");
      await router.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao registrar o recebimento.");
    } finally {
      setProcessando(null);
    }
  }

  function cobrar() {
    try {
      const url = createWhatsAppUrl(
        cliente.whatsapp ?? cliente.telefone ?? "",
        mensagemCobranca(cliente.nome, grupo.parcelas, hoje),
      );
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "WhatsApp inválido.");
    }
  }

  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display font-semibold">{cliente.nome}</p>
          <p className="text-muted-foreground text-xs">
            {grupo.parcelas.length} parcela{grupo.parcelas.length === 1 ? "" : "s"} em aberto
            {grupo.emAtraso > 0 ? (
              <span className="text-destructive font-medium">
                {" "}
                · {formatBRL(grupo.emAtraso)} em atraso
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p className="font-display text-lg font-semibold">{formatBRL(grupo.total)}</p>
          {cliente.whatsapp || cliente.telefone ? (
            <Button size="sm" variant="outline" onClick={cobrar}>
              <MessageCircle className="size-4" /> Cobrar no WhatsApp
            </Button>
          ) : null}
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="text-muted-foreground border-b border-border text-[11px] uppercase">
              <th className="pb-2 font-medium">Evento</th>
              <th className="pb-2 font-medium">Parcela</th>
              <th className="pb-2 font-medium">Vencimento</th>
              <th className="pb-2 font-medium">Forma</th>
              <th className="pb-2 font-medium">Valor</th>
              <th className="pb-2 font-medium text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {grupo.parcelas.map((parcela) => (
              <tr key={parcela.id}>
                <td className="py-3 pr-3">
                  <Link
                    to="/admin/eventos/$id"
                    params={{ id: parcela.evento.id }}
                    className="font-medium hover:underline"
                  >
                    {parcela.evento.nome}
                  </Link>
                  <p className="text-muted-foreground text-xs">
                    Evento em {formatDate(parcela.evento.dataEvento)}
                  </p>
                </td>
                <td className="py-3 pr-3">
                  #{parcela.numeroParcela}
                  {parcela.descricao ? (
                    <p className="text-muted-foreground text-xs">{parcela.descricao}</p>
                  ) : null}
                </td>
                <td className="py-3 pr-3">
                  {formatDate(parcela.dataVencimento)}
                  <p className={cn("text-xs", CORES_SITUACAO[parcela.situacao])}>
                    {descreverPrazo(parcela.dias)}
                  </p>
                </td>
                <td className="text-muted-foreground py-3 pr-3">{parcela.formaPagamento ?? "—"}</td>
                <td className="py-3 pr-3 font-medium">{formatBRL(Number(parcela.valor))}</td>
                <td className="py-3 text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={processando !== null}
                    onClick={() => void marcarRecebido(parcela)}
                  >
                    <Check className="size-4" /> Recebido
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
