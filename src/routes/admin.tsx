import { createFileRoute, redirect } from "@tanstack/react-router";

import { AppShell } from "@/components/layout/app-shell";
import { adminNav } from "@/components/layout/nav-config";
import { currentUser } from "@/features/auth/server-functions";

export const Route = createFileRoute("/admin")({
  loader: async () => {
    const usuario = await currentUser();
    if (!usuario) throw redirect({ to: "/" });
    if (usuario.role !== "ADMIN") throw redirect({ to: "/cliente" });
    return usuario;
  },
  component: AdminLayout,
});

function AdminLayout() {
  const usuario = Route.useLoaderData();
  const iniciais = usuario.nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase();
  return (
    <AppShell
      nav={adminNav}
      area="admin"
      usuario={{
        nome: usuario.nome,
        cargo: "Administrador",
        iniciais,
      }}
    />
  );
}
