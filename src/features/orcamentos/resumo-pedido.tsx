import { CalendarDays, MapPin, Users, Utensils } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import type { obterOrcamento } from "@/features/orcamentos/server-functions";
import { formatBRL, formatDate } from "@/lib/format";

type Orcamento = Awaited<ReturnType<typeof obterOrcamento>>;

/** Resumo do pedido para o cliente: evento, itens escolhidos por categoria e valores. */
export function ResumoPedido({ orcamento }: { orcamento: Orcamento }) {
  const { evento } = orcamento;
  const total = Number(orcamento.total);
  const desconto = Number(orcamento.desconto);
  const grupos = new Map<string, string[]>();
  for (const item of orcamento.itens) {
    const categoria = item.servico?.categoria ?? "Outros itens";
    grupos.set(categoria, [...(grupos.get(categoria) ?? []), item.descricao]);
  }
  const categorias = [...grupos.keys()].sort((a, b) => a.localeCompare(b, "pt-BR"));

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg font-semibold">{evento.tipo}</p>
          {evento.formatoServico ? (
            <p className="text-muted-foreground text-sm">{evento.formatoServico}</p>
          ) : null}
        </div>
        <StatusBadge status={evento.status} />
      </div>

      <dl className="text-muted-foreground grid gap-2 text-sm sm:grid-cols-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="text-primary size-4 shrink-0" />
          <dt className="sr-only">Data</dt>
          <dd>{formatDate(evento.dataEvento)}</dd>
        </div>
        <div className="flex items-center gap-2">
          <Users className="text-primary size-4 shrink-0" />
          <dt className="sr-only">Convidados</dt>
          <dd>{evento.quantidadeConvidados} convidados</dd>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="text-primary size-4 shrink-0" />
          <dt className="sr-only">Local</dt>
          <dd>{[evento.localNome, evento.cidade].filter(Boolean).join(" · ") || "A definir"}</dd>
        </div>
      </dl>

      <div>
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Utensils className="text-primary size-4" /> Itens do seu pedido ({orcamento.itens.length}
          )
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {categorias.map((categoria) => (
            <div key={categoria} className="bg-surface rounded-xl p-4 ring-1 ring-black/5">
              <p className="text-primary text-xs font-semibold tracking-wide uppercase">
                {categoria}
              </p>
              <ul className="mt-2 grid gap-1 text-sm">
                {grupos
                  .get(categoria)!
                  .sort((a, b) => a.localeCompare(b, "pt-BR"))
                  .map((descricao, indice) => (
                    <li key={`${descricao}-${indice}`}>{descricao}</li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {evento.servicosAdicionais.length ? (
        <p className="text-muted-foreground text-sm">
          <span className="text-foreground font-medium">Serviços adicionais: </span>
          {evento.servicosAdicionais.join(", ")}
        </p>
      ) : null}

      <div className="border-border flex flex-wrap items-end justify-between gap-3 border-t pt-4">
        <p className="text-muted-foreground max-w-md text-xs">
          {total > 0
            ? "Valores da proposta preparada pela nossa equipe."
            : "Nossa equipe está preparando os valores da sua proposta. Avisaremos quando estiver pronta."}
        </p>
        <div className="text-right">
          {desconto > 0 ? (
            <p className="text-muted-foreground text-xs">Desconto de {formatBRL(desconto)}</p>
          ) : null}
          <p className="font-display text-xl font-semibold">
            {total > 0 ? formatBRL(total) : "Valor a definir"}
          </p>
        </div>
      </div>
    </div>
  );
}
