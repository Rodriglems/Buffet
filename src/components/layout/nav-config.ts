import {
  CalendarDays,
  FileSignature,
  FileText,
  Home,
  LayoutDashboard,
  Settings,
  TrendingUp,
  User,
  Users,
  Wallet,
  History,
  Bell,
  BriefcaseBusiness,
  Files,
  FolderOpen,
  PartyPopper,
  UserCog,
  UserPlus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { hasPermission, type PermissionKey } from "@/lib/permissions";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  permission?: PermissionKey;
  activePrefixes?: string[];
}

export function rotaAtiva(item: NavItem, pathname: string) {
  const prefixes = item.activePrefixes?.length ? item.activePrefixes : [item.to];
  return prefixes.some((prefix) => {
    if (prefix === "/admin" || prefix === "/cliente") return pathname === prefix;
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });
}

const abasFinanceiro = [
  { to: "/admin/financeiro", permission: "financeiro" },
  { to: "/admin/pagamentos", permission: "pagamentos" },
  { to: "/admin/custos", permission: "custos" },
] as const satisfies readonly { to: string; permission: PermissionKey }[];

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const adminNav: NavGroup[] = [
  {
    label: "Gestão",
    items: [
      { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
      { label: "Leads", to: "/admin/leads", icon: UserPlus, permission: "leads" },
      { label: "Serviços", to: "/admin/servicos", icon: BriefcaseBusiness, permission: "servicos" },
      { label: "Eventos", to: "/admin/eventos", icon: PartyPopper, permission: "eventos" },
      { label: "Orçamentos", to: "/admin/orcamentos", icon: FileText, permission: "orcamentos" },
      { label: "Contratos", to: "/admin/contratos", icon: FileSignature, permission: "contratos" },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { label: "Financeiro", to: "/admin/financeiro", icon: TrendingUp, permission: "financeiro" },
    ],
  },
  {
    label: "Organização",
    items: [
      { label: "Agenda", to: "/admin/agenda", icon: CalendarDays, permission: "agenda" },
      { label: "Atividades", to: "/admin/atividades", icon: History, permission: "atividades" },
      { label: "Notificações", to: "/admin/notificacoes", icon: Bell, permission: "notificacoes" },
      { label: "Documentos", to: "/admin/documentos", icon: Files, permission: "documentos" },
      { label: "Usuários", to: "/admin/usuarios", icon: UserCog, permission: "usuarios" },
      {
        label: "Configurações",
        to: "/admin/configuracoes",
        icon: Settings,
        permission: "configuracoes",
      },
    ],
  },
];

export function visibleAdminNav(permissoes: unknown): NavGroup[] {
  return adminNav
    .map((group) => ({
      ...group,
      items: group.items.flatMap((item): NavItem[] => {
        if (item.to === "/admin/eventos") {
          const prefixes = [
            hasPermission(permissoes, "eventos") ? "/admin/eventos" : null,
            hasPermission(permissoes, "contatos") ? "/admin/clientes" : null,
          ].filter((prefix): prefix is string => Boolean(prefix));
          const destino = prefixes[0];
          if (!destino) return [];
          const soContatos = prefixes.length === 1 && destino === "/admin/clientes";
          return [
            {
              ...item,
              label: soContatos ? "Contatos" : "Eventos",
              to: destino,
              icon: soContatos ? Users : item.icon,
              permission: soContatos ? ("contatos" as const) : ("eventos" as const),
              activePrefixes: prefixes,
            },
          ];
        }
        if (item.to === "/admin/financeiro") {
          const abas = abasFinanceiro.filter((aba) => hasPermission(permissoes, aba.permission));
          const primeira = abas[0];
          if (!primeira) return [];
          return [
            {
              ...item,
              to: primeira.to,
              permission: primeira.permission,
              activePrefixes: abas.map((aba) => aba.to),
            },
          ];
        }
        if (item.permission && !hasPermission(permissoes, item.permission)) return [];
        return [item];
      }),
    }))
    .filter((group) => group.items.length > 0);
}

export const clienteNav: NavGroup[] = [
  {
    label: "Meu portal",
    items: [
      { label: "Início", to: "/cliente", icon: Home },
      { label: "Meus eventos", to: "/cliente/eventos", icon: PartyPopper },
      { label: "Orçamentos", to: "/cliente/orcamentos", icon: FileText },
      { label: "Contratos", to: "/cliente/contratos", icon: FileSignature },
      { label: "Pagamentos", to: "/cliente/pagamentos", icon: Wallet },
      { label: "Documentos", to: "/cliente/documentos", icon: FolderOpen },
      { label: "Perfil", to: "/cliente/perfil", icon: User },
    ],
  },
];
