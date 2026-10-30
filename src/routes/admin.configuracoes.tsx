import { useState, type ChangeEvent, type FormEvent } from "react";
import { createFileRoute, Link, useRouteContext, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { PageHeader, Panel, PanelHeader } from "@/components/panel";
import { SeletorImagem } from "@/components/seletor-imagem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { atualizarEmpresa, obterEmpresa } from "@/features/empresa/server-functions";
import { uploadImagem } from "@/features/uploads/server-functions";
import { PermissoesDialog } from "@/features/usuarios/permissoes-dialog";
import { listarUsuarios } from "@/features/usuarios/server-functions";
import {
  formatarCnpj,
  linhasEnderecoEmpresa,
  textoTelefonesEmpresa,
} from "@/lib/empresa-cabecalho";
import { pageMeta } from "@/lib/meta";
import { aplicarCor, CORES_SISTEMA, corValida, type CorSistema } from "@/lib/theme-accent";
import { cn } from "@/lib/utils";
import { telefoneDe } from "@/lib/empresa-cabecalho";

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
  const { usuario: atual } = useRouteContext({ from: "/admin" });
  const atualizar = useServerFn(atualizarEmpresa);
  const router = useRouter();
  const [cor, setCor] = useState<CorSistema>(corValida(empresa.corTema));
  const [logoOrcamento, setLogoOrcamento] = useState(empresa.logoOrcamentoUrl ?? "");
  const [logoAlterada, setLogoAlterada] = useState(false);
  const [enviandoLogo, setEnviandoLogo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [permissoesDe, setPermissoesDe] = useState<(typeof usuarios)[number] | null>(null);
  // Endereço e telefones controlados para atualizar a prévia do cabeçalho do PDF ao digitar.
  const [contato, setContato] = useState({
    telefonesContato: empresa.telefonesContato ?? "",
    cep: empresa.cep ?? "",
    logradouro: empresa.logradouro ?? "",
    numero: empresa.numero ?? "",
    complemento: empresa.complemento ?? "",
    bairro: empresa.bairro ?? "",
    cidade: empresa.cidade ?? "",
    estado: empresa.estado?.trim() ?? "",
  });
  const alterarContato = (campo: keyof typeof contato, valor: string) =>
    setContato((atual) => ({ ...atual, [campo]: valor }));
  const previaEndereco = linhasEnderecoEmpresa(contato);
  const previaTelefones = textoTelefonesEmpresa({
    ...contato,
    telefone: empresa.telefone,
    whatsapp: empresa.whatsapp,
  });

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

  async function escolherLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!(["image/png", "image/jpeg", "image/webp"] as string[]).includes(file.type)) {
      toast.error("Escolha uma imagem PNG, JPG ou WebP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2 MB.");
      return;
    }
    setEnviandoLogo(true);
    try {
      setLogoOrcamento(await uploadImagem("logo", file));
      setLogoAlterada(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar a imagem.");
    } finally {
      setEnviandoLogo(false);
    }
  }

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (salvando) return;
    setSalvando(true);
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "").trim();
    const cep = contato.cep.replace(/\D/g, "");
    const estado = contato.estado.trim().toUpperCase();
    if (cep && cep.length !== 8) {
      toast.error("O CEP precisa ter 8 números.");
      setSalvando(false);
      return;
    }
    if (estado && !/^[A-Z]{2}$/.test(estado)) {
      toast.error("Informe a UF com 2 letras, por exemplo PI.");
      setSalvando(false);
      return;
    }
    const opcional = (valor: string) => valor.trim() || null;
    try {
      await atualizar({
        data: {
          razaoSocial: text("razaoSocial"),
          nomeFantasia: text("nomeFantasia"),
          cnpj: text("cnpj").replace(/\D/g, ""),
          whatsapp: text("whatsapp").replace(/\D/g, "") || null,
          email: text("email"),
          telefonesContato: opcional(contato.telefonesContato),
          cep: cep || null,
          logradouro: opcional(contato.logradouro),
          numero: opcional(contato.numero),
          complemento: opcional(contato.complemento),
          bairro: opcional(contato.bairro),
          cidade: opcional(contato.cidade),
          estado: estado || null,
          logoOrcamentoUrl: logoOrcamento || null,
        },
      });
      toast.success(logoAlterada ? "Imagem salva com sucesso!" : "Alterações salvas com sucesso.");
      setLogoAlterada(false);
      await router.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar.");
    } finally {
      setSalvando(false);
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
                subtitle="Aparecem nos orçamentos e no PDF dos eventos"
              />
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Campo label="Razão social" name="razaoSocial" value={empresa.razaoSocial} />
                <Campo label="Nome fantasia" name="nomeFantasia" value={empresa.nomeFantasia} />
                <Campo label="CNPJ" name="cnpj" value={empresa.cnpj} />
                <Campo
                  label="WhatsApp (recebe os avisos de pedidos)"
                  name="whatsapp"
                  value={telefoneDe(empresa.whatsapp) ?? ""}
                />
                <Campo label="E-mail" name="email" value={empresa.email} />
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="telefonesContato">Telefones para contato</Label>
                  <Input
                    id="telefonesContato"
                    maxLength={200}
                    placeholder="(11) 9 1234-5678 / 9 8765-4321 / 3333-0000"
                    value={contato.telefonesContato}
                    onChange={(event) => alterarContato("telefonesContato", event.target.value)}
                  />
                  <p className="text-muted-foreground text-xs">
                    Escreva todos os números neste campo, separados por “/”, do jeito que devem
                    aparecer no PDF do evento.
                  </p>
                </div>

                <div className="border-border mt-2 border-t pt-4 sm:col-span-2">
                  <p className="text-sm font-semibold">Endereço</p>
                  <p className="text-muted-foreground text-xs">Aparece no cabeçalho do PDF.</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    inputMode="numeric"
                    maxLength={9}
                    placeholder="00000-000"
                    value={contato.cep}
                    onChange={(event) => alterarContato("cep", event.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="logradouro">Rua</Label>
                  <Input
                    id="logradouro"
                    maxLength={200}
                    placeholder="Rua das Flores"
                    value={contato.logradouro}
                    onChange={(event) => alterarContato("logradouro", event.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="numero">Número</Label>
                  <Input
                    id="numero"
                    maxLength={30}
                    placeholder="123"
                    value={contato.numero}
                    onChange={(event) => alterarContato("numero", event.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="complemento">Complemento</Label>
                  <Input
                    id="complemento"
                    maxLength={120}
                    placeholder="Sala 4"
                    value={contato.complemento}
                    onChange={(event) => alterarContato("complemento", event.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="bairro">Bairro</Label>
                  <Input
                    id="bairro"
                    maxLength={120}
                    placeholder="Centro"
                    value={contato.bairro}
                    onChange={(event) => alterarContato("bairro", event.target.value)}
                  />
                </div>
                <div className="grid grid-cols-[1fr_5rem] gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="cidade">Cidade</Label>
                    <Input
                      id="cidade"
                      maxLength={120}
                      placeholder="Sua cidade"
                      value={contato.cidade}
                      onChange={(event) => alterarContato("cidade", event.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="estado">UF</Label>
                    <Input
                      id="estado"
                      maxLength={2}
                      placeholder="UF"
                      className="uppercase"
                      value={contato.estado}
                      onChange={(event) =>
                        alterarContato("estado", event.target.value.toUpperCase())
                      }
                    />
                  </div>
                </div>

                <div className="bg-surface rounded-xl p-4 text-center ring-1 ring-black/5 sm:col-span-2">
                  <p className="text-muted-foreground mb-2 text-[11px] uppercase tracking-wide">
                    Prévia do cabeçalho do PDF
                  </p>
                  <div className="font-serif text-sm leading-6 font-bold">
                    <p>CNPJ: {formatarCnpj(empresa.cnpj)}</p>
                    {previaEndereco.map((linha) => (
                      <p key={linha}>{linha}</p>
                    ))}
                    {previaTelefones ? <p>Fones: {previaTelefones}</p> : null}
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:col-span-2">
                  <Label htmlFor="logoOrcamento">Logo da página de orçamento</Label>
                  <SeletorImagem
                    id="logoOrcamento"
                    temImagem={Boolean(logoOrcamento)}
                    enviando={enviandoLogo}
                    onChange={(event) => void escolherLogo(event)}
                  />
                  <p className="text-muted-foreground text-xs">
                    Opcional. Sem uma imagem específica, será usada a logo geral da empresa.
                  </p>
                  {logoOrcamento || empresa.logoUrl ? (
                    <div className="bg-surface flex min-h-24 items-center justify-between gap-4 rounded-xl p-4 ring-1 ring-black/5">
                      <img
                        src={logoOrcamento || empresa.logoUrl || undefined}
                        alt="Pré-visualização da logo"
                        className="h-16 max-w-56 object-contain"
                      />
                      {logoOrcamento ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setLogoOrcamento("");
                            setLogoAlterada(true);
                          }}
                        >
                          Usar logo da empresa
                        </Button>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-xs">
                      Nenhuma logo cadastrada; o ícone padrão continuará sendo exibido.
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button type="submit" disabled={salvando || enviandoLogo}>
                  {salvando ? "Salvando…" : "Salvar alterações"}
                </Button>
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
                <li key={u.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{u.nome}</p>
                    <p className="text-muted-foreground text-xs">
                      {u.role === "CLIENT" ? "Cliente" : "Administrador"} ·{" "}
                      {u.ativo ? "Ativo" : "Inativo"}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setPermissoesDe(u)}>
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
        </TabsContent>
      </Tabs>
      {permissoesDe ? (
        <PermissoesDialog
          aberto
          onOpenChange={(aberto) => {
            if (!aberto) setPermissoesDe(null);
          }}
          proprio={permissoesDe.id === atual.usuarioId}
          usuario={permissoesDe}
        />
      ) : null}
    </div>
  );
}
