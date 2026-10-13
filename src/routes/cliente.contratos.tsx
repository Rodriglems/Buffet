import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Printer } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, Panel } from "@/components/panel";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { assinarContrato, listarContratos } from "@/features/contratos/server-functions";
import { formatBRL, formatDate } from "@/lib/format";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/cliente/contratos")({
  head: () => pageMeta("Meus contratos", "Leia e assine seus contratos digitalmente."),
  loader: () => listarContratos({ data: { page: 1, pageSize: 100 } }),
  component: MeusContratos,
});

function MeusContratos() {
  const { items: lista } = Route.useLoaderData();
  const assinar = useServerFn(assinarContrato);
  const router = useRouter();
  async function confirmar(id: string) {
    try {
      await assinar({ data: { id, userAgent: navigator.userAgent } });
      toast.success("Contrato assinado com sucesso.");
      await router.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao assinar contrato.");
    }
  }
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Contratos" subtitle="Seus contratos digitais" />
      {lista.map((c) => (
        <Panel key={c.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="font-display text-base font-semibold">
              #{c.numero.toString()} · {c.evento.nome}
            </p>
            <p className="text-muted-foreground text-xs">
              Emitido em {formatDate(c.createdAt)} · {formatBRL(Number(c.valorTotal))}
              {c.assinadoEm ? ` · assinado em ${formatDate(c.assinadoEm)}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={c.status} />
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="size-4" /> Imprimir / PDF
            </Button>
            {c.documentoUrl && (
              <Button variant="outline" asChild>
                <a href={c.documentoUrl} target="_blank" rel="noreferrer">
                  Baixar
                </a>
              </Button>
            )}
            {c.status === "AGUARDANDO_ASSINATURA" && (
              <Button onClick={() => void confirmar(c.id)}>Assinar</Button>
            )}
          </div>
        </Panel>
      ))}
    </div>
  );
}
