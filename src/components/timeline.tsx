import { cn } from "@/lib/utils";

export interface TimelineItem {
  id: string;
  titulo: string;
  meta?: string;
  tone?: "brand" | "success" | "warning" | "danger" | "info" | "neutral";
}

const dots = {
  brand: "bg-brand",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  info: "bg-info",
  neutral: "bg-muted-foreground/40",
} as const;

export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="relative flex flex-col">
      {items.map((item, i) => (
        <li key={item.id} className="relative flex gap-3">
          <div className="flex flex-col items-center">
            <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", dots[item.tone ?? "neutral"])} />
            {i < items.length - 1 && <span className="w-px flex-1 bg-border" />}
          </div>
          <div className={cn(i < items.length - 1 && "pb-4")}>
            <p className="text-sm text-pretty">{item.titulo}</p>
            {item.meta && <p className="text-[11px] text-muted-foreground">{item.meta}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function StepTimeline({
  steps,
  current,
}: {
  steps: string[];
  current: number;
}) {
  return (
    <ol className="flex flex-col gap-0 sm:flex-row sm:items-start">
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={step} className="flex flex-1 gap-3 sm:flex-col sm:gap-2">
            <div className="flex flex-col items-center sm:w-full sm:flex-row">
              <span
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold",
                  done && "bg-brand text-primary-foreground",
                  active && "bg-brand/15 text-brand ring-2 ring-brand/40",
                  !done && !active && "bg-muted text-muted-foreground",
                )}
              >
                {i + 1}
              </span>
              {i < steps.length - 1 && (
                <span
                  className={cn(
                    "w-px flex-1 sm:h-px sm:w-full",
                    done ? "bg-brand/50" : "bg-border",
                  )}
                />
              )}
            </div>
            <p
              className={cn(
                "pb-4 text-xs sm:pb-0",
                active ? "font-semibold text-brand" : "text-muted-foreground",
              )}
            >
              {step}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
