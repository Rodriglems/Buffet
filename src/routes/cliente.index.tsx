import { createFileRoute, Link } from "@tanstack/react-router";

import { PageHeader, Panel, PanelHeader, StatCard } from "@/components/panel";
import { StatusBadge } from "@/components/status-badge";
import { clienteLogado, eventos, orcamentos, parcelas, nomeEvento } from "@/data/mock";
import { formatBRL, formatDate } from "@/lib/format";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/cliente/")({
  head: () => pageMeta("Meu portal", "Acompanhe seus eventos, orçamentos e pagamentos."),
  component: Inicio,
});

function Inicio() {
  const id = clienteLogado.id;
  const meusEventos = eventos.filter((e) => e.clienteId === id);
  const minhasParcelas = parcelas.filter((p) => p.clienteId === id);
  const pago = minhasParcelas.filter((p) => p.status === "Pago").reduce((s, p) => s + p.valor, 0);
  const aPagar = minhasParcelas.filter((p) => p.status !== "Pago").reduce((s, p) => s + p.valor, 0);
  const proxima = minhasParcelas.find((p) => p.status !== "Pago");
  const orcPend = orcamentos.filter((o) => o.clienteId === id && o.status === "Enviado").length;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={`Olá, ${clienteLogado.nome.split(" ")[0]}`} subtitle="Tudo sobre o seu evento em um só lugar" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Eventos" value={String(meusEventos.length)} />
        <StatCard label="Já pago" value={formatBRL(pago)} />
        <StatCard label="A pagar" value={formatBRL(aPagar)} />
        <StatCard label="Orçamentos aguardando você" value={String(orcPend)} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel className="p-5">
          <PanelHeader title="Meus eventos" />
          <ul className="mt-4 divide-y divide-border">
            {meusEventos.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium">{e.nome}</p>
                  <p className="text-muted-foreground text-xs">
                    {formatDate(e.data)} · {e.local} · {e.convidados} convidados
                  </p>
                </div>
                <StatusBadge status={e.status} />
              </li>
            ))}
          </ul>
        </Panel>
        <Panel className="p-5">
          <PanelHeader
            title="Próximo pagamento"
            action={<Link to="/cliente/pagamentos" className="text-brand text-xs font-medium">Ver todos</Link>}
          />
          {proxima ? (
            <div className="bg-surface mt-4 rounded-xl p-4 ring-1 ring-black/5">
              <p className="text-muted-foreground text-xs">{nomeEvento(proxima.eventoId)} · parcela {proxima.parcela}</p>
              <p className="font-display mt-1 text-2xl font-semibold">{formatBRL(proxima.valor)}</p>
              <p className="text-muted-foreground text-xs">Vence em {formatDate(proxima.vencimento)}</p>
            </div>
          ) : (
            <p className="text-muted-foreground mt-4 text-sm">Nenhum pagamento pendente.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}
