import { createFileRoute, Link } from "@tanstack/react-router";
import { BellRing, Plus } from "lucide-react";

import { PageHeader, Panel, PanelHeader, StatCard } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { currentUser } from "@/features/auth/server-functions";
import { listarEventos } from "@/features/eventos/server-functions";
import { aguardaAprovacaoDoCliente } from "@/features/orcamentos/aprovacao-cliente";
import { ResumoPedido } from "@/features/orcamentos/resumo-pedido";
import { listarOrcamentos, obterOrcamento } from "@/features/orcamentos/server-functions";
import { listarPagamentos } from "@/features/pagamentos/server-functions";
import { formatBRL, formatDate } from "@/lib/format";
import { pageMeta } from "@/lib/meta";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/cliente/")({
  head: () => pageMeta("Meu portal", "Acompanhe seus eventos, orçamentos e pagamentos."),
  loader: async () => {
    const [usuario, eventos, orcamentos, pagamentos] = await Promise.all([
      currentUser(),
      listarEventos({ data: { page: 1, pageSize: 100 } }),
      listarOrcamentos({ data: { page: 1, pageSize: 100 } }),
      listarPagamentos({ data: { page: 1, pageSize: 100 } }),
    ]);
    // A lista vem do mais recente para o mais antigo: o primeiro é o último pedido feito.
    const ultimo = orcamentos.items[0];
    const ultimoPedido = ultimo ? await obterOrcamento({ data: { id: ultimo.id } }) : null;
    return {
      usuario,
      eventos: eventos.items,
      orcamentos: orcamentos.items,
      pagamentos: pagamentos.items,
      ultimoPedido,
    };
  },
  component: Inicio,
});

function Inicio() {
  const {
    usuario,
    eventos: meusEventos,
    orcamentos,
    pagamentos: minhasParcelas,
    ultimoPedido,
  } = Route.useLoaderData();
  // Parcelas canceladas não contam; sem parcelas, o pagamento ainda não foi definido.
  const parcelasValidas = minhasParcelas.filter((p) => p.status !== "CANCELADO");
  const pagamentoDefinido = parcelasValidas.length > 0;
  const pago = parcelasValidas
    .filter((p) => p.status === "PAGO")
    .reduce((s, p) => s + Number(p.valor), 0);
  const aPagar = parcelasValidas
    .filter((p) => p.status !== "PAGO")
    .reduce((s, p) => s + Number(p.valor), 0);
  const proxima = parcelasValidas.find((p) => p.status !== "PAGO");
  // Mesma regra do servidor: enviado pela equipe e com o evento ainda em "Orçamento".
  const aguardando = orcamentos.filter((o) => aguardaAprovacaoDoCliente(o));
  const orcPend = aguardando.length;
  const primeiroAguardando = aguardando[0];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={`Olá, ${usuario?.nome.split(" ")[0] ?? "Cliente"}`}
        subtitle="Tudo sobre o seu evento em um só lugar"
        actions={
          <Button asChild className="max-sm:w-full">
            <Link to="/orcamento">
              <Plus className="size-4" />
              Solicitar novo orçamento
            </Link>
          </Button>
        }
      />
      {primeiroAguardando ? (
        <Panel className="ring-primary flex flex-col gap-3 p-4 ring-2 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <p className="flex items-start gap-3">
            <BellRing className="text-primary mt-0.5 size-5 shrink-0" aria-hidden />
            <span>
              <span className="block font-semibold">
                {orcPend === 1
                  ? "Seu orçamento está esperando a sua aprovação"
                  : `${orcPend} orçamentos esperam a sua aprovação`}
              </span>
              <span className="text-muted-foreground block text-sm">
                {primeiroAguardando.evento.tipo} ·{" "}
                {formatDate(primeiroAguardando.evento.dataEvento)} ·{" "}
                {formatBRL(Number(primeiroAguardando.total))}
              </span>
            </span>
          </p>
          <Button asChild className="shrink-0 max-sm:h-11">
            <Link to="/cliente/orcamentos/$id" params={{ id: primeiroAguardando.id }}>
              Ver e aprovar
            </Link>
          </Button>
        </Panel>
      ) : null}
      <div
        className={cn(
          "grid grid-cols-1 gap-3 sm:grid-cols-2",
          pagamentoDefinido && "xl:grid-cols-4",
        )}
      >
        <StatCard label="Eventos" value={String(meusEventos.length)} />
        {/* Valores de pagamento só depois que a equipe define as parcelas. */}
        {pagamentoDefinido ? (
          <>
            <StatCard label="Já pago" value={formatBRL(pago)} />
            <StatCard label="A pagar" value={formatBRL(aPagar)} />
          </>
        ) : null}
        <StatCard label="Orçamentos aguardando você" value={String(orcPend)} />
      </div>
      {ultimoPedido ? (
        <Panel className="p-5 sm:p-6">
          <PanelHeader
            title="Resumo do seu pedido"
            subtitle={`Pedido feito em ${formatDate(ultimoPedido.createdAt)}`}
            action={
              orcamentos.length > 1 ? (
                <Link to="/cliente/orcamentos" className="text-brand text-xs font-medium">
                  Ver todos os pedidos
                </Link>
              ) : null
            }
          />
          <div className="mt-4">
            <ResumoPedido orcamento={ultimoPedido} />
          </div>
        </Panel>
      ) : null}
      {/* "Meus eventos" saiu do início: o resumo do pedido já mostra o evento. */}
      {pagamentoDefinido ? (
        <Panel className="p-5">
          <PanelHeader
            title="Próximo pagamento"
            action={
              <Link to="/cliente/pagamentos" className="text-brand text-xs font-medium">
                Ver todos
              </Link>
            }
          />
          {proxima ? (
            <div className="bg-surface mt-4 rounded-xl p-4 ring-1 ring-black/5">
              <p className="text-muted-foreground text-xs">
                {proxima.evento.nome} · parcela {proxima.numeroParcela}
              </p>
              <p className="font-display mt-1 text-2xl font-semibold">
                {formatBRL(Number(proxima.valor))}
              </p>
              <p className="text-muted-foreground text-xs">
                Vence em {formatDate(proxima.dataVencimento)}
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground mt-4 text-sm">Nenhum pagamento pendente.</p>
          )}
        </Panel>
      ) : null}
    </div>
  );
}
