import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { clienteLogado, contratos, orcamentos } from "@/data/mock";
import { formatDate } from "@/lib/format";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/cliente/documentos")({
  head: () => pageMeta("Documentos", "Todos os arquivos do seu evento para baixar."),
  component: Documentos,
});

function Documentos() {
  const id = clienteLogado.id;
  const docs = [
    ...orcamentos.filter((o) => o.clienteId === id).map((o) => ({ nome: `Orçamento ${o.codigo}.pdf`, data: o.data })),
    ...contratos.filter((c) => c.clienteId === id).map((c) => ({ nome: `Contrato ${c.codigo}.pdf`, data: c.data })),
  ];
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Documentos" subtitle={`${docs.length} arquivos`} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {docs.map((d) => (
          <Panel key={d.nome} className="flex items-center gap-3 p-4">
            <div className="bg-brand/12 text-brand grid size-10 place-items-center rounded-xl">
              <FileText className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{d.nome}</p>
              <p className="text-muted-foreground text-xs">{formatDate(d.data)}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => toast.success("Download iniciado.")}>Baixar</Button>
          </Panel>
        ))}
      </div>
    </div>
  );
}
