import { CheckCircle2, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

export function AdicionaisOrcamento({ itens, className }: { itens: string[]; className?: string }) {
  if (!itens.length) return null;

  return (
    <section className={cn("border-primary/20 bg-primary/5 rounded-xl border p-4", className)}>
      <div className="flex items-start gap-2.5">
        <Sparkles className="text-primary mt-0.5 size-4 shrink-0" />
        <div>
          <h3 className="text-sm font-semibold">Serviços adicionais</h3>
          <p className="text-muted-foreground text-xs">Solicitados para este evento</p>
        </div>
      </div>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {itens.map((item) => (
          <li
            key={item}
            className="bg-background/80 flex min-h-11 items-start gap-2 rounded-lg px-3 py-2.5 text-sm ring-1 ring-black/5"
          >
            <CheckCircle2 className="text-primary mt-0.5 size-4 shrink-0" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
