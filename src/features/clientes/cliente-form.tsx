import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";

import { Panel, PanelHeader } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UF_VALUES } from "@/features/shared/validation/primitives";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ClienteFormValues = {
  nome: string;
  tipoPessoa: "FISICA" | "JURIDICA";
  cpfCnpj: string;
  email: string;
  telefone: string;
  whatsapp: string;
  cep: string;
  estado: string;
  cidade: string;
  bairro: string;
  logradouro: string;
  numero: string;
  complemento: string;
  observacoes: string;
};

const clienteFormVazio: ClienteFormValues = {
  nome: "",
  tipoPessoa: "FISICA",
  cpfCnpj: "",
  email: "",
  telefone: "",
  whatsapp: "",
  cep: "",
  estado: "",
  cidade: "",
  bairro: "",
  logradouro: "",
  numero: "",
  complemento: "",
  observacoes: "",
};

function Campo({
  label,
  id,
  placeholder,
  type = "text",
  className,
  required,
  defaultValue,
}: {
  label: string;
  id: string;
  placeholder?: string;
  type?: string;
  className?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={id} className="mb-1.5 block">
        {label}
      </Label>
      <Input
        id={id}
        name={id}
        type={type}
        required={required}
        minLength={required ? 2 : undefined}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="bg-surface border-0 ring-1 ring-black/5"
      />
    </div>
  );
}

export function ClienteForm({
  valores = clienteFormVazio,
  salvando,
  textoSalvar,
  cancelarPara,
  onSalvar,
}: {
  valores?: ClienteFormValues;
  salvando: boolean;
  textoSalvar: string;
  cancelarPara: "/admin/clientes";
  onSalvar: (dados: {
    nome: string;
    tipoPessoa: "FISICA" | "JURIDICA";
    cpfCnpj: string | null;
    email: string | null;
    telefone: string | null;
    whatsapp: string | null;
    cep: string | null;
    estado: string | null;
    cidade: string | null;
    bairro: string | null;
    logradouro: string | null;
    numero: string | null;
    complemento: string | null;
    observacoes: string | null;
  }) => Promise<void>;
}) {
  const [tipoPessoa, setTipoPessoa] = useState<"FISICA" | "JURIDICA">(valores.tipoPessoa);
  const [estado, setEstado] = useState(valores.estado);

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "").trim();
    const optional = (name: string) => text(name) || null;
    await onSalvar({
      nome: text("nome"),
      tipoPessoa,
      cpfCnpj: text("doc").replace(/\D/g, "") || null,
      email: optional("email"),
      telefone: text("tel").replace(/\D/g, "") || null,
      whatsapp: text("zap").replace(/\D/g, "") || null,
      cep: text("cep").replace(/\D/g, "") || null,
      estado: estado || null,
      cidade: optional("cidade"),
      bairro: optional("bairro"),
      logradouro: optional("rua"),
      numero: optional("num"),
      complemento: optional("compl"),
      observacoes: optional("obs"),
    });
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={salvar}>
      <Panel className="p-5">
        <PanelHeader title="Dados pessoais" subtitle="Pessoa física ou jurídica" />
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Campo
            label="Nome completo / Razão social"
            id="nome"
            placeholder="João da Silva"
            className="sm:col-span-2"
            required
            defaultValue={valores.nome}
          />
          <div>
            <Label className="mb-1.5 block">Tipo de pessoa</Label>
            <Select
              value={tipoPessoa}
              onValueChange={(value) => setTipoPessoa(value as "FISICA" | "JURIDICA")}
            >
              <SelectTrigger className="bg-surface w-full border-0 ring-1 ring-black/5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FISICA">Pessoa física</SelectItem>
                <SelectItem value="JURIDICA">Pessoa jurídica</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Campo
            label="CPF/CNPJ"
            id="doc"
            placeholder="000.000.000-00"
            defaultValue={valores.cpfCnpj}
          />
          <Campo
            label="E-mail"
            id="email"
            type="email"
            placeholder="cliente@email.com"
            defaultValue={valores.email}
          />
          <Campo
            label="Telefone"
            id="tel"
            placeholder="(11) 0000-0000"
            defaultValue={valores.telefone}
          />
          <Campo
            label="WhatsApp"
            id="zap"
            placeholder="(11) 90000-0000"
            defaultValue={valores.whatsapp}
          />
        </div>
      </Panel>

      <Panel className="p-5">
        <PanelHeader title="Endereço" />
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Campo label="CEP" id="cep" placeholder="00000-000" defaultValue={valores.cep} />
          <div>
            <Label className="mb-1.5 block">Estado</Label>
            <Select value={estado || undefined} onValueChange={setEstado}>
              <SelectTrigger className="bg-surface w-full border-0 ring-1 ring-black/5">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {UF_VALUES.map((uf) => (
                  <SelectItem key={uf} value={uf}>
                    {uf}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Campo label="Cidade" id="cidade" placeholder="São Paulo" defaultValue={valores.cidade} />
          <Campo label="Bairro" id="bairro" placeholder="Pinheiros" defaultValue={valores.bairro} />
          <Campo
            label="Rua"
            id="rua"
            placeholder="Rua das Oliveiras"
            className="sm:col-span-2"
            defaultValue={valores.logradouro}
          />
          <Campo label="Número" id="num" placeholder="340" defaultValue={valores.numero} />
          <Campo
            label="Complemento"
            id="compl"
            placeholder="Apto 84"
            defaultValue={valores.complemento}
          />
        </div>
      </Panel>

      <Panel className="p-5">
        <PanelHeader title="Observações" />
        <div className="mt-4">
          <Label htmlFor="obs" className="mb-1.5 block">
            Observações
          </Label>
          <Textarea
            id="obs"
            name="obs"
            rows={4}
            defaultValue={valores.observacoes}
            placeholder="Preferências de contato, restrições alimentares, histórico…"
            className="bg-surface border-0 ring-1 ring-black/5"
          />
        </div>
      </Panel>

      <div className="flex justify-end gap-2">
        <Button variant="outline" asChild>
          <Link to={cancelarPara}>Cancelar</Link>
        </Button>
        <Button type="submit" disabled={salvando}>
          {salvando ? "Salvando…" : textoSalvar}
        </Button>
      </div>
    </form>
  );
}
