export const PERMISSION_KEYS = [
  "leads",
  "contatos",
  "servicos",
  "eventos",
  "orcamentos",
  "contratos",
  "financeiro",
  "pagamentos",
  "custos",
  "agenda",
  "atividades",
  "notificacoes",
  "documentos",
  "usuarios",
  "configuracoes",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];
export type Permissoes = Record<PermissionKey, boolean>;

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  leads: "Leads",
  contatos: "Clientes",
  servicos: "Serviços",
  eventos: "Eventos",
  orcamentos: "Orçamentos",
  contratos: "Contratos",
  financeiro: "Financeiro — visão geral",
  pagamentos: "Financeiro — pagamentos",
  custos: "Financeiro — custos",
  agenda: "Agenda",
  atividades: "Atividades",
  notificacoes: "Notificações",
  documentos: "Documentos",
  usuarios: "Usuários",
  configuracoes: "Configurações",
};

const PATH_PERMISSIONS: { prefix: string; key: PermissionKey }[] = [
  { prefix: "/admin/leads", key: "leads" },
  { prefix: "/admin/clientes", key: "contatos" },
  { prefix: "/admin/servicos", key: "servicos" },
  { prefix: "/admin/eventos", key: "eventos" },
  { prefix: "/admin/orcamentos", key: "orcamentos" },
  { prefix: "/admin/contratos", key: "contratos" },
  { prefix: "/admin/financeiro", key: "financeiro" },
  { prefix: "/admin/pagamentos", key: "pagamentos" },
  { prefix: "/admin/custos", key: "custos" },
  { prefix: "/admin/agenda", key: "agenda" },
  { prefix: "/admin/atividades", key: "atividades" },
  { prefix: "/admin/notificacoes", key: "notificacoes" },
  { prefix: "/admin/documentos", key: "documentos" },
  { prefix: "/admin/usuarios", key: "usuarios" },
  { prefix: "/admin/configuracoes", key: "configuracoes" },
];

export function permissoesPadrao(): Permissoes {
  return Object.fromEntries(PERMISSION_KEYS.map((key) => [key, true])) as Permissoes;
}

export function parsePermissoes(value: unknown): Permissoes {
  const base = permissoesPadrao();
  if (!value || typeof value !== "object" || Array.isArray(value)) return base;
  const record = value as Record<string, unknown>;
  for (const key of PERMISSION_KEYS) {
    if (typeof record[key] === "boolean") base[key] = record[key];
  }
  if (typeof record["financeiro"] === "boolean") {
    if (typeof record["pagamentos"] !== "boolean") base.pagamentos = record["financeiro"];
    if (typeof record["custos"] !== "boolean") base.custos = record["financeiro"];
  }
  return base;
}

export function hasPermission(value: unknown, key: PermissionKey): boolean {
  return parsePermissoes(value)[key];
}

export function permissionForPath(pathname: string): PermissionKey | null {
  const match = PATH_PERMISSIONS.find(
    (item) => pathname === item.prefix || pathname.startsWith(`${item.prefix}/`),
  );
  return match?.key ?? null;
}
