import { cva, type VariantProps } from "class-variance-authority";
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
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export type Tone = NonNullable<VariantProps<typeof statusBadge>["tone"]>;

const mapa: Record<string, Tone> = {
  // Eventos
  Planejamento: "neutral",
  Orçamento: "violet",
  Negociação: "warning",
  Aprovado: "info",
  Contrato: "brand",
  Assinado: "success",
  Confirmado: "success",
  Realizado: "success",
  Finalizado: "neutral",
  Cancelado: "danger",
  // Orçamentos
  Rascunho: "neutral",
  Enviado: "info",
  Visualizado: "violet",
  "Em negociação": "warning",
  "Aguardando aprovação": "warning",
  Rejeitado: "danger",
  Expirado: "danger",
  // Contratos
  "Aguardando assinatura": "warning",
  // Pagamentos
  Pendente: "warning",
  Pago: "success",
  Atrasado: "danger",
  // Clientes
  Ativo: "success",
  Inativo: "neutral",
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
  const tone = mapa[status] ?? "neutral";
  return (
    <span className={cn(statusBadge({ tone }), className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {status}
    </span>
  );
}
