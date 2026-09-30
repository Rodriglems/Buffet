import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { PageHeader, Panel, PanelHeader } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { empresa, usuarioAdmin } from "@/data/mock";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/admin/configuracoes")({
  head: () => pageMeta("Configurações", "Dados da empresa, usuários e preferências do sistema."),
  component: Configuracoes,
});

function Campo({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Input defaultValue={value} />
    </div>
  );
}

function Configuracoes() {
  const salvar = () => toast.success("Alterações salvas.");
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Configurações" subtitle="Ajuste os dados e preferências do sistema" />
      <Tabs defaultValue="empresa">
        <TabsList>
          <TabsTrigger value="empresa">Empresa</TabsTrigger>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="preferencias">Preferências</TabsTrigger>
        </TabsList>
        <TabsContent value="empresa" className="mt-4">
          <Panel className="p-5">
            <PanelHeader title="Dados da empresa" subtitle="Aparecem nos orçamentos e contratos" />
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Campo label="Nome" value={empresa.nome} />
              <Campo label="CNPJ" value={empresa.cnpj} />
              <Campo label="Telefone" value={empresa.telefone} />
              <Campo label="E-mail" value={empresa.email} />
              <div className="sm:col-span-2">
                <Campo label="Endereço" value={empresa.endereco} />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={salvar}>Salvar</Button>
            </div>
          </Panel>
        </TabsContent>
        <TabsContent value="usuarios" className="mt-4">
          <Panel className="p-5">
            <PanelHeader
              title="Equipe"
              action={<Button size="sm" onClick={() => toast.success("Convite enviado.")}>Convidar usuário</Button>}
            />
            <ul className="mt-4 divide-y divide-border">
              {[
                { nome: usuarioAdmin.nome, cargo: usuarioAdmin.cargo },
                { nome: "Rafael Nunes", cargo: "Financeiro" },
                { nome: "Beatriz Lima", cargo: "Comercial" },
              ].map((u) => (
                <li key={u.nome} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{u.nome}</p>
                    <p className="text-muted-foreground text-xs">{u.cargo}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => toast("Permissões em breve.")}>
                    Permissões
                  </Button>
                </li>
              ))}
            </ul>
          </Panel>
        </TabsContent>
        <TabsContent value="preferencias" className="mt-4">
          <Panel className="p-5">
            <PanelHeader title="Notificações" />
            <div className="mt-4 flex flex-col gap-4">
              {[
                "Avisar quando um contrato for assinado",
                "Avisar sobre pagamentos atrasados",
                "Lembrete 7 dias antes de cada evento",
                "Resumo semanal por e-mail",
              ].map((p, i) => (
                <label key={p} className="flex items-center justify-between gap-4 text-sm">
                  {p}
                  <Switch defaultChecked={i < 3} onCheckedChange={salvar} />
                </label>
              ))}
            </div>
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}
