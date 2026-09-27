import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/layout/app-shell";
import { adminNav } from "@/components/layout/nav-config";
import { usuarioAdmin } from "@/data/mock";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <AppShell
      nav={adminNav}
      area="admin"
      usuario={{
        nome: usuarioAdmin.nome,
        cargo: usuarioAdmin.cargo,
        iniciais: usuarioAdmin.iniciais,
      }}
      trocarPara={{ label: "Ver portal do cliente", to: "/cliente" }}
    />
  );
}
