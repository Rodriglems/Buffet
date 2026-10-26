import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, Panel } from "@/components/panel";
import { EmptyState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { baixarPdfDoEvento, listarEventosComPdf } from "@/features/documentos/eventos-pdf";
import { formatDate } from "@/lib/format";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/cliente/documentos")({
  head: () => pageMeta("Documentos", "O PDF dos seus eventos confirmados."),
  loader: () => listarEventosComPdf(),
  component: Documentos,
});

function Documentos() {
  const eventos = Route.useLoaderData();
  const [baixando, setBaixando] = useState<string | null>(null);

  async function baixar(id: string) {
    setBaixando(id);
    try {
      await baixarPdfDoEvento(id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível gerar o PDF.");
    } finally {
      setBaixando(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Documentos" subtitle={`${eventos.length} documento(s)`} />
      {eventos.length === 0 ? (
        <Panel className="p-5">
          <EmptyState
            title="Nenhum documento ainda"
            description="O PDF do seu evento fica disponível assim que ele for confirmado."
          />
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {eventos.map((evento) => (
            <Panel key={evento.id} className="flex items-center gap-3 p-4">
              <div className="bg-brand/12 text-brand grid size-10 place-items-center rounded-xl">
                <FileText className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{evento.nome}</p>
                <p className="text-muted-foreground text-xs">{formatDate(evento.dataEvento)}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={baixando !== null}
                onClick={() => void baixar(evento.id)}
              >
                {baixando === evento.id ? <Loader2 className="size-4 animate-spin" /> : null}
                Baixar
              </Button>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
