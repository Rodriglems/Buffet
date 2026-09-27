import {
  CalendarDays,
  FileSignature,
  FileText,
  Home,
  LayoutDashboard,
  Receipt,
  Settings,
  TrendingUp,
  User,
  Users,
  Wallet,
  History,
  Bell,
  FolderOpen,
  PartyPopper,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const adminNav: NavGroup[] = [
  {
    label: "Gestão",
    items: [
      { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
      { label: "Clientes", to: "/admin/clientes", icon: Users },
      { label: "Eventos", to: "/admin/eventos", icon: PartyPopper },
      { label: "Orçamentos", to: "/admin/orcamentos", icon: FileText },
      { label: "Contratos", to: "/admin/contratos", icon: FileSignature },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { label: "Financeiro", to: "/admin/financeiro", icon: TrendingUp },
      { label: "Pagamentos", to: "/admin/pagamentos", icon: Wallet },
      { label: "Custos", to: "/admin/custos", icon: Receipt },
    ],
  },
  {
    label: "Organização",
    items: [
      { label: "Agenda", to: "/admin/agenda", icon: CalendarDays },
      { label: "Atividades", to: "/admin/atividades", icon: History },
      { label: "Notificações", to: "/admin/notificacoes", icon: Bell },
      { label: "Configurações", to: "/admin/configuracoes", icon: Settings },
    ],
  },
];

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
