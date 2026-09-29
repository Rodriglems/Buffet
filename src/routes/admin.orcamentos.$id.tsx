import { createFileRoute, notFound } from "@tanstack/react-router";
import { toast } from "sonner";

import { PageHeader, Panel, PanelHeader } from "@/components/panel";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  clienteById,
  empresa,
  eventoById,
  orcamentoById,
  totalOrcamento,
  versoesNegociacao,
} from "@/data/mock";
import { formatBRL, formatDate } from "@/lib/format";

export const Route = createFileRoute("/admin/orcamentos/$id")({
  head: () => ({
    meta: [
      { title: "Orçamento — Mesa Buffet & Eventos" },
      {
        name: "description",
        content: "Visualize a proposta exatamente como o cliente a recebe e acompanhe a negociação.",
      },
      { property: "og:title", content: "Orçamento — Mesa Buffet & Eventos" },
      { property: "og:description", content: "Proposta comercial e histórico de versões." },
    ],
  }),
  component: DetalheOrcamento,
});

function DetalheOrcamento() {
  const { id } = Route.useParams();
  const orcamento = orcamentoById(id);
  if (!orcamento) throw notFound();

  const cliente = clienteById(orcamento.clienteId);
  const evento = eventoById(orcamento.eventoId);
  const { subtotal, desconto, total } = totalOrcamento(orcamento);
  const versoes = versoesNegociacao[orcamento.id] ?? [];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={`Orçamento ${orcamento.codigo}`}
        subtitle={`Versão ${orcamento.versao} · válido até ${formatDate(orcamento.validade)}`}
        actions={
          <>
            <StatusBadge status={orcamento.status} className="px-3 py-1.5" />
            <Button variant="outline" onClick={() => toast.success("Orçamento reenviado ao cliente.")}>
              Reenviar
            </Button>
            <Button onClick={() => toast.success("Contrato gerado a partir do orçamento.")}>
              Gerar contrato
            </Button>
          </>
        }
      />

      <Tabs defaultValue="proposta">
        <TabsList>
          <TabsTrigger value="proposta">Visualização do cliente</TabsTrigger>
          <TabsTrigger value="negociacao">Negociação</TabsTrigger>
        </TabsList>

        <TabsContent value="proposta" className="mt-4">
          <Panel className="p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-6 border-b border-border pb-6">
              <div className="flex items-center gap-3">
                <div className="bg-brand text-primary-foreground grid size-11 place-items-center rounded-xl">
                  <span className="font-display text-lg font-semibold">M</span>
                </div>
                <div>
                  <p className="font-display text-sm font-semibold">{empresa.nome}</p>
                  <p className="text-muted-foreground text-[11px]">CNPJ {empresa.cnpj}</p>
                  <p className="text-muted-foreground text-[11px]">
                    {empresa.telefone} · {empresa.email}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-display text-sm font-semibold">Proposta {orcamento.codigo}</p>
                <p className="text-muted-foreground text-[11px]">Emitida em {formatDate(orcamento.data)}</p>
                <p className="text-muted-foreground text-[11px]">Válida até {formatDate(orcamento.validade)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 py-6 sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground text-[11px] tracking-wide uppercase">Cliente</p>
                <p className="mt-1 text-sm font-medium">{cliente?.nome}</p>
                <p className="text-muted-foreground text-xs">{cliente?.documento}</p>
                <p className="text-muted-foreground text-xs">{cliente?.email}</p>
                <p className="text-muted-foreground text-xs">{cliente?.telefone}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[11px] tracking-wide uppercase">Evento</p>
                <p className="mt-1 text-sm font-medium">{evento?.nome}</p>
                <p className="text-muted-foreground text-xs">
                  {evento && `${formatDate(evento.data)} · ${evento.horaInicio} às ${evento.horaFim}`}
                </p>
                <p className="text-muted-foreground text-xs">{evento?.local}</p>
                <p className="text-muted-foreground text-xs">{evento?.convidados} convidados</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b border-border text-[11px] uppercase">
                    <th className="pb-2 font-medium">Serviço</th>
                    <th className="pb-2 font-medium">Qtd.</th>
                    <th className="pb-2 font-medium">Unidade</th>
                    <th className="pb-2 font-medium">Valor unit.</th>
                    <th className="pb-2 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orcamento.itens.map((i) => (
                    <tr key={i.id}>
                      <td className="py-3 pr-3">
                        <p className="font-medium">{i.servico}</p>
                        <p className="text-muted-foreground text-[11px]">{i.descricao}</p>
                      </td>
                      <td className="text-muted-foreground py-3 pr-3">{i.quantidade}</td>
                      <td className="text-muted-foreground py-3 pr-3">{i.unidade}</td>
                      <td className="text-muted-foreground py-3 pr-3">{formatBRL(i.valorUnitario)}</td>
                      <td className="py-3 text-right font-medium">
                        {formatBRL(i.quantidade * i.valorUnitario - i.desconto)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-end">
              <div className="w-full max-w-xs text-sm">
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatBRL(subtotal)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Desconto</span>
                  <span className="text-destructive">− {formatBRL(desconto)}</span>
                </div>
                <div className="mt-2 flex justify-between border-t border-border pt-3">
                  <span className="font-display font-semibold">Valor total</span>
                  <span className="font-display text-lg font-semibold">{formatBRL(total)}</span>
                </div>
              </div>
            </div>

            {(orcamento.observacoes || orcamento.condicoes) && (
              <div className="mt-6 grid grid-cols-1 gap-4 border-t border-border pt-6 sm:grid-cols-2">
                {orcamento.observacoes && (
                  <div>
                    <p className="text-muted-foreground text-[11px] tracking-wide uppercase">Observações</p>
                    <p className="mt-1 text-xs text-pretty">{orcamento.observacoes}</p>
                  </div>
                )}
                {orcamento.condicoes && (
                  <div>
                    <p className="text-muted-foreground text-[11px] tracking-wide uppercase">
                      Condições comerciais
                    </p>
                    <p className="mt-1 text-xs text-pretty">{orcamento.condicoes}</p>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-border pt-6">
              <Button variant="outline" onClick={() => toast("Solicitação de alteração registrada.")}>
                Solicitar alteração
              </Button>
              <Button variant="outline" onClick={() => toast.error("Orçamento rejeitado.")}>
                Rejeitar
              </Button>
              <Button onClick={() => toast.success("Orçamento aprovado.")}>Aprovar orçamento</Button>
            </div>
          </Panel>
        </TabsContent>

        <TabsContent value="negociacao" className="mt-4">
          <Panel className="p-5">
            <PanelHeader title="Histórico de versões" subtitle="Alterações desde a proposta inicial" />
            {versoes.length === 0 ? (
              <EmptyState title="Sem versões anteriores" description="Esta proposta ainda está na versão inicial." />
            ) : (
              <ol className="mt-4 flex flex-col">
                {versoes.map((v, i) => (
                  <li key={v.versao} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <span className="bg-brand/12 text-brand font-display grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold">
                        v{v.versao}
                      </span>
                      {i < versoes.length - 1 && <span className="w-px flex-1 bg-border" />}
                    </div>
                    <div className="pb-6">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">{formatBRL(v.valor)}</p>
                        <StatusBadge status={v.status} />
                      </div>
                      <p className="text-muted-foreground mt-1 text-xs text-pretty">{v.alteracoes}</p>
                      <p className="text-muted-foreground mt-1 text-[11px]">
                        {v.responsavel} · {formatDate(v.data)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}
