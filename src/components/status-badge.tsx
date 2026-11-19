import { cva, type VariantProps } from "class-variance-authority";
import { chaveStatus, rotuloStatus } from "@/lib/status-rotulos";
import { cn } from "@/lib/utils";

/**
 * Selo de status: cor cheia com texto branco, sem bolinha. Cada tom usa o tom escuro (600/700)
 * da paleta para o texto branco passar de 4,5:1 de contraste mesmo em 11px.
 */
const statusBadge = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap text-white",
  {
    variants: {
      tone: {
        neutral: "bg-zinc-500",
        brand: "bg-brand",
        success: "bg-emerald-700",
        warning: "bg-amber-700",
        info: "bg-blue-600",
        violet: "bg-violet-600",
        danger: "bg-red-600",
        slate: "bg-slate-600",
        purple: "bg-purple-600",
        amber: "bg-amber-700",
        sky: "bg-sky-700",
        indigo: "bg-indigo-600",
        emerald: "bg-emerald-700",
        teal: "bg-teal-700",
        cyan: "bg-cyan-700",
        blue: "bg-blue-600",
        fuchsia: "bg-fuchsia-700",
        orange: "bg-orange-700",
        rose: "bg-rose-600",
        lime: "bg-lime-700",
        green: "bg-green-700",
        red: "bg-red-600",
        zinc: "bg-zinc-600",
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
  SEM_ACESSO: "amber",
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  /** Mantido por compatibilidade: o selo não tem mais a bolinha. */
  dot?: boolean;
  className?: string;
}) {
  const tone = mapa[chaveStatus(status)] ?? "neutral";
  return <span className={cn(statusBadge({ tone }), className)}>{rotuloStatus(status)}</span>;
}
