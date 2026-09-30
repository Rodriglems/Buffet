import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { PageHeader, Panel } from "@/components/panel";
import { EmptyState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { atividades, nomeCliente } from "@/data/mock";
import { formatDate } from "@/lib/format";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/admin/atividades")({
  head: () => pageMeta("Atividades", "Histórico completo de ações realizadas no sistema."),
  component: Atividades,
});

const tipos = ["Todos", "Orçamento", "Contrato", "Pagamento", "Evento", "Cliente"] as const;

function Atividades() {
  const [tipo, setTipo] = useState<(typeof tipos)[number]>("Todos");
  const lista = [...atividades]
    .filter((a) => tipo === "Todos" || a.tipo === tipo)
    .sort((a, b) => (b.data + b.hora).localeCompare(a.data + a.hora));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Atividades" subtitle="Registro de tudo que aconteceu no sistema" />
      <div className="flex flex-wrap gap-2">
        {tipos.map((t) => (
          <Button key={t} size="sm" variant={t === tipo ? "default" : "outline"} onClick={() => setTipo(t)}>
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
                    {a.usuario}
                    {a.clienteId ? ` · ${nomeCliente(a.clienteId)}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <span className="bg-brand/12 text-brand rounded-full px-2 py-0.5 text-[11px] font-medium">{a.tipo}</span>
                  <p className="text-muted-foreground mt-1 text-[11px]">
                    {formatDate(a.data)} · {a.hora}
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
