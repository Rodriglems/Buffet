import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";

import { PageHeader, Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { listarDocumentos } from "@/features/documentos/server-functions";
import { formatDate } from "@/lib/format";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/cliente/documentos")({
  head: () => pageMeta("Documentos", "Todos os arquivos do seu evento para baixar."),
  loader: () => listarDocumentos({ data: { page: 1, pageSize: 100 } }),
  component: Documentos,
});

function Documentos() {
  const { items: docs } = Route.useLoaderData();
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Documentos" subtitle={`${docs.length} arquivos`} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {docs.map((d) => (
          <Panel key={d.id} className="flex items-center gap-3 p-4">
            <div className="bg-brand/12 text-brand grid size-10 place-items-center rounded-xl">
              <FileText className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{d.nome}</p>
              <p className="text-muted-foreground text-xs">{formatDate(d.createdAt)}</p>
            </div>
            <Button size="sm" variant="outline" asChild>
              <a href={d.url} target="_blank" rel="noreferrer">
                Baixar
              </a>
            </Button>
          </Panel>
        ))}
      </div>
    </div>
  );
}
