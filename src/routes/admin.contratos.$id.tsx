import { createFileRoute, notFound } from "@tanstack/react-router";
import { toast } from "sonner";

import { PageHeader, Panel } from "@/components/panel";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { clienteById, contratoById, empresa, eventoById, orcamentos, totalOrcamento } from "@/data/mock";
import { formatBRL, formatDate } from "@/lib/format";

export const Route = createFileRoute("/admin/contratos/$id")({
  head: () => ({
    meta: [
      { title: "Contrato digital — Mesa Buffet & Eventos" },
      { name: "description", content: "Contrato digital do evento com termos, valores e área de assinatura." },
      { property: "og:title", content: "Contrato digital — Mesa Buffet & Eventos" },
      { property: "og:description", content: "Termos contratuais e assinatura eletrônica." },
    ],
  }),
  component: DetalheContrato,
});

function DetalheContrato() {
  const { id } = Route.useParams();
  const contrato = contratoById(id);
  if (!contrato) throw notFound();

  const cliente = clienteById(contrato.clienteId);
  const evento = eventoById(contrato.eventoId);
  const orcamento = orcamentos.find((o) => o.eventoId === contrato.eventoId);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={`Contrato ${contrato.codigo}`}
        subtitle={`${cliente?.nome} · emitido em ${formatDate(contrato.data)}`}
        actions={
          <>
            <StatusBadge status={contrato.status} className="px-3 py-1.5" />
            <Button variant="outline" onClick={() => toast.success("Contrato enviado para assinatura.")}>
              Enviar para assinatura
            </Button>
            <Button onClick={() => toast.success("Download iniciado.")}>Baixar contrato</Button>
          </>
        }
      />

      <Panel className="p-6 sm:p-8">
        <div className="grid grid-cols-1 gap-6 border-b border-border pb-6 sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground text-[11px] tracking-wide uppercase">Contratada</p>
            <p className="mt-1 text-sm font-medium">{empresa.nome}</p>
            <p className="text-muted-foreground text-xs">CNPJ {empresa.cnpj}</p>
            <p className="text-muted-foreground text-xs">{empresa.endereco}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-[11px] tracking-wide uppercase">Contratante</p>
            <p className="mt-1 text-sm font-medium">{cliente?.nome}</p>
            <p className="text-muted-foreground text-xs">{cliente?.documento}</p>
            <p className="text-muted-foreground text-xs">{cliente?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 py-6 sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground text-[11px] tracking-wide uppercase">Evento</p>
            <p className="mt-1 text-sm font-medium">{evento?.nome}</p>
            <p className="text-muted-foreground text-xs">
              {evento && `${formatDate(evento.data)} · ${evento.horaInicio} às ${evento.horaFim}`}
            </p>
            <p className="text-muted-foreground text-xs">{evento?.local}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-[11px] tracking-wide uppercase">Valor contratado</p>
            <p className="font-display mt-1 text-xl font-semibold">{formatBRL(contrato.valor)}</p>
          </div>
        </div>

        {orcamento && (
          <div className="border-t border-border py-6">
            <p className="text-muted-foreground text-[11px] tracking-wide uppercase">Serviços contratados</p>
            <ul className="mt-2 flex flex-col gap-2">
              {orcamento.itens.map((i) => (
                <li key={i.id} className="flex justify-between gap-4 text-sm">
                  <span>
                    {i.servico}
                    <span className="text-muted-foreground"> · {i.quantidade} {i.unidade}</span>
                  </span>
                  <span className="font-medium">{formatBRL(i.quantidade * i.valorUnitario)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-right text-sm">
              <span className="text-muted-foreground">Total da proposta: </span>
              <span className="font-medium">{formatBRL(totalOrcamento(orcamento).total)}</span>
            </p>
          </div>
        )}

        <div className="border-t border-border py-6">
          <p className="text-muted-foreground text-[11px] tracking-wide uppercase">Termos contratuais</p>
          <p className="text-muted-foreground mt-2 text-xs text-pretty">
            O presente contrato tem por objeto a prestação de serviços de buffet para o evento descrito
            acima. O cancelamento com menos de 30 dias de antecedência implica retenção de 40% do valor.
            Alterações no número de convidados devem ser comunicadas com 10 dias de antecedência.
            {orcamento?.condicoes ? ` Condições de pagamento: ${orcamento.condicoes}` : ""}
          </p>
        </div>

        <div className="border-t border-border pt-6">
          <p className="text-muted-foreground text-[11px] tracking-wide uppercase">Assinatura</p>
          {contrato.status === "Assinado" ? (
            <div className="bg-success/10 text-success mt-2 rounded-xl p-4 text-sm">
              Contrato assinado em {formatDate(contrato.assinadoEm!)} às {contrato.assinadoHora}.
            </div>
          ) : (
            <div className="bg-surface mt-2 rounded-xl p-6 text-center ring-1 ring-black/5">
              <p className="text-muted-foreground text-xs">
                Aguardando assinatura eletrônica do contratante.
              </p>
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
