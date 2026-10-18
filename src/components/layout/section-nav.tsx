import { Link, useRouteContext, useRouterState } from "@tanstack/react-router";

import { hasPermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type Destino = "/admin/financeiro" | "/admin/pagamentos" | "/admin/custos";

function SectionNav({ items }: { items: { label: string; to: Destino }[] }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  if (items.length < 2) return null;

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

const abasFinanceiro: {
  label: string;
  to: Destino;
  permission: "financeiro" | "pagamentos" | "custos";
}[] = [
  { label: "Visão geral", to: "/admin/financeiro", permission: "financeiro" },
  { label: "Pagamentos", to: "/admin/pagamentos", permission: "pagamentos" },
  { label: "Custos", to: "/admin/custos", permission: "custos" },
];

export function FinanceiroTabs() {
  const { usuario } = useRouteContext({ from: "/admin" });
  return (
    <SectionNav
      items={abasFinanceiro.filter((aba) => hasPermission(usuario.permissoes, aba.permission))}
    />
  );
}
