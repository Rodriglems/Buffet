import { createFileRoute, Link } from "@tanstack/react-router";

import { PageHeader, Panel, StatCard } from "@/components/panel";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { listarAtividades } from "@/features/atividades/server-functions";
import { obterEvento } from "@/features/eventos/server-functions";
import { listarPagamentos } from "@/features/pagamentos/server-functions";
import { formatBRL, formatDate } from "@/lib/format";

export const Route = createFileRoute("/admin/eventos/$id")({
  loader: async ({ params }) => {
    const [evento, pagamentos, atividades] = await Promise.all([
      obterEvento({ data: { id: params.id } }),
      listarPagamentos({ data: { page: 1, pageSize: 100 } }),
      listarAtividades({
        data: { page: 1, pageSize: 100, entidadeTipo: "EVENTO", entidadeId: params.id },
      }),
    ]);
    return {
      evento,
      pagamentos: pagamentos.items.filter((item) => item.contrato.eventoId === params.id),
      atividades: atividades.items,
    };
  },
  component: DetalheEvento,
});

function DetalheEvento() {
  const { evento, pagamentos, atividades } = Route.useLoaderData();
  const valorContratado = evento.contratos.reduce((sum, item) => sum + Number(item.valorTotal), 0);
  const custos = evento.custos.reduce((sum, item) => sum + Number(item.valor), 0);
  const recebido = pagamentos
    .filter((item) => item.status === "PAGO")
    .reduce((sum, item) => sum + Number(item.valor), 0);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={evento.nome}
        subtitle={`${evento.cliente.nome} · ${formatDate(evento.dataEvento)} · ${evento.localNome ?? "Local a definir"}`}
        actions={
          <Button asChild>
            <Link to="/admin/orcamentos/novo">Novo orçamento</Link>
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Contratado" value={formatBRL(valorContratado)} />
        <StatCard label="Recebido" value={formatBRL(recebido)} />
        <StatCard label="Custos" value={formatBRL(custos)} />
        <StatCard label="Resultado" value={formatBRL(recebido - custos)} />
      </div>
      <Panel className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-display font-semibold">{evento.tipo}</p>
            <p className="text-muted-foreground text-sm">
              {evento.quantidadeConvidados} convidados
            </p>
          </div>
          <StatusBadge status={evento.status} />
        </div>
      </Panel>
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel className="p-5">
          <h2 className="font-display font-semibold">Orçamentos e contratos</h2>
          <ul className="mt-3 divide-y divide-border">
            {evento.orcamentos.map((item) => (
              <li key={item.id} className="flex justify-between py-3 text-sm">
                <Link to="/admin/orcamentos/$id" params={{ id: item.id }}>
                  Orçamento #{item.numero}
                </Link>
                <StatusBadge status={item.status} />
              </li>
            ))}
            {evento.contratos.map((item) => (
              <li key={item.id} className="flex justify-between py-3 text-sm">
                <Link to="/admin/contratos/$id" params={{ id: item.id }}>
                  Contrato #{item.numero}
                </Link>
                <StatusBadge status={item.status} />
              </li>
            ))}
          </ul>
        </Panel>
        <Panel className="p-5">
          <h2 className="font-display font-semibold">Atividades</h2>
          <ul className="mt-3 divide-y divide-border">
            {atividades.map((item) => (
              <li key={item.id} className="py-3 text-sm">
                <p>{item.descricao}</p>
                <p className="text-muted-foreground text-xs">{formatDate(item.createdAt)}</p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
