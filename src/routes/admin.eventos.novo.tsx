import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, Panel, PanelHeader } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AvisoClientesParecidos } from "@/features/clientes/clientes-parecidos";
import {
  descreverParecidos,
  useClientesParecidos,
} from "@/features/clientes/use-clientes-parecidos";
import { SeletorCliente, type ClienteEscolhido } from "@/features/clientes/seletor-cliente";
import { problemaNoContrato, saldoDoContrato } from "@/features/eventos/contrato";
import { criarEventoManual, obterOpcoesNovoEvento } from "@/features/eventos/server-functions";
import { hojeIso } from "@/features/pagamentos/a-receber";
import { FORMAS_PAGAMENTO } from "@/features/pagamentos/parcelas";
import { TIPOS_EVENTO } from "@/lib/catalogo";
import { useConfirmar } from "@/lib/confirmacao";
import { formatBRL } from "@/lib/format";
import { lerValorEmReais } from "@/lib/numero";
import { digitosDoTelefone } from "@/lib/telefone";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/eventos/novo")({
  head: () => ({
    meta: [
      { title: "Novo evento — Mesly Buffet & Eventos" },
      {
        name: "description",
        content: "Lance um evento ou contrato já fechado, com cadastro rápido do cliente.",
      },
    ],
  }),
  loader: () => obterOpcoesNovoEvento(),
  component: NovoEvento,
});

type Situacao = "ORCAMENTO" | "CONTRATO";
type Destino = "continuar" | "outro";

const SEM_FORMATO = "sem-formato";
const SEM_FORMA = "sem-forma";
const CLASSE_CAMPO = "bg-surface border-0 ring-1 ring-black/5";

const CLIENTE_NOVO_VAZIO = { nome: "", telefone: "", email: "" };
const EVENTO_VAZIO = {
  tipo: "",
  tipoOutro: "",
  formato: SEM_FORMATO,
  data: "",
  horaInicio: "",
  horaFim: "",
  convidados: "",
  local: "",
  cidade: "",
  observacoes: "",
};
const CONTRATO_VAZIO = {
  total: "",
  pago: "",
  pagoEm: "",
  forma: SEM_FORMA,
  vencimentoSaldo: "",
};

function Campo({
  id,
  rotulo,
  ajuda,
  className,
  children,
}: {
  id?: string;
  rotulo: string;
  ajuda?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label htmlFor={id} className="mb-1.5 block">
        {rotulo}
      </Label>
      {children}
      {ajuda ? <p className="text-muted-foreground mt-1 text-xs">{ajuda}</p> : null}
    </div>
  );
}

function NovoEvento() {
  const opcoes = Route.useLoaderData();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const criar = useServerFn(criarEventoManual);
  const confirmar = useConfirmar();
  const [clienteEscolhido, setClienteEscolhido] = useState<ClienteEscolhido | null>(null);
  const [cadastrandoCliente, setCadastrandoCliente] = useState(false);
  const [clienteNovo, setClienteNovo] = useState(CLIENTE_NOVO_VAZIO);
  const [situacao, setSituacao] = useState<Situacao>(
    opcoes.podeLancarContrato ? "CONTRATO" : "ORCAMENTO",
  );
  const [evento, setEvento] = useState(EVENTO_VAZIO);
  const [contrato, setContrato] = useState(CONTRATO_VAZIO);
  const [salvando, setSalvando] = useState<Destino | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const parecidos = useClientesParecidos(
    cadastrandoCliente
      ? { nome: clienteNovo.nome, telefone: clienteNovo.telefone, email: clienteNovo.email }
      : {},
  );

  const valorTotal = lerValorEmReais(contrato.total);
  const valorPago = lerValorEmReais(contrato.pago);
  const saldo = saldoDoContrato({ valorTotal, valorPago });
  const atualizarEvento = (dados: Partial<typeof EVENTO_VAZIO>) =>
    setEvento((atual) => ({ ...atual, ...dados }));
  const atualizarContrato = (dados: Partial<typeof CONTRATO_VAZIO>) =>
    setContrato((atual) => ({ ...atual, ...dados }));

  function abrirCadastro(digitado: string) {
    // O que foi digitado na busca já preenche o campo certo.
    const pareceTelefone = digitosDoTelefone(digitado).length >= 4 && !/[a-zà-ú]/i.test(digitado);
    setClienteNovo({
      ...CLIENTE_NOVO_VAZIO,
      ...(digitado.includes("@")
        ? { email: digitado }
        : pareceTelefone
          ? { telefone: digitado }
          : { nome: digitado }),
    });
    setCadastrandoCliente(true);
  }

  function usarExistente(cliente: ClienteEscolhido) {
    setClienteEscolhido(cliente);
    setCadastrandoCliente(false);
    setClienteNovo(CLIENTE_NOVO_VAZIO);
  }

  function limparTudo() {
    setClienteEscolhido(null);
    setCadastrandoCliente(false);
    setClienteNovo(CLIENTE_NOVO_VAZIO);
    setEvento(EVENTO_VAZIO);
    setContrato(CONTRATO_VAZIO);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function problemaNoFormulario(): string | null {
    if (!clienteEscolhido && !cadastrandoCliente) return "Selecione ou cadastre o cliente.";
    if (cadastrandoCliente) {
      if (clienteNovo.nome.trim().length < 2) return "Informe o nome do cliente.";
      if (!/^\d{10,11}$/.test(digitosDoTelefone(clienteNovo.telefone))) {
        return "Informe o telefone do cliente com DDD.";
      }
    }
    if (!evento.tipo) return "Selecione o tipo do evento.";
    if (evento.tipo === "Outros" && evento.tipoOutro.trim().length < 2) {
      return "Informe qual é o tipo do evento.";
    }
    if (!evento.data) return "Informe a data do evento.";
    if (!(Number(evento.convidados) > 0)) return "Informe a quantidade de convidados.";
    if (evento.horaInicio && evento.horaFim && evento.horaFim <= evento.horaInicio) {
      return "O horário final deve ser posterior ao horário inicial.";
    }
    if (situacao === "CONTRATO") {
      return problemaNoContrato(
        {
          valorTotal,
          valorPago,
          pagoEm: contrato.pagoEm || null,
          vencimentoSaldo: contrato.vencimentoSaldo || evento.data,
        },
        hojeIso(),
      );
    }
    return null;
  }

  async function salvar(destino: Destino) {
    const problema = problemaNoFormulario();
    if (problema) {
      setErro(problema);
      toast.error(problema);
      return;
    }
    setErro(null);
    if (cadastrandoCliente && parecidos.length) {
      const seguir = await confirmar({
        titulo: "Cadastrar mesmo assim?",
        descricao: `Já existe um cadastro parecido: ${descreverParecidos(parecidos)}. Para evitar duplicar, cancele e clique em “Usar este cliente”.`,
        textoConfirmar: "Cadastrar novo cliente",
      });
      if (!seguir) return;
    }
    setSalvando(destino);
    try {
      const resultado = await criar({
        data: {
          cliente: clienteEscolhido
            ? { id: clienteEscolhido.id }
            : {
                novo: {
                  nome: clienteNovo.nome.trim(),
                  telefone: clienteNovo.telefone,
                  email: clienteNovo.email.trim() || null,
                },
                ignorarParecidos: parecidos.length > 0,
              },
          tipo: evento.tipo === "Outros" ? evento.tipoOutro.trim() : evento.tipo,
          formatoServico: evento.formato === SEM_FORMATO ? null : evento.formato,
          dataEvento: evento.data,
          horaInicio: evento.horaInicio || null,
          horaFim: evento.horaFim || null,
          quantidadeConvidados: Number(evento.convidados),
          localNome: evento.local.trim() || null,
          cidade: evento.cidade.trim() || null,
          observacoes: evento.observacoes.trim() || null,
          contrato:
            situacao === "CONTRATO"
              ? {
                  valorTotal,
                  valorPago,
                  pagoEm: valorPago > 0 ? contrato.pagoEm : null,
                  vencimentoSaldo: saldo > 0 ? contrato.vencimentoSaldo || evento.data : null,
                  formaPagamento: contrato.forma === SEM_FORMA ? null : contrato.forma,
                }
              : null,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["clientes-busca"] });
      await queryClient.invalidateQueries({ queryKey: ["clientes-parecidos"] });
      if (destino === "outro") {
        toast.success(`Evento de ${resultado.clienteNome} salvo.`, {
          action: {
            label: "Abrir",
            onClick: () =>
              void navigate({ to: "/admin/eventos/$id", params: { id: resultado.eventoId } }),
          },
        });
        limparTudo();
      } else if (situacao === "ORCAMENTO" && opcoes.podeCriarOrcamento) {
        toast.success("Evento salvo. Agora monte o orçamento.");
        await navigate({
          to: "/admin/orcamentos/novo",
          search: { eventoId: resultado.eventoId },
        });
      } else {
        toast.success("Evento salvo.");
        await navigate({ to: "/admin/eventos/$id", params: { id: resultado.eventoId } });
      }
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : "Não foi possível salvar.";
      setErro(mensagem);
      toast.error(mensagem);
    } finally {
      setSalvando(null);
    }
  }

  function aoEnviar(formulario: FormEvent<HTMLFormElement>) {
    formulario.preventDefault();
    void salvar("continuar");
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={aoEnviar} noValidate>
      <PageHeader
        title="Novo evento"
        subtitle="Lance um contrato já fechado ou comece um orçamento"
      />

      {/* Acima dos painéis seguintes: a lista de clientes abre por cima deles. */}
      <Panel className="relative z-20 p-5">
        <PanelHeader title="Cliente" subtitle="Só nome e telefone já bastam para um cliente novo" />
        <div className="mt-4 grid gap-3">
          {cadastrandoCliente ? (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <Campo id="cliente-nome" rotulo="Nome">
                  <Input
                    id="cliente-nome"
                    autoFocus={!clienteNovo.nome}
                    maxLength={160}
                    className={CLASSE_CAMPO}
                    value={clienteNovo.nome}
                    onChange={(e) => setClienteNovo((c) => ({ ...c, nome: e.target.value }))}
                  />
                </Campo>
                <Campo id="cliente-telefone" rotulo="Telefone ou WhatsApp">
                  <Input
                    id="cliente-telefone"
                    inputMode="tel"
                    autoFocus={Boolean(clienteNovo.nome)}
                    placeholder="(11) 90000-0000"
                    className={CLASSE_CAMPO}
                    value={clienteNovo.telefone}
                    onChange={(e) => setClienteNovo((c) => ({ ...c, telefone: e.target.value }))}
                  />
                </Campo>
                <Campo id="cliente-email" rotulo="E-mail (opcional)">
                  <Input
                    id="cliente-email"
                    type="email"
                    className={CLASSE_CAMPO}
                    value={clienteNovo.email}
                    onChange={(e) => setClienteNovo((c) => ({ ...c, email: e.target.value }))}
                  />
                </Campo>
              </div>
              <AvisoClientesParecidos parecidos={parecidos} onUsar={usarExistente} />
              <div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setCadastrandoCliente(false);
                    setClienteNovo(CLIENTE_NOVO_VAZIO);
                  }}
                >
                  Voltar para a busca de clientes
                </Button>
              </div>
            </>
          ) : (
            <SeletorCliente
              escolhido={clienteEscolhido}
              podeCriar={opcoes.podeCriarCliente}
              onEscolher={setClienteEscolhido}
              onLimpar={() => setClienteEscolhido(null)}
              onCriar={abrirCadastro}
            />
          )}
        </div>
      </Panel>

      <Panel className="p-5">
        <PanelHeader title="Situação" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Situação">
          {(
            [
              {
                valor: "CONTRATO",
                Icone: CheckCircle2,
                titulo: "Contrato já fechado",
                descricao: "Entra como Confirmado, com o valor combinado e o que já foi pago.",
                desativado: !opcoes.podeLancarContrato,
              },
              {
                valor: "ORCAMENTO",
                Icone: FileText,
                titulo: "Orçamento",
                descricao: "Ainda em negociação. Você monta a proposta em seguida.",
                desativado: false,
              },
            ] as const
          ).map(({ valor, Icone, titulo, descricao, desativado }) => (
            <button
              key={valor}
              type="button"
              role="radio"
              aria-checked={situacao === valor}
              disabled={desativado}
              onClick={() => setSituacao(valor)}
              className={cn(
                "flex items-start gap-3 rounded-xl p-4 text-left ring-1 transition disabled:cursor-not-allowed disabled:opacity-50",
                situacao === valor
                  ? "bg-primary/5 ring-primary"
                  : "bg-surface hover:ring-primary/30 ring-black/5",
              )}
            >
              <Icone className="text-primary mt-0.5 size-5 shrink-0" />
              <span>
                <span className="block text-sm font-semibold">{titulo}</span>
                <span className="text-muted-foreground block text-xs">{descricao}</span>
              </span>
            </button>
          ))}
        </div>
      </Panel>

      <Panel className="p-5">
        <PanelHeader title="Dados do evento" />
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Campo id="evento-tipo" rotulo="Tipo de evento">
            <Select value={evento.tipo} onValueChange={(tipo) => atualizarEvento({ tipo })}>
              <SelectTrigger id="evento-tipo" className={cn("w-full", CLASSE_CAMPO)}>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_EVENTO.map((tipo) => (
                  <SelectItem key={tipo} value={tipo}>
                    {tipo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>
          {evento.tipo === "Outros" ? (
            <Campo id="evento-tipo-outro" rotulo="Qual é o tipo do evento?">
              <Input
                id="evento-tipo-outro"
                maxLength={100}
                className={CLASSE_CAMPO}
                value={evento.tipoOutro}
                onChange={(e) => atualizarEvento({ tipoOutro: e.target.value })}
              />
            </Campo>
          ) : null}
          <Campo id="evento-data" rotulo="Data do evento">
            <Input
              id="evento-data"
              type="date"
              className={CLASSE_CAMPO}
              value={evento.data}
              onChange={(e) => atualizarEvento({ data: e.target.value })}
            />
          </Campo>
          <Campo id="evento-convidados" rotulo="Convidados">
            <Input
              id="evento-convidados"
              type="number"
              min={1}
              max={100000}
              className={CLASSE_CAMPO}
              value={evento.convidados}
              onChange={(e) => atualizarEvento({ convidados: e.target.value })}
            />
          </Campo>
          <Campo id="evento-formato" rotulo="Formato (opcional)">
            <Select
              value={evento.formato}
              onValueChange={(formato) => atualizarEvento({ formato })}
            >
              <SelectTrigger id="evento-formato" className={cn("w-full", CLASSE_CAMPO)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SEM_FORMATO}>Não definido</SelectItem>
                {opcoes.formatos.map((formato) => (
                  <SelectItem key={formato} value={formato}>
                    {formato}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>
          <Campo id="evento-inicio" rotulo="Início (opcional)">
            <Input
              id="evento-inicio"
              type="time"
              className={CLASSE_CAMPO}
              value={evento.horaInicio}
              onChange={(e) => atualizarEvento({ horaInicio: e.target.value })}
            />
          </Campo>
          <Campo id="evento-fim" rotulo="Fim (opcional)">
            <Input
              id="evento-fim"
              type="time"
              className={CLASSE_CAMPO}
              value={evento.horaFim}
              onChange={(e) => atualizarEvento({ horaFim: e.target.value })}
            />
          </Campo>
          <Campo id="evento-local" rotulo="Local (opcional)">
            <Input
              id="evento-local"
              maxLength={160}
              className={CLASSE_CAMPO}
              value={evento.local}
              onChange={(e) => atualizarEvento({ local: e.target.value })}
            />
          </Campo>
          <Campo id="evento-cidade" rotulo="Cidade (opcional)">
            <Input
              id="evento-cidade"
              maxLength={120}
              className={CLASSE_CAMPO}
              value={evento.cidade}
              onChange={(e) => atualizarEvento({ cidade: e.target.value })}
            />
          </Campo>
          <Campo
            id="evento-observacoes"
            rotulo="Observações (opcional)"
            className="sm:col-span-2 xl:col-span-3"
          >
            <Textarea
              id="evento-observacoes"
              rows={3}
              maxLength={4000}
              className={CLASSE_CAMPO}
              value={evento.observacoes}
              onChange={(e) => atualizarEvento({ observacoes: e.target.value })}
            />
          </Campo>
        </div>
      </Panel>

      {situacao === "CONTRATO" ? (
        <Panel className="p-5">
          <PanelHeader
            title="Valores do contrato"
            subtitle="Os itens do cardápio podem ser detalhados depois, no próprio evento"
          />
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Campo
              id="contrato-total"
              rotulo="Valor total"
              ajuda={valorTotal > 0 ? `Entendido como ${formatBRL(valorTotal)}` : undefined}
            >
              <Input
                id="contrato-total"
                inputMode="decimal"
                placeholder="30.000,00"
                className={CLASSE_CAMPO}
                value={contrato.total}
                onChange={(e) => atualizarContrato({ total: e.target.value })}
              />
            </Campo>
            <Campo
              id="contrato-pago"
              rotulo="Valor já pago (opcional)"
              ajuda={valorPago > 0 ? `Entendido como ${formatBRL(valorPago)}` : undefined}
            >
              <Input
                id="contrato-pago"
                inputMode="decimal"
                placeholder="0,00"
                className={CLASSE_CAMPO}
                value={contrato.pago}
                onChange={(e) => atualizarContrato({ pago: e.target.value })}
              />
            </Campo>
            {valorPago > 0 ? (
              <>
                <Campo
                  id="contrato-pago-em"
                  rotulo="Recebido em"
                  ajuda="O financeiro soma o valor neste mês."
                >
                  <Input
                    id="contrato-pago-em"
                    type="date"
                    max={hojeIso()}
                    className={CLASSE_CAMPO}
                    value={contrato.pagoEm}
                    onChange={(e) => atualizarContrato({ pagoEm: e.target.value })}
                  />
                </Campo>
                <Campo id="contrato-forma" rotulo="Forma de pagamento (opcional)">
                  <Select
                    value={contrato.forma}
                    onValueChange={(forma) => atualizarContrato({ forma })}
                  >
                    <SelectTrigger id="contrato-forma" className={cn("w-full", CLASSE_CAMPO)}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SEM_FORMA}>Não informada</SelectItem>
                      {FORMAS_PAGAMENTO.map((forma) => (
                        <SelectItem key={forma} value={forma}>
                          {forma}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Campo>
              </>
            ) : null}
            {valorTotal > 0 && saldo > 0 ? (
              <Campo
                id="contrato-vencimento"
                rotulo="Vencimento do saldo"
                ajuda="Sem preencher, usa a data do evento. Dá para parcelar depois."
              >
                <Input
                  id="contrato-vencimento"
                  type="date"
                  className={CLASSE_CAMPO}
                  value={contrato.vencimentoSaldo}
                  onChange={(e) => atualizarContrato({ vencimentoSaldo: e.target.value })}
                />
              </Campo>
            ) : null}
          </div>
          {valorTotal > 0 ? (
            <p
              className={cn(
                "bg-surface mt-4 rounded-xl p-3 text-sm ring-1 ring-black/5",
                saldo < 0 && "text-destructive",
              )}
            >
              {saldo < 0 ? (
                "O valor já pago é maior que o valor do contrato."
              ) : saldo === 0 ? (
                <strong>Contrato quitado.</strong>
              ) : (
                <>
                  Saldo a receber: <strong>{formatBRL(saldo)}</strong>
                </>
              )}
            </p>
          ) : null}
        </Panel>
      ) : null}

      {erro ? (
        <p role="alert" className="text-destructive text-right text-sm">
          {erro}
        </p>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" asChild>
          <Link to="/admin/eventos">Cancelar</Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={salvando !== null}
          onClick={() => void salvar("outro")}
        >
          {salvando === "outro" ? <Loader2 className="size-4 animate-spin" /> : null}
          Salvar e cadastrar outro
        </Button>
        <Button type="submit" disabled={salvando !== null}>
          {salvando === "continuar" ? <Loader2 className="size-4 animate-spin" /> : null}
          {situacao === "ORCAMENTO" && opcoes.podeCriarOrcamento
            ? "Salvar e montar orçamento"
            : "Salvar evento"}
        </Button>
      </div>
    </form>
  );
}
