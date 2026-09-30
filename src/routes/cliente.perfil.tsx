import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { PageHeader, Panel, PanelHeader } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clienteLogado as c } from "@/data/mock";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/cliente/perfil")({
  head: () => pageMeta("Meu perfil", "Atualize seus dados de contato e endereço."),
  component: Perfil,
});

function Perfil() {
  const campos: [string, string][] = [
    ["Nome", c.nome],
    ["CPF/CNPJ", c.documento],
    ["E-mail", c.email],
    ["Telefone", c.telefone],
    ["WhatsApp", c.whatsapp],
    ["CEP", c.endereco.cep],
    ["Cidade", `${c.endereco.cidade} - ${c.endereco.estado}`],
    ["Endereço", `${c.endereco.rua}, ${c.endereco.numero}`],
  ];
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Meu perfil" />
      <Panel className="p-5">
        <PanelHeader title="Dados pessoais" />
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {campos.map(([l, v]) => (
            <div key={l} className="flex flex-col gap-1.5">
              <Label>{l}</Label>
              <Input defaultValue={v} />
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={() => toast.success("Perfil atualizado.")}>Salvar</Button>
        </div>
      </Panel>
    </div>
  );
}
