import { createFileRoute, Link } from "@tanstack/react-router";

import { PageHeader, Panel } from "@/components/panel";
import { StatusBadge } from "@/components/status-badge";
import { contratos, nomeCliente, nomeEvento } from "@/data/mock";
import { formatBRL, formatDate } from "@/lib/format";

export const Route = createFileRoute("/admin/contratos/")({
  head: () => ({
    meta: [
      { title: "Contratos — Mesa Buffet & Eventos" },
      { name: "description", content: "Contratos digitais do buffet: emissão, envio e assinatura." },
      { property: "og:title", content: "Contratos — Mesa Buffet & Eventos" },
      { property: "og:description", content: "Gestão de contratos e assinaturas." },
    ],
  }),
  component: ContratosPage,
});

function ContratosPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Contratos" subtitle={`${contratos.length} contratos registrados`} />
      <Panel className="p-5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead>
              <tr className="text-muted-foreground border-b border-border text-[11px] uppercase">
                <th className="pb-2 font-medium">Contrato</th>
                <th className="pb-2 font-medium">Cliente</th>
                <th className="pb-2 font-medium">Evento</th>
                <th className="pb-2 font-medium">Data</th>
                <th className="pb-2 font-medium">Valor</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Assinatura</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {contratos.map((c) => (
                <tr key={c.id}>
                  <td className="py-3 pr-3">
                    <Link to="/admin/contratos/$id" params={{ id: c.id }} className="font-medium hover:underline">
                      {c.codigo}
                    </Link>
                  </td>
                  <td className="text-muted-foreground py-3 pr-3">{nomeCliente(c.clienteId)}</td>
                  <td className="text-muted-foreground py-3 pr-3">{nomeEvento(c.eventoId)}</td>
                  <td className="text-muted-foreground py-3 pr-3">{formatDate(c.data)}</td>
                  <td className="py-3 pr-3 font-medium">{formatBRL(c.valor)}</td>
                  <td className="py-3 pr-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="text-muted-foreground py-3">
                    {c.assinadoEm ? `${formatDate(c.assinadoEm)} às ${c.assinadoHora}` : "—"}
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
