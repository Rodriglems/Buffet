import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/layout/app-shell";
import { clienteNav } from "@/components/layout/nav-config";
import { clienteLogado } from "@/data/mock";

export const Route = createFileRoute("/cliente")({
  component: ClienteLayout,
});

function ClienteLayout() {
  const iniciais = clienteLogado.nome
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
      usuario={{ nome: clienteLogado.nome, cargo: "Cliente", iniciais }}
      trocarPara={{ label: "Ver painel administrativo", to: "/admin" }}
    />
  );
}
