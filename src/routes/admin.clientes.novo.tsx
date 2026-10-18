import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { EventosTabs } from "@/components/layout/section-nav";
import { PageHeader } from "@/components/panel";
import { ClienteForm } from "@/features/clientes/cliente-form";
import { criarCliente } from "@/features/clientes/server-functions";

export const Route = createFileRoute("/admin/clientes/novo")({
  head: () => ({
    meta: [
      { title: "Novo cliente — Mesly Buffet & Eventos" },
      {
        name: "description",
        content: "Cadastre um novo cliente com dados pessoais, endereço e informações comerciais.",
      },
      { property: "og:title", content: "Novo cliente — Mesly Buffet & Eventos" },
      { property: "og:description", content: "Formulário de cadastro de clientes do buffet." },
    ],
  }),
  component: NovoCliente,
});

function mensagem(error: unknown) {
  return error instanceof Error ? error.message : "Não foi possível salvar o cliente.";
}

function NovoCliente() {
  const navigate = useNavigate();
  const criar = useServerFn(criarCliente);
  const [salvando, setSalvando] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Novo contato"
        subtitle="Preencha os dados para vincular a pessoa aos eventos"
      />
      <EventosTabs />
      <ClienteForm
        salvando={salvando}
        textoSalvar="Salvar cliente"
        cancelarPara="/admin/clientes"
        onSalvar={async (dados) => {
          setSalvando(true);
          try {
            await criar({ data: dados });
            toast.success("Cliente salvo com sucesso.");
            await navigate({ to: "/admin/clientes" });
          } catch (error) {
            toast.error(mensagem(error));
          } finally {
            setSalvando(false);
          }
        }}
      />
    </div>
  );
}
