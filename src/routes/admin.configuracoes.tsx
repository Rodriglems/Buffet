import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { PageHeader, Panel, PanelHeader } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { atualizarEmpresa, obterEmpresa } from "@/features/empresa/server-functions";
import { listarUsuarios } from "@/features/usuarios/server-functions";
import { pageMeta } from "@/lib/meta";
import { aplicarCor, CORES_SISTEMA, corValida, type CorSistema } from "@/lib/theme-accent";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/configuracoes")({
  head: () => pageMeta("Configurações", "Dados da empresa, usuários e preferências do sistema."),
  loader: async () => {
    const [empresa, usuarios] = await Promise.all([
      obterEmpresa(),
      listarUsuarios({ data: { page: 1, pageSize: 100 } }),
    ]);
    return { empresa, usuarios: usuarios.items };
  },
  component: Configuracoes,
});

function Campo({ label, name, value }: { label: string; name: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={value} />
    </div>
  );
}

function Configuracoes() {
  const { empresa, usuarios } = Route.useLoaderData();
  const atualizar = useServerFn(atualizarEmpresa);
  const router = useRouter();
  const [cor, setCor] = useState<CorSistema>(corValida(empresa.corTema));
  const salvarPreferencia = () => toast.success("Preferência atualizada.");

  async function escolherCor(id: CorSistema) {
    const anterior = cor;
    setCor(id);
    aplicarCor(id);
    try {
      await atualizar({ data: { corTema: id } });
      toast.success("Cor do sistema atualizada.");
      await router.invalidate();
    } catch (error) {
      setCor(anterior);
      aplicarCor(anterior);
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar a cor.");
    }
  }
  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "").trim();
    try {
      await atualizar({
        data: {
          razaoSocial: text("razaoSocial"),
          nomeFantasia: text("nomeFantasia"),
          cnpj: text("cnpj").replace(/\D/g, ""),
          telefone: text("telefone").replace(/\D/g, "") || null,
          email: text("email"),
        },
      });
      toast.success("Alterações salvas.");
      await router.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar.");
    }
  }
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
            <form onSubmit={salvar}>
              <PanelHeader
                title="Dados da empresa"
                subtitle="Aparecem nos orçamentos e contratos"
              />
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Campo label="Razão social" name="razaoSocial" value={empresa.razaoSocial} />
                <Campo label="Nome fantasia" name="nomeFantasia" value={empresa.nomeFantasia} />
                <Campo label="CNPJ" name="cnpj" value={empresa.cnpj} />
                <Campo label="Telefone" name="telefone" value={empresa.telefone ?? ""} />
                <Campo label="E-mail" name="email" value={empresa.email} />
              </div>
              <div className="mt-4 flex justify-end">
                <Button type="submit">Salvar</Button>
              </div>
            </form>
          </Panel>
        </TabsContent>
        <TabsContent value="usuarios" className="mt-4">
          <Panel className="p-5">
            <PanelHeader
              title="Equipe"
              action={
                <Button size="sm" asChild>
                  <Link to="/admin/usuarios">Gerenciar usuários</Link>
                </Button>
              }
            />
            <ul className="mt-4 divide-y divide-border">
              {usuarios.map((u) => (
                <li key={u.nome} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{u.nome}</p>
                    <p className="text-muted-foreground text-xs">
                      {u.role} · {u.ativo ? "Ativo" : "Inativo"}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => toast("Permissões em breve.")}>
                    Permissões
                  </Button>
                </li>
              ))}
            </ul>
          </Panel>
        </TabsContent>
        <TabsContent value="preferencias" className="mt-4 flex flex-col gap-4">
          <Panel className="p-5">
            <PanelHeader
              title="Cor do sistema"
              subtitle="A cor vale para toda a equipe e também no portal do cliente"
            />
            <div className="mt-4 flex flex-wrap gap-3">
              {CORES_SISTEMA.map((opcao) => (
                <button
                  key={opcao.id}
                  type="button"
                  aria-pressed={cor === opcao.id}
                  onClick={() => void escolherCor(opcao.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-3 py-2 text-sm ring-1 ring-black/5",
                    cor === opcao.id ? "bg-primary/10 ring-primary" : "bg-surface",
                  )}
                >
                  <span
                    className="size-5 rounded-full ring-1 ring-black/10"
                    style={{ background: opcao.swatch }}
                  />
                  {opcao.label}
                </button>
              ))}
            </div>
          </Panel>
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
                  <Switch defaultChecked={i < 3} onCheckedChange={salvarPreferencia} />
                </label>
              ))}
            </div>
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}
