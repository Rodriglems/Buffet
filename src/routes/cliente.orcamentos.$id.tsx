import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, CheckCircle2, Loader2, MessageCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import {
  aguardaAprovacaoDoCliente,
  formatarMomento,
  mensagemAvisarAprovacao,
  mensagemPedirAlteracao,
} from "@/features/orcamentos/aprovacao-cliente";
import { ResumoPedido } from "@/features/orcamentos/resumo-pedido";
import { aprovarOrcamento, obterOrcamento } from "@/features/orcamentos/server-functions";
import { useConfirmar } from "@/lib/confirmacao";
import { formatBRL, formatDate } from "@/lib/format";
import { pageMeta } from "@/lib/meta";
import { createWhatsAppUrl } from "@/lib/sharing";

export const Route = createFileRoute("/cliente/orcamentos/$id")({
  head: () => pageMeta("Meu pedido", "Resumo do pedido de orçamento com os itens escolhidos."),
  loader: ({ params }) => obterOrcamento({ data: { id: params.id } }),
  component: MeuPedido,
});

type Orcamento = Awaited<ReturnType<typeof obterOrcamento>>;

function MeuPedido() {
  const orcamento = Route.useLoaderData();
  return (
    <div className="flex flex-col gap-4 pb-2">
      <PageHeader
        title="Meu pedido"
        subtitle={`Orçamento #${orcamento.numero.toString()}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to="/cliente/orcamentos">
                <ArrowLeft className="size-4" /> Voltar
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/orcamento" search={{ refazer: orcamento.id }}>
                <RotateCcw className="size-4" /> Refazer pedido
              </Link>
            </Button>
          </div>
        }
      />
      <Panel className="p-5 sm:p-6">
        <ResumoPedido orcamento={orcamento} />
      </Panel>
      <BarraDeDecisao orcamento={orcamento} />
    </div>
  );
}

/** Link do WhatsApp do buffet com a mensagem pronta; nulo sem número válido. */
function linkWhatsAppDoBuffet(orcamento: Orcamento, mensagem: string): string | null {
  const whatsapp = orcamento.empresa.whatsapp;
  if (!whatsapp) return null;
  try {
    return createWhatsAppUrl(whatsapp, mensagem);
  } catch {
    return null;
  }
}

/**
 * Barra fixa no rodapé, onde o cliente decide vendo o que está aprovando: total, "Pedir
 * alteração" (WhatsApp do buffet com o orçamento identificado) e "Aprovar orçamento".
 */
function BarraDeDecisao({ orcamento }: { orcamento: Orcamento }) {
  const router = useRouter();
  const aprovar = useServerFn(aprovarOrcamento);
  const pedirConfirmacao = useConfirmar();
  const [aprovando, setAprovando] = useState(false);
  const aguarda = aguardaAprovacaoDoCliente(orcamento);
  const aprovado = orcamento.status === "APROVADO";
  const total = Number(orcamento.total);
  const dados = {
    numero: orcamento.numero.toString(),
    tipoEvento: orcamento.evento.tipo,
    data: formatDate(orcamento.evento.dataEvento),
  };
  // Antes da aprovação o WhatsApp serve para pedir alteração; depois, para avisar e pagar.
  const linkAlteracao = linkWhatsAppDoBuffet(
    orcamento,
    aprovado ? mensagemAvisarAprovacao({ ...dados, total }) : mensagemPedirAlteracao(dados),
  );

  // Antes do envio a equipe ainda está montando o orçamento: não há o que decidir.
  if (!aguarda && !aprovado) return null;

  async function confirmarAprovacao() {
    const ok = await pedirConfirmacao({
      titulo: `Aprovar o orçamento de ${formatBRL(total)}?`,
      descricao: `${orcamento.evento.tipo} em ${formatDate(orcamento.evento.dataEvento)}. A equipe recebe o aviso e entra em contato para combinar o pagamento.`,
      textoConfirmar: "Aprovar orçamento",
    });
    if (!ok) return;
    setAprovando(true);
    try {
      await aprovar({ data: { id: orcamento.id } });
      toast.success("Orçamento aprovado! A equipe vai entrar em contato.");
      await router.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível aprovar.");
    } finally {
      setAprovando(false);
    }
  }

  return (
    <div className="panel sticky bottom-3 z-10 grid gap-3 p-3 shadow-xl sm:flex sm:items-center sm:justify-between sm:p-4">
      {aprovado ? (
        <p className="flex items-start gap-2 text-sm">
          <CheckCircle2 className="text-success mt-0.5 size-5 shrink-0" aria-hidden />
          <span>
            <span className="block font-semibold">
              Orçamento aprovado
              {orcamento.aprovadoEm ? ` em ${formatarMomento(orcamento.aprovadoEm)}` : ""}
            </span>
            <span className="text-muted-foreground block">
              Avise o buffet para combinar o pagamento.
            </span>
          </span>
        </p>
      ) : (
        <div className="flex items-baseline justify-between gap-3 sm:block">
          <p className="text-muted-foreground text-xs">Total do orçamento</p>
          <p className="font-display text-xl font-semibold tabular-nums">{formatBRL(total)}</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
        {linkAlteracao ? (
          <Button
            variant={aprovado ? "default" : "outline"}
            asChild
            className={aprovado ? "col-span-2 max-sm:h-11" : "max-sm:h-11"}
          >
            <a href={linkAlteracao} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="size-4" />
              {aprovado ? "Avisar o buffet no WhatsApp" : "Pedir alteração"}
            </a>
          </Button>
        ) : null}
        {aguarda ? (
          <Button
            className={linkAlteracao ? "max-sm:h-11" : "col-span-2 max-sm:h-11"}
            disabled={aprovando}
            onClick={() => void confirmarAprovacao()}
          >
            {aprovando ? <Loader2 className="size-4 animate-spin" /> : null}
            Aprovar orçamento
          </Button>
        ) : null}
      </div>
    </div>
  );
}
