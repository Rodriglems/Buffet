import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { PageHeader, Panel } from "@/components/panel";
import { EmptyState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { listarAtividades } from "@/features/atividades/server-functions";
import { formatDate } from "@/lib/format";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/admin/atividades")({
  head: () => pageMeta("Atividades", "Histórico completo de ações realizadas no sistema."),
  loader: () => listarAtividades({ data: { page: 1, pageSize: 100 } }),
  component: Atividades,
});

const tipos = ["Todos", "Orçamento", "Contrato", "Pagamento", "Evento", "Cliente"] as const;

function Atividades() {
  const { items: atividades } = Route.useLoaderData();
  const [tipo, setTipo] = useState<(typeof tipos)[number]>("Todos");
  const lista = [...atividades]
    .filter((a) => tipo === "Todos" || a.tipo.includes(tipo.toUpperCase()))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Atividades" subtitle="Registro de tudo que aconteceu no sistema" />
      <div className="flex flex-wrap gap-2">
        {tipos.map((t) => (
          <Button
            key={t}
            size="sm"
            variant={t === tipo ? "default" : "outline"}
            onClick={() => setTipo(t)}
          >
            {t}
          </Button>
        ))}
      </div>
      <Panel className="p-5">
        {lista.length === 0 ? (
          <EmptyState title="Nenhuma atividade" description="Não há registros para este filtro." />
        ) : (
          <ul className="divide-y divide-border">
            {lista.map((a) => (
              <li key={a.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm text-pretty">{a.descricao}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {a.usuario?.nome ?? "Sistema"}
                    {a.entidadeTipo ? ` · ${a.entidadeTipo}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <span className="bg-brand/12 text-brand rounded-full px-2 py-0.5 text-[11px] font-medium">
                    {a.tipo}
                  </span>
                  <p className="text-muted-foreground mt-1 text-[11px]">
                    {formatDate(a.createdAt)} ·{" "}
                    {new Date(a.createdAt).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
