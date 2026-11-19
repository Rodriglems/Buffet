import { useState } from "react";
import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Check,
  ChevronDown,
  ExternalLink,
  FileText,
  Loader2,
  MessageCircle,
  MessageCircleMore,
  Pencil,
  Plus,
  Trash2,
  TriangleAlert,
  Undo2,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader, Panel, PanelHeader, StatCard } from "@/components/panel";
import { EmptyState } from "@/components/states";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  baixarPdfDoEvento,
  STATUS_COM_PDF,
  STATUS_COM_PDF_ORCAMENTO,
} from "@/features/documentos/eventos-pdf";
import { ConviteClienteDialog } from "@/features/clientes/convite-dialog";
import { gerarConviteCliente } from "@/features/clientes/convites";
import { AlterarStatusEvento } from "@/features/eventos/alterar-status-evento";
import { observacaoDoCliente } from "@/features/eventos/observacoes";
import { finalizarEvento, obterEvento } from "@/features/eventos/server-functions";
import { DescontoOrcamento } from "@/features/orcamentos/desconto-orcamento";
import { EditarOrcamentoDialog } from "@/features/orcamentos/editar-orcamento-dialog";
import { aprovarOrcamento, enviarOrcamento } from "@/features/orcamentos/server-functions";
import { mensagemEnvioOrcamento } from "@/features/orcamentos/mensagem-envio";
import { ehFrete, ehServico, ehValorAParte } from "@/features/orcamentos/unidade-item";
import { GerarParcelasDialog } from "@/features/pagamentos/gerar-parcelas-dialog";
import { diferencaParcelas, FORMAS_PAGAMENTO } from "@/features/pagamentos/parcelas";
import {
  alterarFormaPagamento,
  desfazerRecebimento,
  excluirPagamento,
  registrarPagamento,
} from "@/features/pagamentos/server-functions";
import {
  caminhoDoConvite,
  caminhoDoLoginDoOrcamento,
  VALIDADE_CONVITE_TEXTO,
} from "@/lib/acesso-cliente";
import { useConfirmar } from "@/lib/confirmacao";
import { formatBRL, formatDate, formatTimeRange } from "@/lib/format";
import { createWhatsAppChatUrl, createWhatsAppUrl } from "@/lib/sharing";
import { acaoDaEtapa, ETAPAS_EVENTO, rotuloStatusEvento } from "@/lib/status-evento";
import { SERVICOS_ADICIONAIS } from "@/lib/catalogo";
import { cn } from "@/lib/utils";
import { telefoneDe } from "@/lib/empresa-cabecalho";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/admin/eventos/$id")({
  // Endereço que não é de um evento volta para a lista.
  beforeLoad: ({ params }) => {
    if (!UUID.test(params.id)) throw redirect({ to: "/admin/eventos" });
  },
  loader: ({ params }) => obterEvento({ data: { id: params.id } }),
  component: DetalheEvento,
});

type EventoDetalhe = Awaited<ReturnType<typeof obterEvento>>;

function valorDoEvento(evento: EventoDetalhe) {
  const atual = evento.orcamentos[0];
  const aprovado = evento.orcamentos.find((item) => item.status === "APROVADO");
  return Number((aprovado ?? atual)?.total ?? 0);
}

function DetalheEvento() {
  const evento = Route.useLoaderData();
  const observacaoCliente = observacaoDoCliente(evento.observacoes);
  const orcamentoAtual = evento.orcamentos[0];
  const valorEvento = valorDoEvento(evento);
  const valoresDosItens = Boolean(orcamentoAtual?.enviadoEm);
  // O frete sai da lista de itens e aparece no resumo, junto do subtotal.
  const freteDoOrcamento = (orcamentoAtual?.itens ?? [])
    .filter((item) => ehFrete(item.unidade))
    .reduce((soma, item) => soma + Number(item.valorTotal), 0);
  const parcelas = evento.pagamentos.filter((item) => item.status !== "CANCELADO");
  // Pagamentos aparecem com o evento confirmado (confirmar = definir o pagamento) ou com parcelas.
  const mostrarPagamentos = evento.status === "CONFIRMADO" || parcelas.length > 0;
  const recebido = parcelas
    .filter((item) => item.status === "PAGO")
    .reduce((soma, item) => soma + Number(item.valor), 0);
  const [editando, setEditando] = useState(false);
  const [convidando, setConvidando] = useState(false);
  const [clienteAberto, setClienteAberto] = useState(false);
  const encerrado = ["CANCELADO", "FINALIZADO"].includes(evento.status);
  const botaoWhatsApp = evento.cliente.whatsapp ? (
    <Button
      variant="outline"
      className="shrink-0"
      onClick={() => {
        try {
          window.open(
            createWhatsAppUrl(
              evento.cliente.whatsapp!,
              `Olá ${evento.cliente.nome}, estamos entrando em contato sobre o seu evento em ${formatDate(evento.dataEvento)}.`,
            ),
            "_blank",
            "noopener,noreferrer",
          );
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "WhatsApp inválido.");
        }
      }}
    >
      <MessageCircle className="size-4" /> WhatsApp
    </Button>
  ) : null;

  return (
    // Espaço extra no fim para a barra fixa de etapas não cobrir o conteúdo.
    <div className="flex flex-col gap-4 pb-28">
      <PageHeader
        title={evento.nome}
        subtitle={`${evento.tipo} · ${formatDate(evento.dataEvento)}${
          evento.horaInicio ? ` · ${formatTimeRange(evento.horaInicio, evento.horaFim)}` : ""
        } · ${evento.localNome ?? "Local a definir"}`}
        actions={orcamentoAtual ? null : botaoWhatsApp}
      />
      <StatCard label="Valor do evento" value={formatBRL(valorEvento)} />
      <Panel className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display font-semibold">{evento.tipo}</p>
            <p className="text-muted-foreground text-sm">
              {evento.formatoServico ? `${evento.formatoServico} · ` : ""}
              {evento.quantidadeConvidados} convidados
            </p>
          </div>
          <AlterarStatusEvento eventoId={evento.id} status={evento.status} />
        </div>
      </Panel>
      <Panel className="p-5">
        <PanelHeader
          title="Orçamento do evento"
          subtitle={
            orcamentoAtual
              ? `Proposta #${orcamentoAtual.numero} · versão ${orcamentoAtual.versao}`
              : "Este evento ainda não possui orçamento"
          }
          action={
            orcamentoAtual &&
            !encerrado &&
            !["REJEITADO", "EXPIRADO", "CANCELADO"].includes(orcamentoAtual.status) ? (
              // No celular, só o ícone no canto, para não empurrar a lista de itens para baixo.
              <Button
                size="sm"
                variant="outline"
                aria-label="Editar orçamento"
                title="Editar orçamento"
                className="max-sm:size-11 max-sm:px-0"
                onClick={() => setEditando(true)}
              >
                <Pencil className="size-4" />
                <span className="hidden sm:inline">Editar orçamento</span>
              </Button>
            ) : null
          }
        />
        {orcamentoAtual ? (
          <>
            <div className="mt-4 overflow-x-auto">
              {/* Valores dos itens só depois que o orçamento é feito e enviado ao cliente;
                  antes disso são preços do cardápio, ainda não combinados. */}
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b border-border text-[11px] uppercase">
                    <th className="pb-2 font-medium">Item</th>
                    <th
                      className={cn(
                        "pb-2 font-medium",
                        valoresDosItens ? "max-sm:hidden" : "text-right",
                      )}
                    >
                      Quantidade
                    </th>
                    {valoresDosItens ? (
                      <>
                        <th className="pb-2 font-medium max-sm:hidden">Valor unitário</th>
                        <th className="pb-2 text-right font-medium">Total</th>
                      </>
                    ) : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orcamentoAtual.itens
                    .filter((item) => !ehValorAParte(item.unidade))
                    .map((item) =>
                      valoresDosItens ? (
                        <tr key={item.id}>
                          <td className="py-3 pr-3 font-medium">
                            {item.descricao}
                            <p className="text-muted-foreground text-xs font-normal sm:hidden">
                              {Number(item.quantidade)} {item.unidade} ×{" "}
                              {formatBRL(Number(item.valorUnitario))}
                            </p>
                          </td>
                          <td className="text-muted-foreground py-3 pr-3 max-sm:hidden">
                            {Number(item.quantidade)} {item.unidade}
                          </td>
                          <td className="text-muted-foreground py-3 pr-3 max-sm:hidden">
                            {formatBRL(Number(item.valorUnitario))}
                          </td>
                          <td className="py-3 text-right font-medium whitespace-nowrap">
                            {formatBRL(Number(item.valorTotal))}
                          </td>
                        </tr>
                      ) : (
                        <tr key={item.id}>
                          <td className="py-3 pr-3 font-medium">{item.descricao}</td>
                          <td className="text-muted-foreground py-3 text-right whitespace-nowrap">
                            {Number(item.quantidade)} {item.unidade}
                          </td>
                        </tr>
                      ),
                    )}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="w-full max-w-sm empty:hidden">
                {encerrado ? null : (
                  <DescontoOrcamento key={orcamentoAtual.id} orcamento={orcamentoAtual} />
                )}
              </div>
              <dl className="w-full max-w-xs text-sm sm:ml-auto">
                {orcamentoAtual.itens
                  .filter((item) => ehServico(item.unidade))
                  .map((item) => (
                    <div key={item.id} className="flex justify-between gap-3 py-1">
                      <dt className="text-muted-foreground">{item.descricao}</dt>
                      <dd className="whitespace-nowrap">{formatBRL(Number(item.valorTotal))}</dd>
                    </div>
                  ))}
                {freteDoOrcamento > 0 ? (
                  <div className="flex justify-between py-1">
                    <dt className="text-muted-foreground">Frete</dt>
                    <dd>{formatBRL(freteDoOrcamento)}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between py-1">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd>{formatBRL(Number(orcamentoAtual.subtotal))}</dd>
                </div>
                <div className="flex justify-between py-1">
                  <dt className="text-muted-foreground">
                    Desconto
                    {orcamentoAtual.tipoDesconto === "PERCENTUAL"
                      ? ` (${Number(orcamentoAtual.descontoValor)}%)`
                      : ""}
                  </dt>
                  <dd className="text-destructive">
                    − {formatBRL(Number(orcamentoAtual.desconto))}
                  </dd>
                </div>
                <div className="mt-1 flex justify-between border-t border-border pt-2 font-semibold">
                  <dt>Total</dt>
                  <dd>{formatBRL(Number(orcamentoAtual.total))}</dd>
                </div>
              </dl>
            </div>
            {observacaoCliente ? (
              <div className="bg-surface mt-4 rounded-xl p-4 ring-1 ring-black/5">
                <p className="text-muted-foreground text-[11px] uppercase">Observações</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{observacaoCliente}</p>
              </div>
            ) : null}
            {["REJEITADO", "EXPIRADO", "CANCELADO"].includes(orcamentoAtual.status) ? null : (
              <EnviarOrcamentoAoCliente evento={evento} orcamento={orcamentoAtual} />
            )}
            <EditarOrcamentoDialog
              key={orcamentoAtual.id}
              aberto={editando}
              onOpenChange={setEditando}
              orcamento={orcamentoAtual}
              convidados={evento.quantidadeConvidados}
              sugestoesServicos={SERVICOS_ADICIONAIS}
              servicosPedidos={evento.servicosAdicionais}
              valorEmParcelas={evento.pagamentos
                .filter((item) => item.status !== "CANCELADO")
                .reduce((soma, item) => soma + Number(item.valor), 0)}
            />
          </>
        ) : (
          <EmptyState
            title="Nenhum orçamento criado"
            description="Crie a primeira proposta diretamente a partir deste evento."
            action={
              <Button asChild>
                <Link to="/admin/orcamentos/novo" search={{ eventoId: evento.id }}>
                  Criar orçamento
                </Link>
              </Button>
            }
          />
        )}
      </Panel>
      {/* Recebido e A receber ficam junto dos pagamentos, que é de onde vêm. */}
      {mostrarPagamentos ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Recebido" value={formatBRL(recebido)} />
            <StatCard label="A receber" value={formatBRL(Math.max(0, valorEvento - recebido))} />
          </div>
          <PagamentosDoEvento evento={evento} valorEvento={valorEvento} />
        </>
      ) : null}
      <Panel className="p-5">
        <div className="flex items-start justify-between gap-3">
          {/* No celular o card começa recolhido (só o nome); tocar no título abre os dados. */}
          <button
            type="button"
            className="min-w-0 flex-1 text-left sm:cursor-default"
            aria-expanded={clienteAberto}
            aria-controls="dados-cliente-evento"
            onClick={() => setClienteAberto((aberto) => !aberto)}
          >
            <h2 className="font-display flex flex-wrap items-center gap-2 font-semibold">
              Cliente do evento
              <StatusBadge status={evento.cliente.acesso} dot={false} />
              <ChevronDown
                className={cn(
                  "text-muted-foreground size-4 transition-transform sm:hidden",
                  clienteAberto && "rotate-180",
                )}
                aria-hidden
              />
            </h2>
            {clienteAberto ? null : (
              <p className="text-muted-foreground truncate text-sm sm:hidden">
                {evento.cliente.nome}
              </p>
            )}
          </button>
          <Button size="icon" variant="outline" className="size-11 shrink-0 sm:size-9" asChild>
            <Link
              to="/admin/clientes/$id"
              params={{ id: evento.cliente.id }}
              aria-label={`Abrir cadastro de ${evento.cliente.nome}`}
              title="Abrir cadastro"
            >
              <ExternalLink className="size-4" />
            </Link>
          </Button>
        </div>
        <ConviteClienteDialog
          cliente={convidando ? evento.cliente : null}
          onFechar={() => setConvidando(false)}
        />
        <div id="dados-cliente-evento" className={cn(!clienteAberto && "max-sm:hidden")}>
          {evento.cliente.usuarioId ? null : (
            <Button size="sm" className="mt-4" onClick={() => setConvidando(true)}>
              <UserPlus className="size-4" /> Convidar para acessar
            </Button>
          )}
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Nome", evento.cliente.nome],
              ["E-mail", evento.cliente.email],
              ["Telefone", telefoneDe(evento.cliente.telefone)],
              ["WhatsApp", telefoneDe(evento.cliente.whatsapp)],
            ].map(([rotulo, valor]) => (
              <div key={rotulo}>
                <dt className="text-muted-foreground text-[11px] uppercase">{rotulo}</dt>
                <dd className="mt-1 text-sm font-medium [overflow-wrap:anywhere]">
                  {valor?.trim() ? valor : "Não informado"}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </Panel>
      {evento.orcamentos.length > 1 ? (
        <Panel className="p-5">
          <h2 className="font-display font-semibold">Histórico de orçamentos</h2>
          <ul className="mt-3 divide-y divide-border">
            {evento.orcamentos.map((item) => (
              <li key={item.id} className="flex justify-between py-3 text-sm">
                <Link to="/admin/orcamentos/$id" params={{ id: item.id }}>
                  Orçamento #{item.numero} · versão {item.versao}
                </Link>
                <span className="font-medium">{formatBRL(Number(item.total))}</span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
      <BarraDeEtapas evento={evento} valorEvento={valorEvento} />
    </div>
  );
}

/**
 * Envia o orçamento ao cliente: a partir daí o portal dele mostra os valores (e as edições
 * seguintes) e o WhatsApp abre com a mensagem pronta e o link de acesso.
 */
function EnviarOrcamentoAoCliente({
  evento,
  orcamento,
}: {
  evento: EventoDetalhe;
  orcamento: EventoDetalhe["orcamentos"][number];
}) {
  const router = useRouter();
  const enviar = useServerFn(enviarOrcamento);
  const gerarConvite = useServerFn(gerarConviteCliente);
  const [enviando, setEnviando] = useState(false);
  const whatsapp = evento.cliente.whatsapp;
  // Atalho para conversar com o cliente sem mensagem pronta (número inválido: sem atalho).
  let conversaWhatsApp: string | null = null;
  try {
    conversaWhatsApp = whatsapp ? createWhatsAppChatUrl(whatsapp) : null;
  } catch {
    conversaWhatsApp = null;
  }

  async function enviarAoCliente() {
    // A aba é aberta já no clique para o navegador não bloquear o pop-up após a espera.
    const janela = whatsapp ? window.open("", "_blank") : null;
    setEnviando(true);
    try {
      await enviar({ data: { id: orcamento.id } });
      if (whatsapp) {
        // Cliente sem conta não tem senha para usar: recebe o link para criar o acesso.
        const comoAcessar = evento.cliente.usuarioId
          ? `Para ver o cardápio completo e aprovar, entre com a sua senha: ${window.location.origin}${caminhoDoLoginDoOrcamento(orcamento.id, evento.cliente.email)}`
          : `Para ver o cardápio completo e aprovar, crie sua senha neste link (vale por ${VALIDADE_CONVITE_TEXTO} e só uma vez): ${window.location.origin}${caminhoDoConvite((await gerarConvite({ data: { clienteId: evento.cliente.id } })).token)}`;
        const mensagem = mensagemEnvioOrcamento({
          nomeCliente: evento.cliente.nome,
          tipoEvento: evento.tipo,
          data: formatDate(evento.dataEvento),
          convidados: evento.quantidadeConvidados,
          total: Number(orcamento.total),
          frete: orcamento.itens
            .filter((item) => ehFrete(item.unidade))
            .reduce((soma, item) => soma + Number(item.valorTotal), 0),
          comoAcessar,
        });
        const url = createWhatsAppUrl(whatsapp, mensagem);
        if (janela) {
          janela.opener = null;
          janela.location.href = url;
        } else {
          window.open(url, "_blank", "noopener,noreferrer");
        }
        toast.success("Orçamento liberado para o cliente.");
      } else {
        toast.success("Orçamento liberado no portal do cliente.", {
          description: "O cliente não tem WhatsApp cadastrado. Avise por outro canal.",
        });
      }
      await router.invalidate();
    } catch (error) {
      janela?.close();
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar o orçamento.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mt-4 flex flex-col items-stretch gap-1.5 sm:items-end">
      <div className="flex gap-2">
        <Button
          variant={orcamento.enviadoEm ? "outline" : "default"}
          className="min-w-60 flex-1 shrink-0 max-sm:h-11 sm:flex-none"
          disabled={enviando}
          onClick={() => void enviarAoCliente()}
        >
          {enviando ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <MessageCircle className="size-4" />
          )}
          {whatsapp
            ? orcamento.enviadoEm
              ? "Reenviar no WhatsApp"
              : "Enviar orçamento no WhatsApp"
            : "Liberar orçamento ao cliente"}
        </Button>
        {conversaWhatsApp ? (
          <Button variant="outline" size="icon" asChild className="size-11 shrink-0 sm:size-9">
            <a
              href={conversaWhatsApp}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Abrir conversa no WhatsApp com ${evento.cliente.nome}, sem mensagem`}
              title="Abrir conversa no WhatsApp (sem mensagem)"
            >
              <MessageCircleMore className="size-4" />
            </a>
          </Button>
        ) : null}
      </div>
      <p className="text-muted-foreground text-center text-xs sm:min-w-60">
        {orcamento.enviadoEm
          ? `Enviado ao cliente em ${formatDate(orcamento.enviadoEm)}.`
          : "O cliente ainda não vê os valores deste orçamento."}
      </p>
    </div>
  );
}

function PagamentosDoEvento({
  evento,
  valorEvento,
}: {
  evento: EventoDetalhe;
  valorEvento: number;
}) {
  const router = useRouter();
  const registrar = useServerFn(registrarPagamento);
  const excluir = useServerFn(excluirPagamento);
  const desfazer = useServerFn(desfazerRecebimento);
  const trocarForma = useServerFn(alterarFormaPagamento);
  const pedirConfirmacao = useConfirmar();
  const [aberto, setAberto] = useState(false);
  const [processando, setProcessando] = useState<string | null>(null);
  const parcelas = evento.pagamentos.filter((item) => item.status !== "CANCELADO");
  const parcelado = parcelas.reduce((soma, item) => soma + Number(item.valor), 0);
  // O total do orçamento pode mudar depois das parcelas, que não acompanham sozinhas.
  const diferenca = parcelas.length
    ? diferencaParcelas(
        valorEvento,
        parcelas.map((item) => Number(item.valor)),
      )
    : 0;
  // Novas parcelas na etapa de pagamento (a primeira definição vem do botão de etapa) ou em
  // evento confirmado com valor ainda sem parcela, como um contrato fechado com saldo.
  const podeAdicionar =
    evento.status === "CONFIRMADO" && (!parcelas.length || valorEvento > parcelado);

  async function executar(id: string, acao: () => Promise<unknown>, sucesso: string) {
    setProcessando(id);
    try {
      await acao();
      toast.success(sucesso);
      await router.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível concluir a ação.");
    } finally {
      setProcessando(null);
    }
  }

  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PanelHeader
          title="Pagamentos"
          subtitle={
            parcelas.length
              ? `${parcelas.length} parcela(s) · ${formatBRL(parcelado)} de ${formatBRL(valorEvento)}`
              : "O pagamento é definido depois da aprovação do orçamento"
          }
        />
        {podeAdicionar ? (
          <Button size="sm" variant="outline" onClick={() => setAberto(true)}>
            <Plus className="size-4" /> Adicionar parcelas
          </Button>
        ) : null}
      </div>
      {diferenca !== 0 ? (
        <div
          role="status"
          className="bg-warning/10 ring-warning/30 mt-4 flex items-start gap-2 rounded-xl p-3 text-sm ring-1"
        >
          <TriangleAlert className="text-warning-foreground mt-0.5 size-4 shrink-0" />
          <p>
            {diferenca > 0 ? (
              <>
                <strong>Faltam {formatBRL(diferenca)} em parcelas.</strong> O total do evento é{" "}
                {formatBRL(valorEvento)}, mas as parcelas somam {formatBRL(parcelado)}.
                {podeAdicionar ? " Use Adicionar parcelas para completar." : ""}
              </>
            ) : (
              <>
                <strong>As parcelas passam {formatBRL(-diferenca)} do total.</strong> O total do
                evento é {formatBRL(valorEvento)}, mas as parcelas somam {formatBRL(parcelado)}.
                Exclua uma parcela em aberto e lance de novo com o valor certo.
              </>
            )}
          </p>
        </div>
      ) : null}
      {parcelas.length ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full sm:min-w-[760px] text-left text-sm">
            <thead className="max-sm:hidden">
              <tr className="text-muted-foreground border-b border-border text-[11px] uppercase">
                <th className="pb-2 font-medium">Parcela</th>
                <th className="pb-2 font-medium max-sm:hidden">Vencimento</th>
                <th className="pb-2 font-medium">Valor</th>
                <th className="pb-2 font-medium max-sm:hidden">Forma de pagamento</th>
                <th className="pb-2 font-medium max-sm:hidden">Status</th>
                <th className="pb-2 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {parcelas.map((parcela) => {
                const formas: string[] = [...FORMAS_PAGAMENTO];
                if (parcela.formaPagamento && !formas.includes(parcela.formaPagamento)) {
                  formas.push(parcela.formaPagamento);
                }
                // No celular a forma de pagamento fica ao lado dos botões, na 2ª linha do cartão.
                const seletorForma = (classe: string) => (
                  <Select
                    value={parcela.formaPagamento ?? ""}
                    disabled={processando !== null}
                    onValueChange={(forma) =>
                      void executar(
                        parcela.id,
                        () => trocarForma({ data: { id: parcela.id, formaPagamento: forma } }),
                        "Forma de pagamento alterada.",
                      )
                    }
                  >
                    <SelectTrigger
                      className={classe}
                      aria-label={`Forma de pagamento da parcela ${parcela.numeroParcela}`}
                    >
                      <SelectValue placeholder="Definir" />
                    </SelectTrigger>
                    <SelectContent>
                      {formas.map((forma) => (
                        <SelectItem key={forma} value={forma}>
                          {forma}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                );
                return (
                  <tr
                    key={parcela.id}
                    className="max-sm:grid max-sm:grid-cols-[minmax(0,1fr)_auto] max-sm:gap-x-3 max-sm:py-3"
                  >
                    <td className="py-3 pr-3 max-sm:p-0">
                      <p className="font-medium">#{parcela.numeroParcela}</p>
                      {parcela.descricao ? (
                        <p className="text-muted-foreground text-xs">{parcela.descricao}</p>
                      ) : null}
                      <p className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs sm:hidden">
                        Vence {formatDate(parcela.dataVencimento)}
                        <StatusBadge status={parcela.status} />
                      </p>
                    </td>
                    <td className="text-muted-foreground py-3 pr-3 max-sm:hidden">
                      {formatDate(parcela.dataVencimento)}
                      {parcela.dataPagamento ? (
                        <p className="text-xs">Pago em {formatDate(parcela.dataPagamento)}</p>
                      ) : null}
                    </td>
                    <td className="py-3 pr-3 align-top font-medium whitespace-nowrap max-sm:p-0 max-sm:text-right sm:align-middle">
                      {formatBRL(Number(parcela.valor))}
                    </td>
                    <td className="py-3 pr-3 max-sm:hidden">{seletorForma("h-8 w-44")}</td>
                    <td className="py-3 pr-3 max-sm:hidden">
                      <StatusBadge status={parcela.status} />
                    </td>
                    <td className="py-3 text-right align-top max-sm:col-span-2 max-sm:p-0 max-sm:pt-3 sm:align-middle">
                      <div className="flex items-center justify-end gap-2">
                        <div className="min-w-0 flex-1 sm:hidden">
                          {seletorForma("h-11 w-full")}
                        </div>
                        {parcela.status === "PAGO" ? (
                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={processando !== null}
                              aria-label={`Desfazer o recebimento da parcela ${parcela.numeroParcela}`}
                              className="max-sm:size-11"
                              title="Desfazer recebimento"
                              onClick={async () => {
                                const ok = await pedirConfirmacao({
                                  titulo: `Desfazer o recebimento da parcela #${parcela.numeroParcela}?`,
                                  descricao: `${formatBRL(Number(parcela.valor))} deixa de contar como recebido e a parcela volta a ficar em aberto.`,
                                  textoConfirmar: "Desfazer recebimento",
                                  perigoso: true,
                                });
                                if (!ok) return;
                                void executar(
                                  parcela.id,
                                  () => desfazer({ data: { id: parcela.id } }),
                                  "Recebimento desfeito.",
                                );
                              }}
                            >
                              <Undo2 className="size-4 sm:hidden" />
                              <span className="hidden sm:inline">Desfazer</span>
                            </Button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={processando !== null}
                              aria-label={`Marcar parcela ${parcela.numeroParcela} como paga`}
                              className="max-sm:size-11"
                              title="Marcar pago"
                              onClick={() =>
                                void executar(
                                  parcela.id,
                                  () =>
                                    registrar({
                                      data: { id: parcela.id, dataPagamento: new Date() },
                                    }),
                                  "Pagamento registrado.",
                                )
                              }
                            >
                              <Check className="size-4 sm:hidden" />
                              <span className="hidden sm:inline">Marcar pago</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={processando !== null}
                              aria-label={`Excluir a parcela ${parcela.numeroParcela}`}
                              className="max-sm:size-11"
                              title="Excluir"
                              onClick={async () => {
                                const ok = await pedirConfirmacao({
                                  titulo: `Excluir a parcela #${parcela.numeroParcela}?`,
                                  descricao: `${formatBRL(Number(parcela.valor))} com vencimento em ${formatDate(parcela.dataVencimento)}.`,
                                  textoConfirmar: "Excluir parcela",
                                  perigoso: true,
                                });
                                if (!ok) return;
                                void executar(
                                  parcela.id,
                                  () => excluir({ data: { id: parcela.id } }),
                                  "Parcela excluída.",
                                );
                              }}
                            >
                              <Trash2 className="size-4 sm:hidden" />
                              <span className="hidden sm:inline">Excluir</span>
                            </Button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
      <GerarParcelasDialog
        aberto={aberto}
        onOpenChange={setAberto}
        eventoFixoId={evento.id}
        eventos={[
          {
            id: evento.id,
            nome: evento.nome,
            cliente: evento.cliente.nome,
            saldo: valorEvento - parcelado,
          },
        ]}
        onSalvo={() => router.invalidate()}
      />
    </Panel>
  );
}

/**
 * Barra fixa no rodapé com o indicador de etapas, o único botão de avanço da etapa atual
 * e o PDF. O botão muda conforme o status, inclusive quando ele é alterado manualmente.
 */
function BarraDeEtapas({ evento, valorEvento }: { evento: EventoDetalhe; valorEvento: number }) {
  const router = useRouter();
  const aprovar = useServerFn(aprovarOrcamento);
  const finalizar = useServerFn(finalizarEvento);
  const pedirConfirmacao = useConfirmar();
  const [processando, setProcessando] = useState<"etapa" | "pdf" | null>(null);
  const [definindoPagamento, setDefinindoPagamento] = useState(false);
  const etapa = acaoDaEtapa(evento.status);
  const orcamento = evento.orcamentos[0];
  // Antes da confirmação o PDF sai como orçamento, para a equipe enviar ao cliente.
  const pdfComoOrcamento =
    (STATUS_COM_PDF_ORCAMENTO as readonly string[]).includes(evento.status) &&
    !!orcamento?.itens.length;
  const pdfDisponivel =
    (STATUS_COM_PDF as readonly string[]).includes(evento.status) || pdfComoOrcamento;
  const indiceAtual = ETAPAS_EVENTO.indexOf(evento.status as (typeof ETAPAS_EVENTO)[number]);
  const parcelado = evento.pagamentos
    .filter((item) => item.status !== "CANCELADO")
    .reduce((soma, item) => soma + Number(item.valor), 0);

  async function executar(tipo: "etapa" | "pdf", tarefa: () => Promise<unknown>, ok?: string) {
    setProcessando(tipo);
    try {
      await tarefa();
      if (ok) toast.success(ok);
      if (tipo === "etapa") await router.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível concluir a ação.");
    } finally {
      setProcessando(null);
    }
  }

  async function avancar() {
    if (!etapa) return;
    switch (etapa.acao) {
      case "APROVAR":
        if (!orcamento) {
          toast.error("Crie o orçamento antes de aprovar.");
          return;
        }
        void executar(
          "etapa",
          () => aprovar({ data: { id: orcamento.id } }),
          "Orçamento aprovado.",
        );
        return;
      // Confirmar abre a definição do pagamento; ao salvar as parcelas o evento fica confirmado.
      case "CONFIRMAR":
        setDefinindoPagamento(true);
        return;
      case "FINALIZAR":
        if (
          !(await pedirConfirmacao({
            titulo: "Finalizar este evento?",
            descricao: "Use depois que o evento acontecer. Ele sai das próximas etapas.",
            textoConfirmar: "Finalizar evento",
          }))
        ) {
          return;
        }
        void executar("etapa", () => finalizar({ data: { id: evento.id } }), "Evento finalizado.");
        return;
    }
  }

  return (
    <div className="panel sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-2 p-2.5 shadow-xl sm:flex-nowrap sm:gap-3 sm:p-4">
      <ol className="flex flex-wrap items-center gap-1 text-xs" aria-label="Etapas do evento">
        {evento.status === "CANCELADO" ? (
          <li className="text-destructive font-semibold">Evento cancelado</li>
        ) : (
          <>
            {/* No celular só a etapa atual aparece, para a barra não cobrir a tela. */}
            {indiceAtual >= 0 ? (
              <li className="text-muted-foreground pr-1 sm:hidden">
                Etapa {indiceAtual + 1} de {ETAPAS_EVENTO.length}
              </li>
            ) : null}
            {ETAPAS_EVENTO.map((item, indice) => {
              const concluida = indice < indiceAtual;
              const atual = indice === indiceAtual;
              return (
                <li
                  key={item}
                  className={cn("flex items-center gap-1", !atual && "hidden sm:flex")}
                >
                  {indice > 0 ? (
                    <span className="bg-border hidden h-px w-3 sm:block" aria-hidden />
                  ) : null}
                  <span
                    aria-current={atual ? "step" : undefined}
                    className={cn(
                      "flex items-center gap-1 rounded-full px-2.5 py-1",
                      atual && "bg-primary text-primary-foreground font-semibold",
                      concluida && "bg-primary/10 text-primary",
                      !atual && !concluida && "text-muted-foreground",
                    )}
                  >
                    {concluida ? <Check className="size-3" /> : null}
                    {rotuloStatusEvento(item)}
                  </span>
                </li>
              );
            })}
          </>
        )}
      </ol>
      <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto [&>button]:flex-1 sm:[&>button]:flex-none">
        {etapa ? (
          <p className="text-muted-foreground hidden max-w-56 text-xs lg:block">
            {etapa.descricao}
          </p>
        ) : null}
        <Button
          variant="outline"
          disabled={!pdfDisponivel || processando !== null}
          title={
            pdfDisponivel
              ? pdfComoOrcamento
                ? "Baixar o orçamento em PDF para enviar ao cliente"
                : undefined
              : evento.status === "CANCELADO"
                ? "Evento cancelado"
                : "Crie o orçamento do evento para gerar o PDF"
          }
          onClick={() => void executar("pdf", () => baixarPdfDoEvento(evento.id))}
        >
          {processando === "pdf" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <FileText className="size-4" />
          )}
          PDF
          {pdfComoOrcamento ? (
            <span className="hidden min-[400px]:inline">do orçamento</span>
          ) : null}
        </Button>
        {etapa ? (
          <Button
            disabled={processando !== null}
            onClick={() => void avancar()}
            className="sm:min-w-32"
          >
            {processando === "etapa" ? <Loader2 className="size-4 animate-spin" /> : null}
            {etapa.rotulo}
          </Button>
        ) : null}
      </div>
      <GerarParcelasDialog
        aberto={definindoPagamento}
        onOpenChange={setDefinindoPagamento}
        eventoFixoId={evento.id}
        eventos={[
          {
            id: evento.id,
            nome: evento.nome,
            cliente: evento.cliente.nome,
            saldo: valorEvento - parcelado,
          },
        ]}
        onSalvo={() => router.invalidate()}
      />
    </div>
  );
}
