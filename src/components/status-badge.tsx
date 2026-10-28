import { cva, type VariantProps } from "class-variance-authority";
import { chaveStatus, rotuloStatus } from "@/lib/status-rotulos";
import { cn } from "@/lib/utils";

const statusBadge = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "bg-muted text-muted-foreground",
        brand: "bg-brand/10 text-brand",
        success: "bg-success/12 text-success",
        warning: "bg-warning/18 text-warning-foreground",
        info: "bg-info/12 text-info",
        violet: "bg-violet/12 text-violet",
        danger: "bg-destructive/12 text-destructive",
        slate: "bg-slate-100 text-slate-700",
        purple: "bg-purple-100 text-purple-700",
        amber: "bg-amber-100 text-amber-800",
        sky: "bg-sky-100 text-sky-700",
        indigo: "bg-indigo-100 text-indigo-700",
        emerald: "bg-emerald-100 text-emerald-700",
        teal: "bg-teal-100 text-teal-700",
        cyan: "bg-cyan-100 text-cyan-800",
        blue: "bg-blue-100 text-blue-700",
        fuchsia: "bg-fuchsia-100 text-fuchsia-700",
        orange: "bg-orange-100 text-orange-800",
        rose: "bg-rose-100 text-rose-700",
        lime: "bg-lime-100 text-lime-800",
        green: "bg-green-100 text-green-700",
        red: "bg-red-100 text-red-700",
        zinc: "bg-zinc-200 text-zinc-700",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export type Tone = NonNullable<VariantProps<typeof statusBadge>["tone"]>;

const mapa: Record<string, Tone> = {
  // Eventos
  ORCAMENTO: "blue",
  APROVADO: "sky",
  PAGAMENTO: "amber",
  CONFIRMADO: "emerald",
  CANCELADO: "red",
  FINALIZADO: "zinc",
  // Orçamentos
  RASCUNHO: "slate",
  ENVIADO: "blue",
  VISUALIZADO: "fuchsia",
  EM_NEGOCIACAO: "orange",
  AGUARDANDO_APROVACAO: "amber",
  REJEITADO: "rose",
  EXPIRADO: "zinc",
  // Pagamentos
  PENDENTE: "amber",
  PAGO: "green",
  ATRASADO: "red",
  // Compromissos da agenda
  CONCLUIDO: "green",
  // Clientes
  ATIVO: "lime",
  INATIVO: "zinc",
};

export function StatusBadge({
  status,
  dot = true,
  className,
}: {
  status: string;
  dot?: boolean;
  className?: string;
}) {
  const tone = mapa[chaveStatus(status)] ?? "neutral";
  return (
    <span className={cn(statusBadge({ tone }), className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {rotuloStatus(status)}
    </span>
  );
}
