import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { PageHeader, Panel } from "@/components/panel";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { clienteLogado, contratos, nomeEvento } from "@/data/mock";
import { formatBRL, formatDate } from "@/lib/format";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/cliente/contratos")({
  head: () => pageMeta("Meus contratos", "Leia e assine seus contratos digitalmente."),
  component: MeusContratos,
});

function MeusContratos() {
  const lista = contratos.filter((c) => c.clienteId === clienteLogado.id);
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Contratos" subtitle="Seus contratos digitais" />
      {lista.map((c) => (
        <Panel key={c.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="font-display text-base font-semibold">{c.codigo} · {nomeEvento(c.eventoId)}</p>
            <p className="text-muted-foreground text-xs">
              Emitido em {formatDate(c.data)} · {formatBRL(c.valor)}
              {c.assinadoEm ? ` · assinado em ${formatDate(c.assinadoEm)}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={c.status} />
            <Button variant="outline" onClick={() => toast.success("Download iniciado.")}>Baixar</Button>
            {c.status !== "Assinado" && (
              <Button onClick={() => toast.success("Contrato assinado com sucesso.")}>Assinar</Button>
            )}
          </div>
        </Panel>
      ))}
    </div>
  );
}
