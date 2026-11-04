import { Link } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import type { ClienteParecido } from "@/features/clientes/use-clientes-parecidos";
import { telefoneDe } from "@/lib/empresa-cabecalho";

/** Aviso de que o cliente pode já existir. Não bloqueia: a família pode dividir o telefone. */
export function AvisoClientesParecidos({
  parecidos,
  onUsar,
}: {
  parecidos: ClienteParecido[];
  /** Sem esta função, cada cadastro vira um link para abrir a ficha do cliente. */
  onUsar?: (cliente: ClienteParecido) => void;
}) {
  if (!parecidos.length) return null;
  return (
    <div
      role="status"
      className="bg-warning/10 ring-warning/30 grid gap-2 rounded-xl p-3 text-sm ring-1"
    >
      <p className="flex items-center gap-2 font-medium">
        <TriangleAlert className="text-warning-foreground size-4 shrink-0" />
        Este cliente pode já estar cadastrado
      </p>
      <ul className="grid gap-2">
        {parecidos.map((cliente) => (
          <li key={cliente.id} className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 font-medium">
                {cliente.nome}
                <StatusBadge status={cliente.acesso} dot={false} />
              </p>
              <p className="text-muted-foreground text-xs">
                {[telefoneDe(cliente.telefone ?? cliente.whatsapp), cliente.email]
                  .filter(Boolean)
                  .join(" · ") || "Sem contato"}{" "}
                · mesmo {cliente.motivo}
              </p>
            </div>
            {onUsar ? (
              <Button type="button" size="sm" variant="outline" onClick={() => onUsar(cliente)}>
                Usar este cliente
              </Button>
            ) : (
              <Button type="button" size="sm" variant="outline" asChild>
                <Link to="/admin/clientes/$id" params={{ id: cliente.id }}>
                  Abrir cadastro
                </Link>
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
