import { useEffect } from "react";
import { createFileRoute, redirect, useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
import { visibleAdminNav } from "@/components/layout/nav-config";
import { autorizarAdmin } from "@/features/auth/server-functions";

export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ location }) => {
    const acesso = await autorizarAdmin({ data: { pathname: location.pathname } });
    if (acesso.status === "unauthenticated") throw redirect({ to: "/" });
    if (acesso.status === "forbidden") throw redirect({ to: "/cliente" });
    if (acesso.status === "denied") {
      if (typeof window !== "undefined") window.sessionStorage.setItem("mesa_acesso_negado", "1");
      throw redirect({ to: "/admin" });
    }
    return { usuario: acesso.usuario };
  },
  loader: ({ context }) => context.usuario,
  component: AdminLayout,
});

function AdminLayout() {
  const usuario = Route.useLoaderData();
  const href = useRouterState({ select: (state) => state.location.href });
  const iniciais = usuario.nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase();

  useEffect(() => {
    const aviso =
      window.sessionStorage.getItem("mesa_acesso_negado") === "1" ||
      document.cookie.split("; ").includes("mesa_acesso_negado=1");
    if (!aviso) return;
    window.sessionStorage.removeItem("mesa_acesso_negado");
    document.cookie = "mesa_acesso_negado=; Max-Age=0; path=/";
    toast.error("Você não tem permissão para acessar esta área.");
  }, [href]);

  return (
    <AppShell
      nav={visibleAdminNav(usuario.permissoes)}
      area="admin"
      cor={usuario.corTema}
      usuario={{
        nome: usuario.nome,
        cargo: "Administrador",
        iniciais,
      }}
    />
  );
}
