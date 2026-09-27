import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { PageHeader, Panel, PanelHeader } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/admin/clientes/novo")({
  head: () => ({
    meta: [
      { title: "Novo cliente — Mesa Buffet & Eventos" },
      {
        name: "description",
        content: "Cadastre um novo cliente com dados pessoais, endereço e informações comerciais.",
      },
      { property: "og:title", content: "Novo cliente — Mesa Buffet & Eventos" },
      { property: "og:description", content: "Formulário de cadastro de clientes do buffet." },
    ],
  }),
  component: NovoCliente,
});

function Campo({
  label,
  id,
  placeholder,
  type = "text",
  className,
}: {
  label: string;
  id: string;
  placeholder?: string;
  type?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={id} className="mb-1.5 block">
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        placeholder={placeholder}
        className="bg-surface border-0 ring-1 ring-black/5"
      />
    </div>
  );
}

function NovoCliente() {
  const navigate = useNavigate();

  function salvar() {
    toast.success("Cliente salvo com sucesso.");
    navigate({ to: "/admin/clientes" });
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Novo cliente" subtitle="Preencha os dados para criar o cadastro" />

      <Panel className="p-5">
        <PanelHeader title="Dados pessoais" subtitle="Pessoa física ou jurídica" />
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Campo label="Nome completo / Razão social" id="nome" placeholder="João da Silva" className="sm:col-span-2" />
          <Campo label="CPF/CNPJ" id="doc" placeholder="000.000.000-00" />
          <Campo label="Data de nascimento / abertura" id="nasc" type="date" />
          <Campo label="E-mail" id="email" type="email" placeholder="cliente@email.com" />
          <Campo label="Telefone" id="tel" placeholder="(11) 0000-0000" />
          <Campo label="WhatsApp" id="zap" placeholder="(11) 90000-0000" />
        </div>
      </Panel>

      <Panel className="p-5">
        <PanelHeader title="Endereço" />
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Campo label="CEP" id="cep" placeholder="00000-000" />
          <div>
            <Label className="mb-1.5 block">Estado</Label>
            <Select>
              <SelectTrigger className="bg-surface w-full border-0 ring-1 ring-black/5">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {["SP", "RJ", "MG", "PR", "RS", "BA", "SC"].map((uf) => (
                  <SelectItem key={uf} value={uf}>
                    {uf}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Campo label="Cidade" id="cidade" placeholder="São Paulo" />
          <Campo label="Bairro" id="bairro" placeholder="Pinheiros" />
          <Campo label="Rua" id="rua" placeholder="Rua das Oliveiras" className="sm:col-span-2" />
          <Campo label="Número" id="num" placeholder="340" />
          <Campo label="Complemento" id="compl" placeholder="Apto 84" />
        </div>
      </Panel>

      <Panel className="p-5">
        <PanelHeader title="Informações adicionais" />
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label className="mb-1.5 block">Origem do cliente</Label>
            <Select>
              <SelectTrigger className="bg-surface w-full border-0 ring-1 ring-black/5">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {["Indicação", "Instagram", "Site", "Feira de noivas", "Prospecção ativa"].map(
                  (o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
          <Campo label="Data do cadastro" id="cadastro" type="date" />
          <div className="sm:col-span-2">
            <Label htmlFor="obs" className="mb-1.5 block">
              Observações
            </Label>
            <Textarea
              id="obs"
              rows={4}
              placeholder="Preferências de contato, restrições alimentares, histórico…"
              className="bg-surface border-0 ring-1 ring-black/5"
            />
          </div>
        </div>
      </Panel>

      <div className="flex justify-end gap-2">
        <Button variant="outline" asChild>
          <Link to="/admin/clientes">Cancelar</Link>
        </Button>
        <Button onClick={salvar}>Salvar cliente</Button>
      </div>
    </div>
  );
}
