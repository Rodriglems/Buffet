import { createFileRoute, redirect } from "@tanstack/react-router";

import { AppShell } from "@/components/layout/app-shell";
import { clienteNav } from "@/components/layout/nav-config";
import { currentUser } from "@/features/auth/server-functions";

export const Route = createFileRoute("/cliente")({
  loader: async () => {
    const usuario = await currentUser();
    if (!usuario) throw redirect({ to: "/" });
    if (usuario.role !== "CLIENT") throw redirect({ to: "/admin" });
    return usuario;
  },
  component: ClienteLayout,
});

function ClienteLayout() {
  const usuario = Route.useLoaderData();
  const iniciais = usuario.nome
    .split(" ")
    .filter((p) => p.length > 2)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <AppShell
      nav={clienteNav}
      area="cliente"
      usuario={{ nome: usuario.nome, cargo: "Cliente", iniciais }}
    />
  );
}
