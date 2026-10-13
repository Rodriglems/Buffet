import { createFileRoute, Link } from "@tanstack/react-router";

import { PageHeader, Panel, PanelHeader, StatCard } from "@/components/panel";
import { StatusBadge } from "@/components/status-badge";
import { currentUser } from "@/features/auth/server-functions";
import { listarEventos } from "@/features/eventos/server-functions";
import { listarOrcamentos } from "@/features/orcamentos/server-functions";
import { listarPagamentos } from "@/features/pagamentos/server-functions";
import { formatBRL, formatDate } from "@/lib/format";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/cliente/")({
  head: () => pageMeta("Meu portal", "Acompanhe seus eventos, orçamentos e pagamentos."),
  loader: async () => {
    const [usuario, eventos, orcamentos, pagamentos] = await Promise.all([
      currentUser(),
      listarEventos({ data: { page: 1, pageSize: 100 } }),
      listarOrcamentos({ data: { page: 1, pageSize: 100 } }),
      listarPagamentos({ data: { page: 1, pageSize: 100 } }),
    ]);
    return {
      usuario,
      eventos: eventos.items,
      orcamentos: orcamentos.items,
      pagamentos: pagamentos.items,
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
  } = Route.useLoaderData();
  const pago = minhasParcelas
    .filter((p) => p.status === "PAGO")
    .reduce((s, p) => s + Number(p.valor), 0);
  const aPagar = minhasParcelas
    .filter((p) => p.status !== "PAGO")
    .reduce((s, p) => s + Number(p.valor), 0);
  const proxima = minhasParcelas.find((p) => p.status !== "PAGO");
  const orcPend = orcamentos.filter((o) =>
    ["ENVIADO", "VISUALIZADO", "AGUARDANDO_APROVACAO"].includes(o.status),
  ).length;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={`Olá, ${usuario?.nome.split(" ")[0] ?? "Cliente"}`}
        subtitle="Tudo sobre o seu evento em um só lugar"
      />
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
                    {formatDate(e.dataEvento)} · {e.localNome ?? "Local a definir"} ·{" "}
                    {e.quantidadeConvidados} convidados
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
            action={
              <Link to="/cliente/pagamentos" className="text-brand text-xs font-medium">
                Ver todos
              </Link>
            }
          />
          {proxima ? (
            <div className="bg-surface mt-4 rounded-xl p-4 ring-1 ring-black/5">
              <p className="text-muted-foreground text-xs">
                {proxima.contrato.evento.nome} · parcela {proxima.numeroParcela}
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
      </div>
    </div>
  );
}
