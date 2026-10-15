import { Link, useRouterState } from "@tanstack/react-router";

import { cn } from "@/lib/utils";

type Destino =
  | "/admin/eventos"
  | "/admin/clientes"
  | "/admin/financeiro"
  | "/admin/pagamentos"
  | "/admin/custos";

function SectionNav({ items }: { items: { label: string; to: Destino }[] }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => {
        const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "bg-surface text-foreground/70 ring-1 ring-black/5 hover:bg-secondary",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

export function EventosTabs() {
  return (
    <SectionNav
      items={[
        { label: "Eventos", to: "/admin/eventos" },
        { label: "Contatos", to: "/admin/clientes" },
      ]}
    />
  );
}

export function FinanceiroTabs() {
  return (
    <SectionNav
      items={[
        { label: "Visão geral", to: "/admin/financeiro" },
        { label: "Pagamentos", to: "/admin/pagamentos" },
        { label: "Custos", to: "/admin/custos" },
      ]}
    />
  );
}
