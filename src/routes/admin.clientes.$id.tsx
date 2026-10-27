import { useState } from "react";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { PageHeader, Panel } from "@/components/panel";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { ClienteForm, type ClienteFormValues } from "@/features/clientes/cliente-form";
import {
  atualizarCliente,
  excluirCliente,
  obterCliente,
} from "@/features/clientes/server-functions";
import { listarOrcamentos } from "@/features/orcamentos/server-functions";
import { listarPagamentos } from "@/features/pagamentos/server-functions";
import { useConfirmar } from "@/lib/confirmacao";
import { formatBRL, formatDate } from "@/lib/format";

export const Route = createFileRoute("/admin/clientes/$id")({
  loader: async ({ params }) => {
    const [cliente, orcamentos, pagamentos] = await Promise.all([
      obterCliente({ data: { id: params.id } }),
      listarOrcamentos({ data: { page: 1, pageSize: 100, clienteId: params.id } }),
      listarPagamentos({ data: { page: 1, pageSize: 100, clienteId: params.id } }),
    ]);
    return { cliente, orcamentos: orcamentos.items, pagamentos: pagamentos.items };
  },
  component: DetalheCliente,
});

function valoresDoCliente(cliente: {
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
}): ClienteFormValues {
  return {
    nome: cliente.nome,
    tipoPessoa: cliente.tipoPessoa,
    cpfCnpj: cliente.cpfCnpj ?? "",
    email: cliente.email ?? "",
    telefone: cliente.telefone ?? "",
    whatsapp: cliente.whatsapp ?? "",
    cep: cliente.cep ?? "",
    estado: cliente.estado?.trim() ?? "",
    cidade: cliente.cidade ?? "",
    bairro: cliente.bairro ?? "",
    logradouro: cliente.logradouro ?? "",
    numero: cliente.numero ?? "",
    complemento: cliente.complemento ?? "",
    observacoes: cliente.observacoes ?? "",
  };
}

function DetalheCliente() {
  const { cliente, orcamentos, pagamentos } = Route.useLoaderData();
  const navigate = useNavigate();
  const router = useRouter();
  const atualizar = useServerFn(atualizarCliente);
  const excluir = useServerFn(excluirCliente);
  const [salvando, setSalvando] = useState(false);
  const confirmar = useConfirmar();

  async function remover() {
    const ok = await confirmar({
      titulo: `Excluir o cliente ${cliente.nome}?`,
      descricao: "Essa ação não pode ser desfeita.",
      textoConfirmar: "Excluir cliente",
      perigoso: true,
    });
    if (!ok) return;
    try {
      await excluir({ data: { id: cliente.id } });
      toast.success("Cliente excluído.");
      await navigate({ to: "/admin/clientes" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível excluir o cliente.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={cliente.nome}
        subtitle={`${cliente.cpfCnpj ?? "Sem documento"} · cliente desde ${formatDate(cliente.createdAt)}`}
        actions={
          <>
            <Button variant="outline" onClick={() => void remover()}>
              Excluir
            </Button>
            <Button asChild>
              <Link to="/admin/eventos/novo">Criar evento</Link>
            </Button>
          </>
        }
      />
      <ClienteForm
        key={cliente.updatedAt}
        valores={valoresDoCliente(cliente)}
        salvando={salvando}
        textoSalvar="Salvar alterações"
        cancelarPara="/admin/clientes"
        onSalvar={async (dados) => {
          setSalvando(true);
          try {
            await atualizar({ data: { id: cliente.id, dados } });
            toast.success("Cliente atualizado.");
            await router.invalidate();
          } catch (error) {
            toast.error(
              error instanceof Error ? error.message : "Não foi possível salvar o cliente.",
            );
          } finally {
            setSalvando(false);
          }
        }}
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel className="p-5">
          <h2 className="font-display font-semibold">Eventos</h2>
          <ul className="mt-3 divide-y divide-border">
            {cliente.eventos.map((evento) => (
              <li key={evento.id} className="flex justify-between py-3">
                <Link to="/admin/eventos/$id" params={{ id: evento.id }}>
                  {evento.nome}
                </Link>
                <StatusBadge status={evento.status} />
              </li>
            ))}
          </ul>
        </Panel>
        <Panel className="p-5">
          <h2 className="font-display font-semibold">Orçamentos</h2>
          <p className="text-muted-foreground mt-1 text-sm">{orcamentos.length} orçamento(s)</p>
          {orcamentos.length ? (
            <ul className="mt-3 divide-y divide-border">
              {orcamentos.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0">
                    <Link
                      to="/admin/orcamentos/$id"
                      params={{ id: item.id }}
                      className="font-medium hover:underline"
                    >
                      Orçamento #{item.numero.toString()}
                      {item.versao > 1 ? ` · versão ${item.versao}` : ""}
                    </Link>
                    <p className="text-muted-foreground truncate text-xs">{item.evento.nome}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-medium">{formatBRL(Number(item.total))}</span>
                    <StatusBadge status={item.status} />
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </Panel>
      </div>
      {pagamentos.length ? (
        <Panel className="p-5">
          <h2 className="font-display font-semibold">Parcelas</h2>
          <ul className="mt-3 divide-y divide-border">
            {pagamentos.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">
                    Parcela {item.numeroParcela} · vence {formatDate(item.dataVencimento)}
                  </p>
                  <p className="text-muted-foreground truncate text-xs">{item.evento.nome}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-medium">{formatBRL(Number(item.valor))}</span>
                  <StatusBadge status={item.status} />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
      {cliente.observacoes && (
        <Panel className="p-5">
          <h2 className="font-display font-semibold">Observações</h2>
          <p className="text-muted-foreground mt-2 text-sm">{cliente.observacoes}</p>
        </Panel>
      )}
    </div>
  );
}
