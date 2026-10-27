import { useEffect, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Search, Trash2 } from "lucide-react";
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
import { normalizarBusca } from "@/features/orcamentos/formulario-publico";
import { atualizarItensOrcamento } from "@/features/orcamentos/server-functions";
import { listServicos } from "@/features/servicos/server-functions";
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

function paraLinhas(itens: ItemOrcamento[]): Linha[] {
  return itens.map((item) => ({
    chave: item.id,
    servicoId: item.servicoId,
    descricao: item.descricao,
    quantidade: String(Number(item.quantidade)),
    unidade: item.unidade,
    valorUnitario: String(Number(item.valorUnitario)),
    desconto: Number(item.desconto),
  }));
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

export function EditarOrcamentoDialog({
  aberto,
  onOpenChange,
  orcamento,
  convidados,
}: {
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
  orcamento: { id: string; itens: ItemOrcamento[] };
  convidados: number;
}) {
  const router = useRouter();
  const salvar = useServerFn(atualizarItensOrcamento);
  const [linhas, setLinhas] = useState<Linha[]>(() => paraLinhas(orcamento.itens));
  const [busca, setBusca] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [tentouSalvar, setTentouSalvar] = useState(false);
  const cardapio = useQuery({ queryKey: ["servicos"], queryFn: listServicos, enabled: aberto });

  useEffect(() => {
    if (aberto) {
      setLinhas(paraLinhas(orcamento.itens));
      setBusca("");
      setTentouSalvar(false);
    }
  }, [aberto, orcamento.itens]);

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
  const subtotal = linhas.reduce((soma, linha) => soma + totalLinha(linha), 0);
  const errosPorLinha = new Map(linhas.map((linha) => [linha.chave, validarLinha(linha)]));
  const quantidadeErros = [...errosPorLinha.values()].filter((e) => Object.keys(e).length).length;

  function alterar(chave: string, campo: keyof ErrosLinha, valor: string) {
    const limpo =
      campo === "quantidade" || campo === "valorUnitario" ? limparNumeroDigitado(valor) : valor;
    setLinhas((atuais) =>
      atuais.map((linha) => (linha.chave === chave ? { ...linha, [campo]: limpo } : linha)),
    );
  }

  function adicionar(linha: Omit<Linha, "chave">) {
    setLinhas((atuais) => [...atuais, { ...linha, chave: crypto.randomUUID() }]);
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
    if (subtotal < 0) {
      toast.error("O total dos itens não pode ser negativo.");
      return;
    }
    setSalvando(true);
    try {
      await salvar({
        data: {
          id: orcamento.id,
          itens: linhas.map((linha) => ({
            servicoId: linha.servicoId,
            descricao: linha.descricao.trim(),
            quantidade: lerNumero(linha.quantidade),
            unidade: linha.unidade.trim(),
            valorUnitario: lerNumero(linha.valorUnitario),
            desconto: linha.desconto,
          })),
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
            <DialogDescription>
              Tire, adicione ou altere itens. O desconto combinado é mantido e o total recalculado.
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
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
                      <td className="py-2 pr-2">
                        <Input
                          aria-label="Unidade"
                          aria-invalid={Boolean(tentouSalvar && erros.unidade)}
                          className={cn("w-28", classeErro(erros.unidade))}
                          value={linha.unidade}
                          onChange={(event) => alterar(linha.chave, "unidade", event.target.value)}
                        />
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
                    quantidade: "1",
                    unidade: "por evento",
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
                          quantidade: String(
                            servico.unidade.toLowerCase().includes("pessoa") ? convidados : 1,
                          ),
                          unidade: servico.unidade,
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

          <p className="text-right text-sm">
            Subtotal dos itens: <strong>{formatBRL(subtotal)}</strong>
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando}>
              {salvando ? "Salvando…" : "Salvar orçamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
