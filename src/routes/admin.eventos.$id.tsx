import { createFileRoute, Link, notFound } from "@tanstack/react-router";

import { PageHeader, Panel, PanelHeader, StatCard } from "@/components/panel";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/states";
import { Timeline } from "@/components/timeline";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  atividadesDoEvento,
  contratos,
  custosDoEvento,
  eventoById,
  nomeCliente,
  orcamentos,
  parcelasDoEvento,
  totalCustosEvento,
  totalOrcamento,
} from "@/data/mock";
import { formatBRL, formatDate, formatPercent } from "@/lib/format";

export const Route = createFileRoute("/admin/eventos/$id")({
  head: () => ({
    meta: [
      { title: "Detalhes do evento — Mesa Buffet & Eventos" },
      {
        name: "description",
        content: "Acompanhe orçamentos, contrato, pagamentos, custos e resultado financeiro do evento.",
      },
      { property: "og:title", content: "Detalhes do evento — Mesa Buffet & Eventos" },
      { property: "og:description", content: "Painel completo de acompanhamento do evento." },
    ],
  }),
  component: DetalheEvento,
});

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-[11px]">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

function DetalheEvento() {
  const { id } = Route.useParams();
  const evento = eventoById(id);
  if (!evento) throw notFound();

  const meusOrcamentos = orcamentos.filter((o) => o.eventoId === id);
  const contrato = contratos.find((c) => c.eventoId === id);
  const minhasParcelas = parcelasDoEvento(id);
  const meusCustos = custosDoEvento(id);
  const totalCustos = totalCustosEvento(id);
  const lucro = evento.valor - totalCustos;
  const margem = evento.valor > 0 ? (lucro / evento.valor) * 100 : 0;
  const pago = minhasParcelas.filter((p) => p.status === "Pago").reduce((a, p) => a + p.valor, 0);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={evento.nome}
        subtitle={`${nomeCliente(evento.clienteId)} · ${formatDate(evento.data)} · ${evento.local}`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/admin/orcamentos/novo">Novo orçamento</Link>
            </Button>
            <Button asChild>
              <Link to="/admin/agenda">Ver na agenda</Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Valor total" value={formatBRL(evento.valor)} hint={`${evento.convidados} convidados`} />
        <StatCard label="Recebido" value={formatBRL(pago)} hint={`${minhasParcelas.length} parcelas`} />
        <StatCard label="Custos" value={formatBRL(totalCustos)} badgeTone="warning" hint="lançados até agora" />
        <StatCard label="Lucro previsto" value={formatBRL(lucro)} badge={formatPercent(margem)} hint="margem do evento" />
      </div>

      <Panel className="p-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
          <Info label="Tipo" value={evento.tipo} />
          <Info label="Horário" value={`${evento.horaInicio} às ${evento.horaFim}`} />
          <Info label="Endereço" value={evento.endereco} />
          <Info label="Convidados" value={String(evento.convidados)} />
          <div>
            <p className="text-muted-foreground text-[11px]">Status</p>
            <StatusBadge status={evento.status} className="mt-0.5" />
          </div>
        </div>
      </Panel>

      <Tabs defaultValue="visao">
        <TabsList className="flex-wrap">
          <TabsTrigger value="visao">Visão geral</TabsTrigger>
          <TabsTrigger value="orcamentos">Orçamentos</TabsTrigger>
          <TabsTrigger value="contrato">Contrato</TabsTrigger>
          <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
          <TabsTrigger value="custos">Custos</TabsTrigger>
          <TabsTrigger value="resultado">Resultado</TabsTrigger>
          <TabsTrigger value="atividades">Atividades</TabsTrigger>
        </TabsList>

        <TabsContent value="visao" className="mt-4">
          <Panel className="p-5">
            <PanelHeader title="Resumo do evento" />
            <p className="text-muted-foreground mt-3 text-sm text-pretty">
              {evento.observacoes || "Nenhuma observação registrada para este evento."}
            </p>
          </Panel>
        </TabsContent>

        <TabsContent value="orcamentos" className="mt-4">
          <Panel className="p-5">
            {meusOrcamentos.length === 0 ? (
              <EmptyState title="Nenhum orçamento" description="Crie a primeira proposta para este evento." />
            ) : (
              <ul className="divide-y divide-border">
                {meusOrcamentos.map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div>
                      <Link to="/admin/orcamentos/$id" params={{ id: o.id }} className="text-sm font-medium hover:underline">
                        {o.codigo} · versão {o.versao}
                      </Link>
                      <p className="text-muted-foreground text-[11px]">
                        Emitido em {formatDate(o.data)} · válido até {formatDate(o.validade)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">{formatBRL(totalOrcamento(o).total)}</span>
                      <StatusBadge status={o.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="contrato" className="mt-4">
          <Panel className="p-5">
            {!contrato ? (
              <EmptyState title="Sem contrato" description="Gere o contrato após a aprovação do orçamento." />
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <Link to="/admin/contratos/$id" params={{ id: contrato.id }} className="text-sm font-medium hover:underline">
                    {contrato.codigo}
                  </Link>
                  <p className="text-muted-foreground text-[11px]">
                    Emitido em {formatDate(contrato.data)}
                    {contrato.assinadoEm &&
                      ` · assinado em ${formatDate(contrato.assinadoEm)} às ${contrato.assinadoHora}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{formatBRL(contrato.valor)}</span>
                  <StatusBadge status={contrato.status} />
                </div>
              </div>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="pagamentos" className="mt-4">
          <Panel className="p-5">
            {minhasParcelas.length === 0 ? (
              <EmptyState title="Nenhuma parcela lançada" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead>
                    <tr className="text-muted-foreground border-b border-border text-[11px] uppercase">
                      <th className="pb-2 font-medium">Parcela</th>
                      <th className="pb-2 font-medium">Vencimento</th>
                      <th className="pb-2 font-medium">Valor</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {minhasParcelas.map((p) => (
                      <tr key={p.id}>
                        <td className="py-3 pr-3">{p.parcela}</td>
                        <td className="text-muted-foreground py-3 pr-3">{formatDate(p.vencimento)}</td>
                        <td className="py-3 pr-3 font-medium">{formatBRL(p.valor)}</td>
                        <td className="py-3">
                          <StatusBadge status={p.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="custos" className="mt-4">
          <Panel className="p-5">
            {meusCustos.length === 0 ? (
              <EmptyState title="Nenhum custo lançado" />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] text-left text-sm">
                    <thead>
                      <tr className="text-muted-foreground border-b border-border text-[11px] uppercase">
                        <th className="pb-2 font-medium">Categoria</th>
                        <th className="pb-2 font-medium">Descrição</th>
                        <th className="pb-2 font-medium">Fornecedor</th>
                        <th className="pb-2 font-medium">Data</th>
                        <th className="pb-2 font-medium">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {meusCustos.map((c) => (
                        <tr key={c.id}>
                          <td className="py-3 pr-3">{c.categoria}</td>
                          <td className="text-muted-foreground py-3 pr-3">{c.descricao}</td>
                          <td className="text-muted-foreground py-3 pr-3">{c.fornecedor}</td>
                          <td className="text-muted-foreground py-3 pr-3">{formatDate(c.data)}</td>
                          <td className="py-3 font-medium">{formatBRL(c.valor)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-4 text-right text-sm">
                  <span className="text-muted-foreground">Total de custos: </span>
                  <span className="font-display font-semibold">{formatBRL(totalCustos)}</span>
                </p>
              </>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="resultado" className="mt-4">
          <Panel className="p-5">
            <PanelHeader title="Resultado financeiro" subtitle="Receita menos custos do evento" />
            <div className="mt-4 max-w-sm">
              <div className="flex items-center justify-between border-b border-border py-2 text-sm">
                <span className="text-muted-foreground">Receita</span>
                <span className="font-medium">{formatBRL(evento.valor)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-border py-2 text-sm">
                <span className="text-muted-foreground">Custos</span>
                <span className="text-destructive font-medium">− {formatBRL(totalCustos)}</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="font-display font-semibold">Lucro</span>
                <span className="font-display text-lg font-semibold">{formatBRL(lucro)}</span>
              </div>
              <p className="text-muted-foreground text-xs">
                Margem de lucro: <span className="text-foreground font-medium">{formatPercent(margem)}</span>
              </p>
            </div>
          </Panel>
        </TabsContent>

        <TabsContent value="atividades" className="mt-4">
          <Panel className="p-5">
            {atividadesDoEvento(id).length === 0 ? (
              <EmptyState title="Sem atividades registradas" />
            ) : (
              <Timeline
                items={atividadesDoEvento(id).map((a) => ({
                  id: a.id,
                  titulo: a.descricao,
                  meta: `${a.usuario} · ${formatDate(a.data)} às ${a.hora}`,
                  tone: a.tipo === "Pagamento" ? "success" : a.tipo === "Contrato" ? "brand" : "info",
                }))}
              />
            )}
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}
