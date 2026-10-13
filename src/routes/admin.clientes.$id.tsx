import { createFileRoute, Link } from "@tanstack/react-router";

import { PageHeader, Panel } from "@/components/panel";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { obterCliente } from "@/features/clientes/server-functions";
import { listarContratos } from "@/features/contratos/server-functions";
import { listarOrcamentos } from "@/features/orcamentos/server-functions";
import { listarPagamentos } from "@/features/pagamentos/server-functions";
import { formatBRL, formatDate } from "@/lib/format";

export const Route = createFileRoute("/admin/clientes/$id")({
  loader: async ({ params }) => {
    const [cliente, orcamentos, contratos, pagamentos] = await Promise.all([
      obterCliente({ data: { id: params.id } }),
      listarOrcamentos({ data: { page: 1, pageSize: 100 } }),
      listarContratos({ data: { page: 1, pageSize: 100 } }),
      listarPagamentos({ data: { page: 1, pageSize: 100 } }),
    ]);
    const eventos = new Set(cliente.eventos.map((evento) => evento.id));
    return {
      cliente,
      orcamentos: orcamentos.items.filter((item) => eventos.has(item.eventoId)),
      contratos: contratos.items.filter((item) => eventos.has(item.eventoId)),
      pagamentos: pagamentos.items.filter((item) => eventos.has(item.contrato.eventoId)),
    };
  },
  component: DetalheCliente,
});

function DetalheCliente() {
  const { cliente, orcamentos, contratos, pagamentos } = Route.useLoaderData();
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={cliente.nome}
        subtitle={`${cliente.cpfCnpj ?? "Sem documento"} · cliente desde ${formatDate(cliente.createdAt)}`}
        actions={
          <Button asChild>
            <Link to="/admin/eventos/novo">Criar evento</Link>
          </Button>
        }
      />
      <Panel className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <p className="text-muted-foreground text-xs">E-mail</p>
          <p>{cliente.email ?? "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Telefone</p>
          <p>{cliente.telefone ?? "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">WhatsApp</p>
          <p>{cliente.whatsapp ?? "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Cidade</p>
          <p>
            {cliente.cidade ?? "—"}
            {cliente.estado ? `/${cliente.estado}` : ""}
          </p>
        </div>
      </Panel>
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel className="p-5">
          <h2 className="font-display font-semibold">Eventos</h2>
          <ul className="mt-3 divide-y divide-border">
            {cliente.eventos.map((evento) => (
              <li key={evento.id} className="flex justify-between py-3">
                <Link to="/admin/eventos/$id" params={{ id: evento.id }}>
                  {evento.nome}
                </Link>
                <StatusBadge status={evento.status} />
              </li>
            ))}
          </ul>
        </Panel>
        <Panel className="p-5">
          <h2 className="font-display font-semibold">Comercial</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            {orcamentos.length} orçamento(s) · {contratos.length} contrato(s)
          </p>
          <ul className="mt-3 divide-y divide-border">
            {pagamentos.map((item) => (
              <li key={item.id} className="flex justify-between py-3 text-sm">
                <span>Parcela {item.numeroParcela}</span>
                <span>
                  {formatBRL(Number(item.valor))} · {item.status}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      {cliente.observacoes && (
        <Panel className="p-5">
          <h2 className="font-display font-semibold">Observações</h2>
          <p className="text-muted-foreground mt-2 text-sm">{cliente.observacoes}</p>
        </Panel>
      )}
    </div>
  );
}
