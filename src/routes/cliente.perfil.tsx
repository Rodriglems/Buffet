import type { FormEvent } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { PageHeader, Panel, PanelHeader } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { atualizarMeuPerfil, obterMeuPerfil } from "@/features/usuarios/server-functions";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/cliente/perfil")({
  head: () => pageMeta("Meu perfil", "Atualize seus dados de contato e endereço."),
  loader: () => obterMeuPerfil(),
  component: Perfil,
});

function Perfil() {
  const c = Route.useLoaderData();
  const atualizar = useServerFn(atualizarMeuPerfil);
  const router = useRouter();
  const campos: [string, string, string][] = [
    ["Nome", "nome", c.nome],
    ["E-mail", "email", c.email],
    ["Telefone", "telefone", c.cliente?.telefone ?? ""],
    ["WhatsApp", "whatsapp", c.cliente?.whatsapp ?? ""],
    ["CEP", "cep", c.cliente?.cep ?? ""],
    ["Estado", "estado", c.cliente?.estado ?? ""],
    ["Cidade", "cidade", c.cliente?.cidade ?? ""],
    ["Bairro", "bairro", c.cliente?.bairro ?? ""],
    ["Endereço", "logradouro", c.cliente?.logradouro ?? ""],
    ["Número", "numero", c.cliente?.numero ?? ""],
  ];
  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "").trim();
    const optional = (name: string) => text(name) || null;
    try {
      await atualizar({
        data: {
          nome: text("nome"),
          email: text("email"),
          telefone: text("telefone").replace(/\D/g, "") || null,
          whatsapp: text("whatsapp").replace(/\D/g, "") || null,
          cep: text("cep").replace(/\D/g, "") || null,
          estado: optional("estado")?.toUpperCase() ?? null,
          cidade: optional("cidade"),
          bairro: optional("bairro"),
          logradouro: optional("logradouro"),
          numero: optional("numero"),
        },
      });
      toast.success("Perfil atualizado.");
      await router.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao atualizar perfil.");
    }
  }
  return (
    <form className="flex flex-col gap-4" onSubmit={salvar}>
      <PageHeader title="Meu perfil" />
      <Panel className="p-5">
        <PanelHeader title="Dados pessoais" />
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {campos.map(([l, name, v]) => (
            <div key={l} className="flex flex-col gap-1.5">
              <Label htmlFor={name}>{l}</Label>
              <Input id={name} name={name} defaultValue={v} />
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Button type="submit">Salvar</Button>
        </div>
      </Panel>
    </form>
  );
}
