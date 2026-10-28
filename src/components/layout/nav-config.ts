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
  Bell,
  PartyPopper,
  Utensils,
  UserCog,
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
      { label: "Clientes", to: "/admin/clientes", icon: Users, permission: "contatos" },
      { label: "Cardápio", to: "/admin/servicos", icon: Utensils, permission: "servicos" },
      {
        label: "Eventos",
        to: "/admin/eventos",
        icon: PartyPopper,
        permission: "eventos",
        activePrefixes: ["/admin/eventos", "/admin/orcamentos"],
      },
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
      { label: "Notificações", to: "/admin/notificacoes", icon: Bell, permission: "notificacoes" },
      { label: "Documentos", to: "/admin/documentos", icon: FileText, permission: "documentos" },
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
      { label: "Documentos", to: "/cliente/documentos", icon: FileSignature },
      { label: "Pagamentos", to: "/cliente/pagamentos", icon: Wallet },
      { label: "Perfil", to: "/cliente/perfil", icon: User },
    ],
  },
];

const ROTULOS_DO_CAMINHO: Record<string, string> = {
  admin: "Painel",
  cliente: "Meu portal",
  agenda: "Agenda",
  clientes: "Clientes",
  configuracoes: "Configurações",
  custos: "Custos",
  documentos: "Documentos",
  eventos: "Eventos",
  financeiro: "Financeiro",
  notificacoes: "Notificações",
  novo: "Novo",
  orcamentos: "Orçamentos",
  pagamentos: "Pagamentos",
  perfil: "Perfil",
  servicos: "Cardápio",
  usuarios: "Usuários",
};

// Seções que no painel da equipe têm outro nome que no portal do cliente.
const ROTULOS_DO_PAINEL: Record<string, string> = {
  pagamentos: "A receber",
};

// Nome mostrado no lugar do identificador interno (UUID), conforme a seção anterior do caminho.
const ROTULOS_DE_REGISTRO: Record<string, string> = {
  clientes: "Cadastro do cliente",
  eventos: "Detalhes do evento",
  orcamentos: "Orçamento",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Trilha de navegação legível: "/admin/eventos/<id>" → ["Painel", "Eventos", "Detalhes do evento"]. */
export function trilhaDoCaminho(pathname: string): string[] {
  const partes = pathname.split("/").filter(Boolean);
  return partes.map((parte, indice) => {
    const texto = decodeURIComponent(parte);
    const anterior = partes[indice - 1] ?? "";
    return UUID.test(texto)
      ? (ROTULOS_DE_REGISTRO[anterior] ?? "Detalhes")
      : ((anterior === "admin" ? ROTULOS_DO_PAINEL[texto] : undefined) ??
          ROTULOS_DO_CAMINHO[texto] ??
          texto.replace(/-/g, " ").replace(/^\p{L}/u, (letra) => letra.toUpperCase()));
  });
}
