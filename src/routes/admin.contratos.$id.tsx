import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Printer } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, Panel } from "@/components/panel";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  cancelarContrato,
  enviarContrato,
  obterContrato,
} from "@/features/contratos/server-functions";
import { formatBRL, formatDate } from "@/lib/format";

export const Route = createFileRoute("/admin/contratos/$id")({
  loader: ({ params }) => obterContrato({ data: { id: params.id } }),
  component: DetalheContrato,
});

function DetalheContrato() {
  const contrato = Route.useLoaderData();
  const enviar = useServerFn(enviarContrato);
  const cancelar = useServerFn(cancelarContrato);
  const router = useRouter();
  async function executar(action: "enviar" | "cancelar") {
    try {
      if (action === "enviar") await enviar({ data: { id: contrato.id } });
      else await cancelar({ data: { id: contrato.id } });
      toast.success(action === "enviar" ? "Contrato enviado." : "Contrato cancelado.");
      await router.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Operação não concluída.");
    }
  }
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={`Contrato #${contrato.numero}`}
        subtitle={`${contrato.evento.cliente.nome} · ${contrato.evento.nome}`}
        actions={
          <>
            <StatusBadge status={contrato.status} />
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="size-4" /> Imprimir / PDF
            </Button>
            {contrato.status === "RASCUNHO" && (
              <Button onClick={() => void executar("enviar")}>Enviar para assinatura</Button>
            )}
            {contrato.status !== "ASSINADO" && contrato.status !== "CANCELADO" && (
              <Button variant="outline" onClick={() => void executar("cancelar")}>
                Cancelar
              </Button>
            )}
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Panel className="p-5">
          <p className="text-muted-foreground text-xs">Valor</p>
          <p className="font-display text-xl font-semibold">
            {formatBRL(Number(contrato.valorTotal))}
          </p>
        </Panel>
        <Panel className="p-5">
          <p className="text-muted-foreground text-xs">Enviado</p>
          <p>{contrato.enviadoEm ? formatDate(contrato.enviadoEm) : "—"}</p>
        </Panel>
        <Panel className="p-5">
          <p className="text-muted-foreground text-xs">Assinado</p>
          <p>{contrato.assinadoEm ? formatDate(contrato.assinadoEm) : "—"}</p>
        </Panel>
      </div>
      <Panel className="p-6">
        <h2 className="font-display font-semibold">Conteúdo</h2>
        <p className="mt-4 whitespace-pre-wrap text-sm">
          {contrato.conteudo ?? "Conteúdo contratual ainda não informado."}
        </p>
        {contrato.documentoUrl && (
          <Button className="mt-4" variant="outline" asChild>
            <a href={contrato.documentoUrl} target="_blank" rel="noreferrer">
              Abrir documento
            </a>
          </Button>
        )}
      </Panel>
      <Panel className="p-5">
        <h2 className="font-display font-semibold">Parcelas</h2>
        <ul className="mt-3 divide-y divide-border">
          {contrato.pagamentos.map((item) => (
            <li key={item.id} className="flex justify-between py-3 text-sm">
              <span>
                Parcela {item.numeroParcela} · {formatDate(item.dataVencimento)}
              </span>
              <span>
                {formatBRL(Number(item.valor))} · {item.status}
              </span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
