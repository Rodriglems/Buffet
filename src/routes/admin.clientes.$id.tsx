import { createFileRoute, Link, notFound } from "@tanstack/react-router";

import { PageHeader, Panel, PanelHeader } from "@/components/panel";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/states";
import { Timeline } from "@/components/timeline";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  atividadesDoCliente,
  clienteById,
  contratos,
  eventos,
  nomeEvento,
  orcamentos,
  parcelas,
  totalOrcamento,
} from "@/data/mock";
import { formatBRL, formatDate } from "@/lib/format";

export const Route = createFileRoute("/admin/clientes/$id")({
  head: () => ({
    meta: [
      { title: "Perfil do cliente — Mesa Buffet & Eventos" },
      {
        name: "description",
        content: "Histórico completo do cliente: eventos, orçamentos, contratos e pagamentos.",
      },
      { property: "og:title", content: "Perfil do cliente — Mesa Buffet & Eventos" },
      { property: "og:description", content: "Ficha detalhada do cliente do buffet." },
    ],
  }),
  component: DetalheCliente,
});

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-[11px]">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

function DetalheCliente() {
  const { id } = Route.useParams();
  const cliente = clienteById(id);
  if (!cliente) throw notFound();

  const meusEventos = eventos.filter((e) => e.clienteId === id);
  const meusOrcamentos = orcamentos.filter((o) => o.clienteId === id);
  const meusContratos = contratos.filter((c) => c.clienteId === id);
  const minhasParcelas = parcelas.filter((p) => p.clienteId === id);
  const minhasAtividades = atividadesDoCliente(id);

  const endereco = `${cliente.endereco.rua}, ${cliente.endereco.numero}${
    cliente.endereco.complemento ? ` — ${cliente.endereco.complemento}` : ""
  } · ${cliente.endereco.bairro}, ${cliente.endereco.cidade}/${cliente.endereco.estado}`;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={cliente.nome}
        subtitle={`${cliente.documento} · cliente desde ${formatDate(cliente.cadastro)}`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/admin/orcamentos/novo">Criar orçamento</Link>
            </Button>
            <Button asChild>
              <Link to="/admin/eventos/novo">Criar evento</Link>
            </Button>
          </>
        }
      />

      <Panel className="p-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
          <Info label="Telefone" value={cliente.telefone} />
          <Info label="WhatsApp" value={cliente.whatsapp} />
          <Info label="E-mail" value={cliente.email} />
          <Info label="Origem" value={cliente.origem} />
          <div>
            <p className="text-muted-foreground text-[11px]">Status</p>
            <StatusBadge status={cliente.status} className="mt-0.5" />
          </div>
        </div>
      </Panel>

      <Tabs defaultValue="visao">
        <TabsList className="flex-wrap">
          <TabsTrigger value="visao">Visão geral</TabsTrigger>
          <TabsTrigger value="eventos">Eventos</TabsTrigger>
          <TabsTrigger value="orcamentos">Orçamentos</TabsTrigger>
          <TabsTrigger value="contratos">Contratos</TabsTrigger>
          <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
          <TabsTrigger value="atividades">Atividades</TabsTrigger>
        </TabsList>

        <TabsContent value="visao" className="mt-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Panel className="p-5">
              <PanelHeader title="Resumo" />
              <div className="mt-4 grid grid-cols-2 gap-4">
                <Info label="Eventos realizados" value={String(cliente.qtdEventos)} />
                <Info label="Último evento" value={formatDate(cliente.ultimoEvento)} />
                <Info label="Nascimento / abertura" value={formatDate(cliente.nascimento)} />
                <Info label="CEP" value={cliente.endereco.cep} />
                <div className="col-span-2">
                  <Info label="Endereço" value={endereco} />
                </div>
              </div>
            </Panel>
            <Panel className="p-5">
              <PanelHeader title="Observações" />
              <p className="text-muted-foreground mt-3 text-sm text-pretty">
                {cliente.observacoes || "Nenhuma observação registrada."}
              </p>
            </Panel>
          </div>
        </TabsContent>

        <TabsContent value="eventos" className="mt-4">
          <Panel className="p-5">
            {meusEventos.length === 0 ? (
              <EmptyState title="Nenhum evento" description="Este cliente ainda não possui eventos." />
            ) : (
              <ul className="divide-y divide-border">
                {meusEventos.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div>
                      <Link to="/admin/eventos/$id" params={{ id: e.id }} className="text-sm font-medium hover:underline">
                        {e.nome}
                      </Link>
                      <p className="text-muted-foreground text-[11px]">
                        {formatDate(e.data)} · {e.local} · {e.convidados} convidados
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">{formatBRL(e.valor)}</span>
                      <StatusBadge status={e.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="orcamentos" className="mt-4">
          <Panel className="p-5">
            {meusOrcamentos.length === 0 ? (
              <EmptyState title="Nenhum orçamento" />
            ) : (
              <ul className="divide-y divide-border">
                {meusOrcamentos.map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div>
                      <Link to="/admin/orcamentos/$id" params={{ id: o.id }} className="text-sm font-medium hover:underline">
                        {o.codigo} · v{o.versao}
                      </Link>
                      <p className="text-muted-foreground text-[11px]">
                        {nomeEvento(o.eventoId)} · válido até {formatDate(o.validade)}
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

        <TabsContent value="contratos" className="mt-4">
          <Panel className="p-5">
            {meusContratos.length === 0 ? (
              <EmptyState title="Nenhum contrato" />
            ) : (
              <ul className="divide-y divide-border">
                {meusContratos.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div>
                      <Link to="/admin/contratos/$id" params={{ id: c.id }} className="text-sm font-medium hover:underline">
                        {c.codigo}
                      </Link>
                      <p className="text-muted-foreground text-[11px]">
                        {nomeEvento(c.eventoId)} · emitido em {formatDate(c.data)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">{formatBRL(c.valor)}</span>
                      <StatusBadge status={c.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="pagamentos" className="mt-4">
          <Panel className="p-5">
            {minhasParcelas.length === 0 ? (
              <EmptyState title="Nenhum pagamento" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead>
                    <tr className="text-muted-foreground border-b border-border text-[11px] uppercase">
                      <th className="pb-2 font-medium">Evento</th>
                      <th className="pb-2 font-medium">Parcela</th>
                      <th className="pb-2 font-medium">Vencimento</th>
                      <th className="pb-2 font-medium">Valor</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {minhasParcelas.map((p) => (
                      <tr key={p.id}>
                        <td className="py-3 pr-3">{nomeEvento(p.eventoId)}</td>
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

        <TabsContent value="atividades" className="mt-4">
          <Panel className="p-5">
            {minhasAtividades.length === 0 ? (
              <EmptyState title="Sem atividades registradas" />
            ) : (
              <Timeline
                items={minhasAtividades.map((a) => ({
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
