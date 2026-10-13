import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { PageHeader, Panel } from "@/components/panel";
import { EmptyState } from "@/components/states";
import { Button } from "@/components/ui/button";
import {
  listarNotificacoes,
  marcarNotificacaoLida,
  marcarTodasLidas,
} from "@/features/notificacoes/server-functions";
import { formatDate } from "@/lib/format";
import { pageMeta } from "@/lib/meta";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/notificacoes")({
  head: () => pageMeta("Notificações", "Alertas de contratos, pagamentos, orçamentos e eventos."),
  loader: () => listarNotificacoes({ data: { page: 1, pageSize: 100, apenasNaoLidas: false } }),
  component: Notificacoes,
});

function Notificacoes() {
  const { items: lista } = Route.useLoaderData();
  const marcarUma = useServerFn(marcarNotificacaoLida);
  const marcarTodas = useServerFn(marcarTodasLidas);
  const router = useRouter();
  const naoLidas = lista.filter((n) => !n.lida).length;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Notificações"
        subtitle={naoLidas ? `${naoLidas} não lidas` : "Tudo em dia"}
        actions={
          <Button
            variant="outline"
            disabled={!naoLidas}
            onClick={() => {
              void marcarTodas()
                .then(() => router.invalidate())
                .then(() => toast.success("Todas marcadas como lidas."));
            }}
          >
            Marcar todas como lidas
          </Button>
        }
      />
      <Panel className="p-2">
        {lista.length === 0 ? (
          <EmptyState title="Sem notificações" description="Você será avisado aqui." />
        ) : (
          <ul>
            {lista.map((n) => (
              <li key={n.id}>
                <button
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl p-3 text-left hover:bg-accent/40",
                    !n.lida && "bg-brand/5",
                  )}
                  onClick={() =>
                    void marcarUma({ data: { id: n.id } }).then(() => router.invalidate())
                  }
                >
                  <span
                    className={cn(
                      "mt-1.5 size-2 shrink-0 rounded-full",
                      n.lida ? "bg-transparent" : "bg-brand",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{n.titulo}</p>
                    <p className="text-muted-foreground text-xs">{n.mensagem}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground text-[11px]">{formatDate(n.createdAt)}</p>
                    <p className="text-muted-foreground text-[11px]">
                      {new Date(n.createdAt).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
