import { useEffect, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Search, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { normalizarBusca } from "@/features/orcamentos/formulario-publico";
import { ITEM_VALOR_DO_CONTRATO } from "@/features/eventos/contrato";
import { atualizarItensOrcamento } from "@/features/orcamentos/server-functions";
import { listServicos } from "@/features/servicos/server-functions";
import {
  cobrancaDasLinhas,
  comCobranca,
  DESCRICAO_FRETE,
  ehFrete,
  ehServico,
  ehValorAParte,
  linhaComUnidadePadrao,
  POR_PESSOA,
  POR_PRATO,
  segueACobranca,
  UNIDADE_FRETE,
  UNIDADE_SERVICO,
  unidadeNoOrcamento,
  type Cobranca,
} from "@/features/orcamentos/unidade-item";
import { formatBRL } from "@/lib/format";
import { lerNumero, limparNumeroDigitado } from "@/lib/numero";
import { cn } from "@/lib/utils";

/** Campos numéricos guardados como texto para não exibir zeros à esquerda ao digitar. */
type Linha = {
  chave: string;
  servicoId: string | null;
  descricao: string;
  quantidade: string;
  unidade: string;
  valorUnitario: string;
  desconto: number;
};

type ItemOrcamento = {
  id: string;
  servicoId: string | null;
  descricao: string;
  quantidade: string | number;
  unidade: string;
  valorUnitario: string | number;
  desconto: string | number;
};

type ErrosLinha = Partial<Record<"descricao" | "quantidade" | "unidade" | "valorUnitario", string>>;

/** Linhas sob consulta ainda "por evento" abrem como "por pessoa", com os convidados. */
function paraLinhas(itens: ItemOrcamento[], convidados: number): Linha[] {
  return itens.map((item) => {
    const { unidade, quantidade, valorUnitario } = linhaComUnidadePadrao(
      {
        unidade: item.unidade,
        quantidade: Number(item.quantidade),
        valorUnitario: Number(item.valorUnitario),
      },
      convidados,
    );
    return {
      chave: item.id,
      servicoId: item.servicoId,
      descricao: item.descricao,
      quantidade: String(quantidade),
      unidade,
      valorUnitario: String(valorUnitario),
      desconto: Number(item.desconto),
    };
  });
}

function totalLinha(linha: Linha) {
  return lerNumero(linha.quantidade) * lerNumero(linha.valorUnitario) - linha.desconto;
}

function validarLinha(linha: Linha): ErrosLinha {
  const erros: ErrosLinha = {};
  if (linha.descricao.trim().length < 2) erros.descricao = "Informe o nome do item.";
  if (!(lerNumero(linha.quantidade) > 0)) erros.quantidade = "Quantidade maior que zero.";
  if (!linha.unidade.trim()) erros.unidade = "Informe a unidade.";
  if (linha.valorUnitario.trim() === "" || lerNumero(linha.valorUnitario) < 0) {
    erros.valorUnitario = "Informe o valor (use 0 se for sob consulta).";
  }
  return erros;
}

/** Linhas da tabela: só os itens; frete e serviços têm as seções próprias. */
function itensSemFrete(itens: ItemOrcamento[], convidados: number): Linha[] {
  return paraLinhas(
    itens.filter((item) => !ehValorAParte(item.unidade)),
    convidados,
  );
}

/** Serviço com valor fechado (garçom, copeira...), editado na seção "Serviços". */
type LinhaServico = { chave: string; descricao: string; valor: string; pedido: boolean };

/**
 * Serviços já cobrados no orçamento e, abertos para receber o valor, os que o cliente pediu no
 * formulário e ainda não têm valor.
 */
function servicosIniciais(itens: ItemOrcamento[], pedidos: readonly string[]): LinhaServico[] {
  const pedido = (nome: string) =>
    pedidos.some((item) => normalizarBusca(item.trim()) === normalizarBusca(nome.trim()));
  const salvos = itens
    .filter((item) => ehServico(item.unidade))
    .map((item) => ({
      chave: item.id,
      descricao: item.descricao,
      valor: String(Number(item.valorUnitario) * Number(item.quantidade)),
      pedido: pedido(item.descricao),
    }));
  const jaSalvos = new Set(salvos.map((item) => normalizarBusca(item.descricao.trim())));
  const abertos = [...new Set(pedidos)]
    .filter((nome) => !jaSalvos.has(normalizarBusca(nome.trim())))
    .map((nome) => ({ chave: `pedido-${nome}`, descricao: nome, valor: "", pedido: true }));
  return [...salvos, ...abertos];
}

/** Valor do frete já salvo, como texto do campo. */
function freteSalvo(itens: ItemOrcamento[]): string {
  const item = itens.find((linha) => ehFrete(linha.unidade));
  return item ? String(Number(item.valorUnitario)) : "";
}

/** Por prato quando já há linhas assim ou um frete salvo; senão por pessoa. */
function cobrancaInicial(itens: ItemOrcamento[], convidados: number): Cobranca {
  if (itens.some((item) => ehFrete(item.unidade))) return POR_PRATO;
  return cobrancaDasLinhas(itensSemFrete(itens, convidados).map((linha) => linha.unidade));
}

export function EditarOrcamentoDialog({
  aberto,
  onOpenChange,
  orcamento,
  convidados,
  valorEmParcelas = 0,
  sugestoesServicos = [],
  servicosPedidos = [],
}: {
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
  orcamento: { id: string; itens: ItemOrcamento[] };
  convidados: number;
  /** Soma das parcelas do evento: elas não mudam sozinhas quando o total do orçamento muda. */
  valorEmParcelas?: number;
  /** Serviços para adicionar com um toque (ex.: os adicionais de interesse do cliente). */
  sugestoesServicos?: readonly string[];
  /** Serviços que o cliente pediu: já abrem na seção "Serviços", esperando o valor. */
  servicosPedidos?: readonly string[];
}) {
  const router = useRouter();
  const salvar = useServerFn(atualizarItensOrcamento);
  const [linhas, setLinhas] = useState<Linha[]>(() => itensSemFrete(orcamento.itens, convidados));
  // Um select só para o orçamento inteiro: por pessoa (quantidade = convidados) ou por prato.
  const [cobranca, setCobranca] = useState<Cobranca>(() =>
    cobrancaInicial(orcamento.itens, convidados),
  );
  // Frete: linha fixa no fim da tabela, só na cobrança por prato.
  const [frete, setFrete] = useState(() => freteSalvo(orcamento.itens));
  const [servicos, setServicos] = useState<LinhaServico[]>(() =>
    servicosIniciais(orcamento.itens, servicosPedidos),
  );
  const [busca, setBusca] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [tentouSalvar, setTentouSalvar] = useState(false);
  const cardapio = useQuery({ queryKey: ["servicos"], queryFn: listServicos, enabled: aberto });

  useEffect(() => {
    if (aberto) {
      setLinhas(itensSemFrete(orcamento.itens, convidados));
      setCobranca(cobrancaInicial(orcamento.itens, convidados));
      setFrete(freteSalvo(orcamento.itens));
      setServicos(servicosIniciais(orcamento.itens, servicosPedidos));
      setBusca("");
      setTentouSalvar(false);
    }
  }, [aberto, orcamento.itens, convidados, servicosPedidos]);

  const termo = normalizarBusca(busca.trim());
  const sugestoes = termo
    ? (cardapio.data ?? [])
        .filter(
          (servico) =>
            servico.status === "Ativo" &&
            normalizarBusca(`${servico.nome} ${servico.categoria}`).includes(termo),
        )
        .slice(0, 8)
    : [];
  const comFrete = cobranca === POR_PRATO;
  const valorFrete = comFrete ? lerNumero(frete) || 0 : 0;
  const valorServicos = servicos.reduce(
    (soma, servico) => soma + (lerNumero(servico.valor) || 0),
    0,
  );
  const subtotal =
    linhas.reduce((soma, linha) => soma + totalLinha(linha), 0) + valorFrete + valorServicos;
  const servicosSemNome = servicos.filter((servico) => servico.descricao.trim().length < 2);
  const jaAdicionados = new Set(
    servicos.map((servico) => normalizarBusca(servico.descricao.trim())),
  );
  const atalhosServicos = [...new Set(sugestoesServicos)].filter(
    (nome) => !jaAdicionados.has(normalizarBusca(nome)),
  );

  function adicionarServico(descricao: string) {
    setServicos((atuais) => [
      ...atuais,
      { chave: crypto.randomUUID(), descricao, valor: "", pedido: false },
    ]);
  }

  function alterarServico(chave: string, campo: "descricao" | "valor", valor: string) {
    const limpo = campo === "valor" ? limparNumeroDigitado(valor) : valor;
    setServicos((atuais) =>
      atuais.map((servico) => (servico.chave === chave ? { ...servico, [campo]: limpo } : servico)),
    );
  }
  const errosPorLinha = new Map(linhas.map((linha) => [linha.chave, validarLinha(linha)]));
  const itemDoContratoJunto =
    linhas.length > 1 && linhas.some((linha) => linha.descricao === ITEM_VALOR_DO_CONTRATO);
  const quantidadeErros = [...errosPorLinha.values()].filter((e) => Object.keys(e).length).length;

  function alterar(chave: string, campo: keyof ErrosLinha, valor: string) {
    const limpo =
      campo === "quantidade" || campo === "valorUnitario" ? limparNumeroDigitado(valor) : valor;
    setLinhas((atuais) =>
      atuais.map((linha) => (linha.chave === chave ? { ...linha, [campo]: limpo } : linha)),
    );
  }

  /** Troca a cobrança de todas as linhas; unidades específicas (ex.: cento) ficam. */
  function trocarCobranca(nova: Cobranca) {
    setCobranca(nova);
    setLinhas((atuais) =>
      atuais.map((linha) => {
        const { unidade, quantidade } = comCobranca(
          linha.unidade,
          lerNumero(linha.quantidade),
          nova,
          convidados,
        );
        return { ...linha, unidade, quantidade: String(quantidade) };
      }),
    );
  }

  /** Linha nova já entra na cobrança escolhida acima da tabela. */
  function adicionar(linha: Omit<Linha, "chave" | "quantidade">) {
    const { unidade, quantidade } = comCobranca(linha.unidade, 1, cobranca, convidados);
    setLinhas((atuais) => [
      ...atuais,
      { ...linha, unidade, quantidade: String(quantidade), chave: crypto.randomUUID() },
    ]);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setTentouSalvar(true);
    if (!linhas.length) {
      toast.error("O orçamento precisa de pelo menos um item.");
      return;
    }
    if (quantidadeErros) {
      toast.error(
        quantidadeErros === 1
          ? "Corrija o item destacado antes de salvar."
          : `Corrija os ${quantidadeErros} itens destacados antes de salvar.`,
      );
      return;
    }
    if (servicosSemNome.length) {
      toast.error("Informe o nome de cada serviço.");
      return;
    }
    if (subtotal < 0) {
      toast.error("O total dos itens não pode ser negativo.");
      return;
    }
    setSalvando(true);
    try {
      await salvar({
        data: {
          id: orcamento.id,
          itens: [
            ...linhas.map((linha) => ({
              servicoId: linha.servicoId,
              descricao: linha.descricao.trim(),
              quantidade: lerNumero(linha.quantidade),
              unidade: linha.unidade.trim(),
              valorUnitario: lerNumero(linha.valorUnitario),
              desconto: linha.desconto,
            })),
            // Frete zerado não vira item: não aparece no PDF nem para o cliente.
            ...(valorFrete > 0
              ? [
                  {
                    servicoId: null,
                    descricao: DESCRICAO_FRETE,
                    quantidade: 1,
                    unidade: UNIDADE_FRETE,
                    valorUnitario: valorFrete,
                    desconto: 0,
                  },
                ]
              : []),
            // Serviço sem valor não vira item: só o que foi cobrado entra no orçamento.
            ...servicos
              .filter((servico) => (lerNumero(servico.valor) || 0) > 0)
              .map((servico) => ({
                servicoId: null,
                descricao: servico.descricao.trim(),
                quantidade: 1,
                unidade: UNIDADE_SERVICO,
                valorUnitario: lerNumero(servico.valor),
                desconto: 0,
              })),
          ],
        },
      });
      toast.success("Orçamento atualizado.");
      onOpenChange(false);
      await router.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o orçamento.");
    } finally {
      setSalvando(false);
    }
  }

  const classeErro = (erro?: string) =>
    cn(tentouSalvar && erro && "ring-destructive ring-2 focus-visible:ring-destructive");

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <form className="grid gap-4" onSubmit={submit} noValidate>
          <DialogHeader>
            <DialogTitle>Editar orçamento</DialogTitle>
            <DialogDescription className="sr-only">
              Itens, quantidades e valores do orçamento.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <Label htmlFor="orcamento-cobranca" className="text-sm font-semibold">
              Cobrança
            </Label>
            <Select value={cobranca} onValueChange={(valor) => trocarCobranca(valor as Cobranca)}>
              <SelectTrigger id="orcamento-cobranca" className="w-full max-sm:h-11 sm:w-60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={POR_PESSOA}>
                  Por pessoa ({convidados} {convidados === 1 ? "convidado" : "convidados"})
                </SelectItem>
                <SelectItem value={POR_PRATO}>Por prato</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              {cobranca === POR_PESSOA
                ? "A quantidade de cada item é o número de convidados."
                : "Cada item conta uma vez (quantidade 1). O frete fica no fim da tabela."}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="tabela-formulario tabela-itens-orcamento w-full sm:min-w-[680px] text-left text-sm">
              <thead>
                <tr className="text-muted-foreground border-b border-border text-[11px] uppercase">
                  <th className="pb-2 font-medium">Item</th>
                  <th className="pb-2 font-medium">Qtd.</th>
                  <th className="pb-2 font-medium">Unidade</th>
                  <th className="pb-2 font-medium">Valor unit.</th>
                  <th className="pb-2 font-medium">Total</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {linhas.map((linha) => {
                  const erros = errosPorLinha.get(linha.chave) ?? {};
                  const mensagens = tentouSalvar ? Object.values(erros) : [];
                  return (
                    <tr key={linha.chave} className="align-top">
                      <td className="py-2 pr-2">
                        <Input
                          aria-label="Descrição do item"
                          aria-invalid={Boolean(tentouSalvar && erros.descricao)}
                          className={classeErro(erros.descricao)}
                          value={linha.descricao}
                          onChange={(event) =>
                            alterar(linha.chave, "descricao", event.target.value)
                          }
                        />
                        {mensagens.length ? (
                          <p className="text-destructive mt-1 text-xs">{mensagens.join(" ")}</p>
                        ) : null}
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          inputMode="decimal"
                          aria-label="Quantidade"
                          aria-invalid={Boolean(tentouSalvar && erros.quantidade)}
                          className={cn("w-20", classeErro(erros.quantidade))}
                          value={linha.quantidade}
                          onChange={(event) =>
                            alterar(linha.chave, "quantidade", event.target.value)
                          }
                        />
                      </td>
                      <td className="text-muted-foreground py-2 pr-2 pt-4 whitespace-nowrap">
                        {linha.unidade}
                        {/* Unidade própria do cardápio (ex.: cento) não segue a cobrança. */}
                        {segueACobranca(linha.unidade) ? null : (
                          <span className="block text-[11px]">não muda com a cobrança</span>
                        )}
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          inputMode="decimal"
                          aria-label="Valor unitário"
                          aria-invalid={Boolean(tentouSalvar && erros.valorUnitario)}
                          className={cn("w-28", classeErro(erros.valorUnitario))}
                          value={linha.valorUnitario}
                          onChange={(event) =>
                            alterar(linha.chave, "valorUnitario", event.target.value)
                          }
                        />
                      </td>
                      <td className="py-2 pr-2 pt-4 font-medium whitespace-nowrap">
                        {formatBRL(totalLinha(linha))}
                      </td>
                      <td className="py-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Remover ${linha.descricao || "item"}`}
                          onClick={() =>
                            setLinhas((atuais) =>
                              atuais.filter((item) => item.chave !== linha.chave),
                            )
                          }
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {comFrete ? (
                <tfoot>
                  <tr className="border-border border-t-2">
                    <td data-label="Item" className="py-2 pt-4 pr-2 font-medium">
                      Frete
                    </td>
                    <td data-label="Qtd." className="text-muted-foreground py-2 pt-4 pr-2">
                      1
                    </td>
                    <td data-label="Unidade" className="text-muted-foreground py-2 pt-4 pr-2">
                      {UNIDADE_FRETE}
                    </td>
                    <td data-label="Valor unit." className="py-2 pr-2">
                      <Input
                        inputMode="decimal"
                        aria-label="Valor do frete"
                        placeholder="0"
                        className="w-28"
                        value={frete}
                        onChange={(event) => setFrete(limparNumeroDigitado(event.target.value))}
                      />
                    </td>
                    <td data-label="Total" className="py-2 pt-4 pr-2 font-medium whitespace-nowrap">
                      {formatBRL(valorFrete)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              ) : null}
            </table>
            {linhas.length ? null : (
              <p className="text-destructive py-3 text-sm">
                O orçamento precisa de pelo menos um item.
              </p>
            )}
          </div>

          <div className="bg-surface grid gap-3 rounded-xl p-4 ring-1 ring-black/5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">Adicionar item</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  adicionar({
                    servicoId: null,
                    descricao: "",
                    unidade: cobranca,
                    valorUnitario: "",
                    desconto: 0,
                  })
                }
              >
                <Plus className="size-4" /> Item livre
              </Button>
            </div>
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar no cardápio…"
                className="pl-9"
              />
            </div>
            {cardapio.isError ? (
              <p className="text-muted-foreground text-xs">
                Não foi possível carregar o cardápio. Use “Item livre”.
              </p>
            ) : null}
            {sugestoes.length ? (
              <ul className="grid gap-1">
                {sugestoes.map((servico) => (
                  <li key={servico.id}>
                    <button
                      type="button"
                      className="hover:bg-muted flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm"
                      onClick={() => {
                        adicionar({
                          servicoId: servico.id,
                          descricao: servico.nome,
                          unidade: unidadeNoOrcamento(servico.unidade),
                          valorUnitario: String(servico.valorBase),
                          desconto: 0,
                        });
                        setBusca("");
                      }}
                    >
                      <span>
                        {servico.nome}
                        <span className="text-muted-foreground ml-2 text-xs">
                          {servico.categoria}
                        </span>
                      </span>
                      <span className="text-muted-foreground shrink-0 text-xs">
                        {servico.valorBase > 0
                          ? `${formatBRL(servico.valorBase)} · ${servico.unidade}`
                          : "sob consulta"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : termo && cardapio.isSuccess ? (
              <p className="text-muted-foreground text-xs">Nenhum item encontrado no cardápio.</p>
            ) : null}
          </div>

          {/* Serviços com valor fechado, no fim do orçamento (garçom, copeira, louças...). */}
          <section className="grid gap-3" aria-labelledby="orcamento-servicos">
            <div>
              <p id="orcamento-servicos" className="text-sm font-semibold">
                Serviços
              </p>
              <p className="text-muted-foreground text-xs">
                Garçom, copeira, louças e outros, com o valor total de cada um.
              </p>
            </div>
            {servicos.length ? (
              <ul className="grid gap-2">
                {servicos.map((servico) => {
                  const semNome = tentouSalvar && servico.descricao.trim().length < 2;
                  return (
                    <li key={servico.chave} className="flex flex-wrap items-start gap-2">
                      <div className="min-w-0 basis-full sm:flex-1 sm:basis-0">
                        <Input
                          aria-label="Nome do serviço"
                          aria-invalid={semNome}
                          placeholder="Ex.: Serviço de garçom"
                          className={cn("max-sm:h-11", classeErro(semNome ? "erro" : undefined))}
                          value={servico.descricao}
                          onChange={(event) =>
                            alterarServico(servico.chave, "descricao", event.target.value)
                          }
                        />
                        {semNome ? (
                          <p className="text-destructive mt-1 text-xs">
                            Informe o nome do serviço.
                          </p>
                        ) : servico.pedido ? (
                          <p className="text-primary mt-1 text-xs font-medium">
                            Pedido pelo cliente
                          </p>
                        ) : null}
                      </div>
                      <div className="relative w-32 shrink-0 max-sm:flex-1">
                        <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                          R$
                        </span>
                        <Input
                          inputMode="decimal"
                          aria-label={`Valor de ${servico.descricao || "serviço"}`}
                          placeholder="0"
                          className="pl-9 max-sm:h-11"
                          value={servico.valor}
                          onChange={(event) =>
                            alterarServico(servico.chave, "valor", event.target.value)
                          }
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 max-sm:size-11"
                        aria-label={`Remover ${servico.descricao || "serviço"}`}
                        onClick={() =>
                          setServicos((atuais) =>
                            atuais.filter((item) => item.chave !== servico.chave),
                          )
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {atalhosServicos.map((nome) => (
                <Button
                  key={nome}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-auto max-w-full py-1.5 text-left whitespace-normal max-sm:min-h-11"
                  onClick={() => adicionarServico(nome)}
                >
                  <Plus className="size-4 shrink-0" /> {nome}
                </Button>
              ))}
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="max-sm:min-h-11"
                onClick={() => adicionarServico("")}
              >
                <Plus className="size-4" /> Outro serviço
              </Button>
            </div>
          </section>

          {itemDoContratoJunto ? (
            <p
              role="alert"
              className="bg-warning/10 ring-warning/30 flex items-start gap-2 rounded-xl p-3 text-sm ring-1"
            >
              <TriangleAlert className="text-warning-foreground mt-0.5 size-4 shrink-0" />
              <span>
                <strong>Remova o item “{ITEM_VALOR_DO_CONTRATO}”.</strong> Ele já contém o valor
                inteiro: mantido junto dos itens detalhados, o total é contado duas vezes.
              </span>
            </p>
          ) : null}
          {valorEmParcelas > 0 ? (
            <p className="text-muted-foreground text-xs">
              Este evento tem {formatBRL(valorEmParcelas)} em parcelas. Se o total mudar, as
              parcelas não mudam sozinhas: a tela do evento vai mostrar a diferença.
            </p>
          ) : null}

          {/* Rodapé fixo: subtotal e botões sempre à vista, mesmo com muitos itens. */}
          <DialogFooter className="bg-background border-border sticky flex-col -bottom-6 -mx-6 -mb-6 items-center gap-3 border-t px-6 py-3 sm:justify-between">
            <p className="flex gap-2 text-sm max-sm:w-full max-sm:justify-between">
              <span className="text-muted-foreground">Subtotal dos itens</span>
              <strong>{formatBRL(subtotal)}</strong>
            </p>
            <div className="flex gap-2 max-sm:grid max-sm:w-full max-sm:grid-cols-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={salvando}>
                {salvando ? "Salvando…" : "Salvar orçamento"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
