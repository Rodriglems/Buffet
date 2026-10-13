import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { PageHeader, Panel } from "@/components/panel";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { aprovarOrcamento, listarOrcamentos } from "@/features/orcamentos/server-functions";
import { formatBRL, formatDate } from "@/lib/format";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/cliente/orcamentos")({
  head: () => pageMeta("Meus orçamentos", "Veja, aprove ou peça alterações nas suas propostas."),
  loader: () => listarOrcamentos({ data: { page: 1, pageSize: 100 } }),
  component: MeusOrcamentos,
});

function MeusOrcamentos() {
  const { items: lista } = Route.useLoaderData();
  const aprovar = useServerFn(aprovarOrcamento);
  const router = useRouter();
  async function confirmar(id: string) {
    try {
      await aprovar({ data: { id } });
      toast.success("Orçamento aprovado!");
      await router.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao aprovar.");
    }
  }
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Orçamentos" subtitle="Suas propostas" />
      {lista.map((o) => (
        <Panel key={o.id} className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-display text-base font-semibold">
                #{o.numero.toString()} · {o.evento.nome}
              </p>
              <p className="text-muted-foreground text-xs">
                Versão {o.versao} · válido até{" "}
                {o.validade ? formatDate(o.validade) : "sem validade"}
              </p>
            </div>
            <StatusBadge status={o.status} />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="font-display text-lg font-semibold">{formatBRL(Number(o.total))}</p>
            {["ENVIADO", "VISUALIZADO", "AGUARDANDO_APROVACAO", "EM_NEGOCIACAO"].includes(
              o.status,
            ) && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => toast("Pedido de alteração enviado.")}>
                  Pedir alteração
                </Button>
                <Button onClick={() => void confirmar(o.id)}>Aprovar</Button>
              </div>
            )}
          </div>
        </Panel>
      ))}
    </div>
  );
}
