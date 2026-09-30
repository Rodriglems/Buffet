import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { PageHeader, Panel } from "@/components/panel";
import { EmptyState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { notificacoes as inicial } from "@/data/mock";
import { formatDate } from "@/lib/format";
import { pageMeta } from "@/lib/meta";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/notificacoes")({
  head: () => pageMeta("Notificações", "Alertas de contratos, pagamentos, orçamentos e eventos."),
  component: Notificacoes,
});

function Notificacoes() {
  const [lista, setLista] = useState(inicial);
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
              setLista((l) => l.map((n) => ({ ...n, lida: true })));
              toast.success("Todas marcadas como lidas.");
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
                  className={cn("flex w-full items-start gap-3 rounded-xl p-3 text-left hover:bg-accent/40", !n.lida && "bg-brand/5")}
                  onClick={() => setLista((l) => l.map((x) => (x.id === n.id ? { ...x, lida: true } : x)))}
                >
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.lida ? "bg-transparent" : "bg-brand")} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{n.titulo}</p>
                    <p className="text-muted-foreground text-xs">{n.descricao}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground text-[11px]">{formatDate(n.data)}</p>
                    <p className="text-muted-foreground text-[11px]">{n.hora}</p>
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
