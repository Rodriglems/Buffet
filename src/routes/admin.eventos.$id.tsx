import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, FileText, Loader2, MessageCircle, Pencil, Plus } from "lucide-react";
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
import { AlterarStatusEvento } from "@/features/eventos/alterar-status-evento";
import { confirmarEvento, finalizarEvento, obterEvento } from "@/features/eventos/server-functions";
import { DescontoOrcamento } from "@/features/orcamentos/desconto-orcamento";
import { EditarOrcamentoDialog } from "@/features/orcamentos/editar-orcamento-dialog";
import { aprovarOrcamento, enviarOrcamento } from "@/features/orcamentos/server-functions";
import { GerarParcelasDialog } from "@/features/pagamentos/gerar-parcelas-dialog";
import { FORMAS_PAGAMENTO } from "@/features/pagamentos/parcelas";
import {
  alterarFormaPagamento,
  excluirPagamento,
  registrarPagamento,
} from "@/features/pagamentos/server-functions";
import { useConfirmar } from "@/lib/confirmacao";
import { formatBRL, formatDate } from "@/lib/format";
import { createWhatsAppUrl } from "@/lib/sharing";
import { acaoDaEtapa, ETAPAS_EVENTO, rotuloStatusEvento } from "@/lib/status-evento";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/eventos/$id")({
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
  const orcamentoAtual = evento.orcamentos[0];
  const valorEvento = valorDoEvento(evento);
  const parcelas = evento.pagamentos.filter((item) => item.status !== "CANCELADO");
  const recebido = parcelas
    .filter((item) => item.status === "PAGO")
    .reduce((soma, item) => soma + Number(item.valor), 0);
  const [editando, setEditando] = useState(false);
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
        subtitle={`${evento.tipo} · ${formatDate(evento.dataEvento)} · ${evento.localNome ?? "Local a definir"}`}
        actions={orcamentoAtual ? null : botaoWhatsApp}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Valor do evento" value={formatBRL(valorEvento)} />
        <StatCard label="Recebido" value={formatBRL(recebido)} />
        <StatCard label="A receber" value={formatBRL(Math.max(0, valorEvento - recebido))} />
      </div>
      <Panel className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-display font-semibold">{evento.tipo}</p>
            <p className="text-muted-foreground text-sm">
              {evento.formatoServico ? `${evento.formatoServico} · ` : ""}
              {evento.quantidadeConvidados} convidados
            </p>
            {evento.servicosAdicionais.length ? (
              <p className="text-muted-foreground mt-1 text-xs">
                Adicionais: {evento.servicosAdicionais.join(", ")}
              </p>
            ) : null}
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
              <Button size="sm" variant="outline" onClick={() => setEditando(true)}>
                <Pencil className="size-4" /> Editar orçamento
              </Button>
            ) : null
          }
        />
        {orcamentoAtual ? (
          <>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b border-border text-[11px] uppercase">
                    <th className="pb-2 font-medium">Item</th>
                    <th className="pb-2 font-medium">Quantidade</th>
                    <th className="pb-2 font-medium">Valor unitário</th>
                    <th className="pb-2 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orcamentoAtual.itens.map((item) => (
                    <tr key={item.id}>
                      <td className="py-3 pr-3 font-medium">{item.descricao}</td>
                      <td className="text-muted-foreground py-3 pr-3">
                        {Number(item.quantidade)} {item.unidade}
                      </td>
                      <td className="text-muted-foreground py-3 pr-3">
                        {formatBRL(Number(item.valorUnitario))}
                      </td>
                      <td className="py-3 text-right font-medium">
                        {formatBRL(Number(item.valorTotal))}
                      </td>
                    </tr>
                  ))}
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
            {orcamentoAtual.observacoes ? (
              <div className="bg-surface mt-4 rounded-xl p-4 ring-1 ring-black/5">
                <p className="text-muted-foreground text-[11px] uppercase">Observações</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{orcamentoAtual.observacoes}</p>
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
      <PagamentosDoEvento evento={evento} valorEvento={valorEvento} />
      <Panel className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display font-semibold">Cliente do evento</h2>
            <p className="text-muted-foreground text-sm">Pessoa responsável por este evento</p>
          </div>
          <Button size="sm" variant="outline" asChild>
            <Link to="/admin/clientes/$id" params={{ id: evento.cliente.id }}>
              Abrir cadastro
            </Link>
          </Button>
        </div>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Nome", evento.cliente.nome],
            ["E-mail", evento.cliente.email],
            ["Telefone", evento.cliente.telefone],
            ["WhatsApp", evento.cliente.whatsapp],
          ].map(([rotulo, valor]) => (
            <div key={rotulo}>
              <dt className="text-muted-foreground text-[11px] uppercase">{rotulo}</dt>
              <dd className="mt-1 text-sm font-medium">
                {valor?.trim() ? valor : "Não informado"}
              </dd>
            </div>
          ))}
        </dl>
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
  const [enviando, setEnviando] = useState(false);
  const whatsapp = evento.cliente.whatsapp;

  async function enviarAoCliente() {
    // A aba é aberta já no clique para o navegador não bloquear o pop-up após a espera.
    const janela = whatsapp ? window.open("", "_blank") : null;
    setEnviando(true);
    try {
      await enviar({ data: { id: orcamento.id } });
      if (whatsapp) {
        const primeiroNome = evento.cliente.nome.trim().split(/\s+/)[0];
        const mensagem = [
          `Olá, ${primeiroNome}! O orçamento do seu evento "${evento.nome}" (${formatDate(evento.dataEvento)}) já está pronto.`,
          `Para ver os itens e o valor, acesse ${window.location.origin}/ e entre com o seu e-mail${evento.cliente.email ? ` (${evento.cliente.email})` : ""} e a senha que você cadastrou.`,
          "Qualquer dúvida, é só responder esta mensagem.",
        ].join("\n\n");
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
      <Button
        variant={orcamento.enviadoEm ? "outline" : "default"}
        className="min-w-60 shrink-0"
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
  const trocarForma = useServerFn(alterarFormaPagamento);
  const pedirConfirmacao = useConfirmar();
  const [aberto, setAberto] = useState(false);
  const [processando, setProcessando] = useState<string | null>(null);
  const parcelas = evento.pagamentos.filter((item) => item.status !== "CANCELADO");
  const parcelado = parcelas.reduce((soma, item) => soma + Number(item.valor), 0);
  // Novas parcelas só durante a etapa de pagamento; a primeira definição vem do botão de etapa.
  const podeAdicionar = evento.status === "PAGAMENTO";

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
      {parcelas.length ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="text-muted-foreground border-b border-border text-[11px] uppercase">
                <th className="pb-2 font-medium">Parcela</th>
                <th className="pb-2 font-medium">Vencimento</th>
                <th className="pb-2 font-medium">Valor</th>
                <th className="pb-2 font-medium">Forma de pagamento</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {parcelas.map((parcela) => {
                const formas: string[] = [...FORMAS_PAGAMENTO];
                if (parcela.formaPagamento && !formas.includes(parcela.formaPagamento)) {
                  formas.push(parcela.formaPagamento);
                }
                return (
                  <tr key={parcela.id}>
                    <td className="py-3 pr-3">
                      <p className="font-medium">#{parcela.numeroParcela}</p>
                      {parcela.descricao ? (
                        <p className="text-muted-foreground text-xs">{parcela.descricao}</p>
                      ) : null}
                    </td>
                    <td className="text-muted-foreground py-3 pr-3">
                      {formatDate(parcela.dataVencimento)}
                      {parcela.dataPagamento ? (
                        <p className="text-xs">Pago em {formatDate(parcela.dataPagamento)}</p>
                      ) : null}
                    </td>
                    <td className="py-3 pr-3 font-medium">{formatBRL(Number(parcela.valor))}</td>
                    <td className="py-3 pr-3">
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
                          className="h-8 w-44"
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
                    </td>
                    <td className="py-3 pr-3">
                      <StatusBadge status={parcela.status} />
                    </td>
                    <td className="py-3 text-right">
                      {parcela.status === "PAGO" ? null : (
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={processando !== null}
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
                            Marcar pago
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={processando !== null}
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
                            Excluir
                          </Button>
                        </div>
                      )}
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
  const confirmar = useServerFn(confirmarEvento);
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
      case "PAGAMENTO":
        setDefinindoPagamento(true);
        return;
      case "CONFIRMAR":
        if (
          !(await pedirConfirmacao({
            titulo: "Confirmar este evento?",
            descricao: "O evento passa para “Confirmado” e o PDF do evento é liberado.",
            textoConfirmar: "Confirmar evento",
          }))
        ) {
          return;
        }
        void executar("etapa", () => confirmar({ data: { id: evento.id } }), "Evento confirmado.");
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
    <div className="panel sticky bottom-3 z-10 flex flex-col gap-3 p-3 shadow-xl sm:flex-row sm:items-center sm:justify-between sm:p-4">
      <ol className="flex flex-wrap items-center gap-1 text-xs" aria-label="Etapas do evento">
        {evento.status === "CANCELADO" ? (
          <li className="text-destructive font-semibold">Evento cancelado</li>
        ) : (
          ETAPAS_EVENTO.map((item, indice) => {
            const concluida = indice < indiceAtual;
            const atual = indice === indiceAtual;
            return (
              <li key={item} className="flex items-center gap-1">
                {indice > 0 ? <span className="bg-border h-px w-3" aria-hidden /> : null}
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
          })
        )}
      </ol>
      <div className="flex shrink-0 items-center gap-2">
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
          {pdfComoOrcamento ? "PDF do orçamento" : "PDF"}
        </Button>
        {etapa ? (
          <Button
            disabled={processando !== null}
            onClick={() => void avancar()}
            className="min-w-32"
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
