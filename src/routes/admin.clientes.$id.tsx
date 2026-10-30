import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { PageHeader, Panel } from "@/components/panel";
import { StatusBadge } from "@/components/status-badge";
import { ClienteForm, type ClienteFormValues } from "@/features/clientes/cliente-form";
import { atualizarCliente, obterCliente } from "@/features/clientes/server-functions";
import { listarOrcamentos } from "@/features/orcamentos/server-functions";
import { listarPagamentos } from "@/features/pagamentos/server-functions";
import { formatBRL, formatDate } from "@/lib/format";
import { telefoneDe } from "@/lib/empresa-cabecalho";
import { rotuloStatus } from "@/lib/status-rotulos";

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
    telefone: telefoneDe(cliente.telefone) ?? "",
    whatsapp: telefoneDe(cliente.whatsapp) ?? "",
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
  const router = useRouter();
  const atualizar = useServerFn(atualizarCliente);
  const [salvando, setSalvando] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={cliente.nome}
        subtitle={`${cliente.cpfCnpj ?? "Sem documento"} · cliente desde ${formatDate(cliente.createdAt)}`}
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
      {/* Um card só: cada evento traz junto o orçamento mais recente dele. */}
      <Panel className="p-5">
        <h2 className="font-display font-semibold">Eventos</h2>
        <p className="text-muted-foreground mt-1 text-sm">{orcamentos.length} orçamento(s)</p>
        {cliente.eventos.length ? (
          <ul className="mt-3 divide-y divide-border">
            {cliente.eventos.map((evento) => {
              // A lista de orçamentos vem do mais novo para o mais antigo.
              const orcamento = orcamentos.find((item) => item.eventoId === evento.id);
              return (
                <li
                  key={evento.id}
                  className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <Link
                      to="/admin/eventos/$id"
                      params={{ id: evento.id }}
                      className="font-medium hover:underline"
                    >
                      {evento.nome}
                    </Link>
                    <p className="text-muted-foreground text-xs">
                      {evento.tipo} · {formatDate(evento.dataEvento)}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {orcamento ? (
                        <>
                          <Link
                            to="/admin/orcamentos/$id"
                            params={{ id: orcamento.id }}
                            className="hover:underline"
                          >
                            Orçamento #{orcamento.numero.toString()}
                            {orcamento.versao > 1 ? ` · versão ${orcamento.versao}` : ""}
                          </Link>{" "}
                          · {rotuloStatus(orcamento.status)}
                        </>
                      ) : (
                        "Sem orçamento"
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {orcamento ? (
                      <span className="font-medium">{formatBRL(Number(orcamento.total))}</span>
                    ) : null}
                    <StatusBadge status={evento.status} />
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-muted-foreground mt-3 text-sm">Nenhum evento cadastrado.</p>
        )}
      </Panel>
      {pagamentos.length ? (
        <Panel className="p-5">
          <h2 className="font-display font-semibold">Parcelas</h2>
          <ul className="mt-3 divide-y divide-border">
            {pagamentos.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-3 text-sm"
              >
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
