import { type FormEvent, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { ListaArrastavel } from "@/components/lista-arrastavel";
import { ErrorState, LoadingState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  criarCardapio,
  excluirCardapio,
  excluirFormato,
  renomearCardapio,
  reordenarCardapios,
  reordenarFormatos,
  salvarFormato,
  type CardapioPublico,
  type FormatoServico,
} from "@/features/servicos/cardapios-formatos";
import type { Servico } from "@/features/servicos/server-functions";
import {
  CHAVE_CARDAPIOS_FORMATOS,
  useCardapiosEFormatos,
  type AbaCardapiosFormatos,
} from "@/features/servicos/use-cardapios-formatos";
import { useConfirmar } from "@/lib/confirmacao";

const mensagem = (error: unknown, padrao: string) =>
  error instanceof Error ? error.message : padrao;

/**
 * Painel onde a equipe define como o cliente navega no formulário de orçamento:
 * ele escolhe um FORMATO e vê primeiro os CARDÁPIOS ligados a esse formato.
 */
export function CardapiosFormatosDialog({
  aberto,
  onOpenChange,
  abaInicial = "formatos",
  itens,
}: {
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
  abaInicial?: AbaCardapiosFormatos;
  /** Itens do cardápio, para mostrar quantos estão em cada cardápio. */
  itens: Servico[];
}) {
  const dados = useCardapiosEFormatos();
  const [aba, setAba] = useState<AbaCardapiosFormatos>(abaInicial);
  const [aberturaAnterior, setAberturaAnterior] = useState(false);
  if (aberto !== aberturaAnterior) {
    setAberturaAnterior(aberto);
    if (aberto) setAba(abaInicial);
  }

  const cardapios = dados.data?.cardapios ?? [];
  const formatos = dados.data?.formatos ?? [];

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cardápios e formatos</DialogTitle>
          <DialogDescription>
            Defina como o cliente monta o pedido no formulário de orçamento.
          </DialogDescription>
        </DialogHeader>

        <ol className="bg-surface text-muted-foreground grid gap-2 rounded-xl p-4 text-xs ring-1 ring-black/5 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center">
          <li>
            <strong className="text-foreground block">1. Formato</strong>O cliente responde “Qual
            formato deseja servir?”
          </li>
          <li aria-hidden className="hidden sm:block">
            <ArrowRight className="text-primary size-4" />
          </li>
          <li>
            <strong className="text-foreground block">2. Cardápios</strong>O formato abre os
            cardápios ligados a ele.
          </li>
          <li aria-hidden className="hidden sm:block">
            <ArrowRight className="text-primary size-4" />
          </li>
          <li>
            <strong className="text-foreground block">3. Itens</strong>Cada item aparece nos
            cardápios marcados nele.
          </li>
        </ol>

        {dados.isPending ? (
          <LoadingState label="Carregando…" />
        ) : dados.isError ? (
          <ErrorState onRetry={() => void dados.refetch()} />
        ) : (
          <Tabs value={aba} onValueChange={(valor) => setAba(valor as AbaCardapiosFormatos)}>
            <TabsList className="w-full">
              <TabsTrigger value="formatos" className="flex-1">
                Formatos ({formatos.length})
              </TabsTrigger>
              <TabsTrigger value="cardapios" className="flex-1">
                Cardápios ({cardapios.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="formatos" className="mt-4">
              <AbaFormatos formatos={formatos} cardapios={cardapios} />
            </TabsContent>
            <TabsContent value="cardapios" className="mt-4">
              <AbaCardapios cardapios={cardapios} formatos={formatos} itens={itens} />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

function useAtualizar() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: CHAVE_CARDAPIOS_FORMATOS }),
      queryClient.invalidateQueries({ queryKey: ["servicos"] }),
    ]);
}

/* ------------------------------- Formatos -------------------------------- */

function AbaFormatos({
  formatos,
  cardapios,
}: {
  formatos: FormatoServico[];
  cardapios: CardapioPublico[];
}) {
  const atualizar = useAtualizar();
  const confirmar = useConfirmar();
  const reordenar = useServerFn(reordenarFormatos);
  const excluir = useServerFn(excluirFormato);
  // null: nenhum em edição; "novo": formulário de criação no topo.
  const [editando, setEditando] = useState<string | "novo" | null>(null);

  async function remover(formato: FormatoServico) {
    const ok = await confirmar({
      titulo: `Excluir o formato “${formato.nome}”?`,
      descricao:
        "Ele deixa de aparecer no formulário. Eventos já registrados com este formato não mudam.",
      textoConfirmar: "Excluir formato",
      perigoso: true,
    });
    if (!ok) return;
    try {
      await excluir({ data: { id: formato.id } });
      toast.success("Formato excluído.");
      await atualizar();
    } catch (error) {
      toast.error(mensagem(error, "Não foi possível excluir o formato."));
    }
  }

  async function aoReordenar(ids: string[]) {
    try {
      await reordenar({ data: { ids } });
      await atualizar();
    } catch (error) {
      toast.error("Não foi possível reorganizar os formatos.");
      throw error;
    }
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">
          Opções da pergunta “Qual formato deseja servir?”, na ordem em que aparecem.
        </p>
        {editando === "novo" ? null : (
          <Button type="button" size="sm" onClick={() => setEditando("novo")}>
            <Plus className="size-4" /> Novo formato
          </Button>
        )}
      </div>
      {editando === "novo" ? (
        <EditorFormato
          cardapios={cardapios}
          onFechar={() => setEditando(null)}
          onSalvo={atualizar}
        />
      ) : null}
      <ListaArrastavel
        itens={formatos}
        onReordenar={aoReordenar}
        desativado={editando !== null}
        rotuloDoItem={(formato) => `o formato ${formato.nome}`}
        className="grid gap-2"
      >
        {(formato, alca) =>
          editando === formato.id ? (
            <EditorFormato
              formato={formato}
              cardapios={cardapios}
              onFechar={() => setEditando(null)}
              onSalvo={atualizar}
            />
          ) : (
            <div className="bg-surface flex items-start gap-2 rounded-xl p-3 ring-1 ring-black/5">
              {alca}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{formato.nome}</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {formato.cardapios.length ? (
                    formato.cardapios.map((nome) => (
                      <span
                        key={nome}
                        className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[11px]"
                      >
                        {nome}
                      </span>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-[11px]">
                      Mostra todos os cardápios
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  aria-label={`Editar o formato ${formato.nome}`}
                  title="Editar"
                  disabled={editando !== null}
                  onClick={() => setEditando(formato.id)}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  aria-label={`Excluir o formato ${formato.nome}`}
                  title="Excluir"
                  disabled={editando !== null || formatos.length <= 1}
                  onClick={() => void remover(formato)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          )
        }
      </ListaArrastavel>
    </div>
  );
}

function EditorFormato({
  formato,
  cardapios,
  onFechar,
  onSalvo,
}: {
  formato?: FormatoServico;
  cardapios: CardapioPublico[];
  onFechar: () => void;
  onSalvo: () => Promise<unknown>;
}) {
  const salvar = useServerFn(salvarFormato);
  const [nome, setNome] = useState(formato?.nome ?? "");
  const [marcados, setMarcados] = useState<string[]>(formato?.cardapios ?? []);
  const [salvando, setSalvando] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (nome.trim().length < 2) {
      toast.error("Informe o nome do formato.");
      return;
    }
    setSalvando(true);
    try {
      // Mantém a ordem dos cardápios, não a ordem em que foram marcados.
      const ordenados = cardapios.map((c) => c.nome).filter((n) => marcados.includes(n));
      await salvar({ data: { id: formato?.id, nome: nome.trim(), cardapios: ordenados } });
      toast.success(formato ? "Formato atualizado." : "Formato criado.");
      onFechar();
      await onSalvo();
    } catch (error) {
      toast.error(mensagem(error, "Não foi possível salvar o formato."));
    } finally {
      setSalvando(false);
    }
  }

  const idNome = `formato-nome-${formato?.id ?? "novo"}`;
  return (
    <form
      onSubmit={submit}
      className="bg-primary/5 ring-primary/30 grid gap-3 rounded-xl p-4 ring-1"
    >
      <div className="grid gap-1.5">
        <Label htmlFor={idNome}>{formato ? "Nome do formato" : "Novo formato"}</Label>
        <Input
          id={idNome}
          autoFocus
          required
          minLength={2}
          maxLength={100}
          placeholder="Ex.: Churrasco"
          value={nome}
          onChange={(event) => setNome(event.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <div>
          <Label>Cardápios que este formato mostra</Label>
          <p className="text-muted-foreground text-xs">
            Sem seleção, o cliente vê todos os cardápios.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {cardapios.map((cardapio) => (
            <label key={cardapio.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={marcados.includes(cardapio.nome)}
                onCheckedChange={(checked) =>
                  setMarcados((atuais) =>
                    checked === true
                      ? [...atuais, cardapio.nome]
                      : atuais.filter((nomeAtual) => nomeAtual !== cardapio.nome),
                  )
                }
              />
              {cardapio.nome}
            </label>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="outline" onClick={onFechar} disabled={salvando}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={salvando}>
          {salvando ? "Salvando…" : "Salvar formato"}
        </Button>
      </div>
    </form>
  );
}

/* ------------------------------- Cardápios ------------------------------- */

function AbaCardapios({
  cardapios,
  formatos,
  itens,
}: {
  cardapios: CardapioPublico[];
  formatos: FormatoServico[];
  itens: Servico[];
}) {
  const atualizar = useAtualizar();
  const confirmar = useConfirmar();
  const criar = useServerFn(criarCardapio);
  const renomear = useServerFn(renomearCardapio);
  const excluir = useServerFn(excluirCardapio);
  const reordenar = useServerFn(reordenarCardapios);
  const [novo, setNovo] = useState("");
  const [editando, setEditando] = useState<{ id: string; nome: string } | null>(null);
  const [salvando, setSalvando] = useState(false);

  const itensEm = (nome: string) => itens.filter((item) => item.cardapios.includes(nome)).length;
  const formatosCom = (nome: string) =>
    formatos.filter((formato) => formato.cardapios.includes(nome)).length;

  async function executar(acao: () => Promise<unknown>, sucesso: string, erro: string) {
    setSalvando(true);
    try {
      await acao();
      toast.success(sucesso);
      await atualizar();
      return true;
    } catch (error) {
      toast.error(mensagem(error, erro));
      return false;
    } finally {
      setSalvando(false);
    }
  }

  async function adicionar(event: FormEvent) {
    event.preventDefault();
    if (novo.trim().length < 2) {
      toast.error("Informe o nome do cardápio.");
      return;
    }
    const ok = await executar(
      () => criar({ data: { nome: novo.trim() } }),
      "Cardápio criado. Marque-o nos itens e nos formatos.",
      "Não foi possível criar o cardápio.",
    );
    if (ok) setNovo("");
  }

  async function salvarNome(event: FormEvent) {
    event.preventDefault();
    if (!editando) return;
    const ok = await executar(
      () => renomear({ data: { id: editando.id, nome: editando.nome.trim() } }),
      "Cardápio renomeado.",
      "Não foi possível renomear o cardápio.",
    );
    if (ok) setEditando(null);
  }

  async function remover(cardapio: CardapioPublico) {
    const quantidade = itensEm(cardapio.nome);
    const ok = await confirmar({
      titulo: `Excluir o cardápio “${cardapio.nome}”?`,
      descricao: quantidade
        ? `${quantidade} item(ns) deixam de aparecer neste cardápio do formulário. Os itens continuam cadastrados.`
        : "Ele deixa de aparecer no formulário de orçamento.",
      textoConfirmar: "Excluir cardápio",
      perigoso: true,
    });
    if (!ok) return;
    await executar(
      () => excluir({ data: { id: cardapio.id } }),
      "Cardápio excluído.",
      "Não foi possível excluir o cardápio.",
    );
  }

  async function aoReordenar(ids: string[]) {
    try {
      await reordenar({ data: { ids } });
      await atualizar();
    } catch (error) {
      toast.error("Não foi possível reorganizar os cardápios.");
      throw error;
    }
  }

  return (
    <div className="grid gap-3">
      <p className="text-muted-foreground text-xs">
        Abas do formulário onde o cliente escolhe os pratos, na ordem em que aparecem.
      </p>
      <form onSubmit={adicionar} className="flex gap-2">
        <Input
          aria-label="Nome do novo cardápio"
          placeholder="Novo cardápio, ex.: Churrasco"
          maxLength={80}
          value={novo}
          onChange={(event) => setNovo(event.target.value)}
        />
        <Button type="submit" disabled={salvando || novo.trim().length < 2}>
          <Plus className="size-4" /> Adicionar
        </Button>
      </form>
      <ListaArrastavel
        itens={cardapios}
        onReordenar={aoReordenar}
        desativado={editando !== null}
        rotuloDoItem={(cardapio) => `o cardápio ${cardapio.nome}`}
        className="grid gap-2"
      >
        {(cardapio, alca) => (
          <div className="bg-surface flex items-center gap-2 rounded-xl p-3 ring-1 ring-black/5">
            {alca}
            {editando?.id === cardapio.id ? (
              <form onSubmit={salvarNome} className="flex flex-1 items-center gap-1">
                <Input
                  autoFocus
                  aria-label={`Novo nome para ${cardapio.nome}`}
                  minLength={2}
                  maxLength={80}
                  value={editando.nome}
                  onChange={(event) => setEditando({ id: cardapio.id, nome: event.target.value })}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.stopPropagation();
                      setEditando(null);
                    }
                  }}
                />
                <Button type="submit" size="sm" aria-label="Salvar nome" disabled={salvando}>
                  <Check className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  aria-label="Cancelar"
                  onClick={() => setEditando(null)}
                >
                  <X className="size-4" />
                </Button>
              </form>
            ) : (
              <>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{cardapio.nome}</p>
                  <p className="text-muted-foreground text-[11px]">
                    {itensEm(cardapio.nome)} item(ns) · em {formatosCom(cardapio.nome)} formato(s)
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    aria-label={`Renomear o cardápio ${cardapio.nome}`}
                    title="Renomear"
                    disabled={salvando}
                    onClick={() => setEditando({ id: cardapio.id, nome: cardapio.nome })}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    aria-label={`Excluir o cardápio ${cardapio.nome}`}
                    title="Excluir"
                    disabled={salvando}
                    onClick={() => void remover(cardapio)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </ListaArrastavel>
      {!cardapios.length ? (
        <p className="text-muted-foreground text-sm">
          Nenhum cardápio ainda. Sem cardápios, o formulário não mostra itens.
        </p>
      ) : null}
    </div>
  );
}
