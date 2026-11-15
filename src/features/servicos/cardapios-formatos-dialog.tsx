import { type FormEvent, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Check, ListChecks, Pencil, Plus, Search, Trash2, X } from "lucide-react";
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
import {
  criarCardapio,
  definirItensDoCardapio,
  excluirCardapio,
  excluirFormato,
  renomearCardapio,
  reordenarCardapios,
  reordenarFormatos,
  salvarFormato,
  type CardapioPublico,
  type FormatoServico,
} from "@/features/servicos/cardapios-formatos";
import { normalizarBusca } from "@/features/orcamentos/formulario-publico";
import { alteracoesDoCardapio, contagem } from "@/features/servicos/regras-cardapio";
import type { Servico } from "@/features/servicos/server-functions";
import {
  CHAVE_CARDAPIOS_FORMATOS,
  useCardapiosEFormatos,
  type AbaCardapiosFormatos,
} from "@/features/servicos/use-cardapios-formatos";
import { useConfirmar } from "@/lib/confirmacao";
import { cn } from "@/lib/utils";

const mensagem = (error: unknown, padrao: string) =>
  error instanceof Error ? error.message : padrao;

/** Conteúdo das abas Cardápios e Formatos, exibido diretamente na página do cardápio. */
export function CardapiosFormatosPainel({
  aba,
  itens,
}: {
  aba: AbaCardapiosFormatos;
  itens: Servico[];
}) {
  const dados = useCardapiosEFormatos();
  const cardapios = dados.data?.cardapios ?? [];
  const formatos = dados.data?.formatos ?? [];

  if (dados.isPending) return <LoadingState label="Carregando…" />;
  if (dados.isError) return <ErrorState onRetry={() => void dados.refetch()} />;
  if (aba === "cardapios") {
    return <AbaCardapios cardapios={cardapios} formatos={formatos} itens={itens} />;
  }
  return <AbaFormatos formatos={formatos} cardapios={cardapios} />;
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
  const [busca, setBusca] = useState("");
  const termoBusca = normalizarBusca(busca);
  const formatosVisiveis = termoBusca
    ? formatos.filter((formato) => normalizarBusca(formato.nome).includes(termoBusca))
    : formatos;

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
      <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold">Formatos de serviço</h2>
        </div>
        {editando === "novo" ? null : (
          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={() => {
              setBusca("");
              setEditando("novo");
            }}
          >
            <Plus className="size-4" /> Novo formato
          </Button>
        )}
      </div>
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          aria-label="Pesquisar formatos"
          placeholder="Pesquisar formato"
          className="pl-9"
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
        />
      </div>
      {editando === "novo" ? (
        <EditorFormato
          cardapios={cardapios}
          onFechar={() => setEditando(null)}
          onSalvo={atualizar}
        />
      ) : null}
      <ListaArrastavel
        itens={formatosVisiveis}
        onReordenar={aoReordenar}
        desativado={editando !== null || Boolean(termoBusca)}
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
      {formatos.length && !formatosVisiveis.length ? (
        <p className="text-muted-foreground py-6 text-center text-sm">
          Nenhum formato encontrado para “{busca.trim()}”.
        </p>
      ) : null}
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
          <p className="text-sm font-medium" id={`${idNome}-cardapios`}>
            Cardápios que este formato abre
          </p>
          <p className="text-muted-foreground text-xs">
            Toque para marcar. Sem nenhum marcado, o cliente vê todos os cardápios.
          </p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-labelledby={`${idNome}-cardapios`}>
          {cardapios.map((cardapio) => {
            const marcado = marcados.includes(cardapio.nome);
            return (
              <button
                key={cardapio.id}
                type="button"
                aria-pressed={marcado}
                onClick={() =>
                  setMarcados((atuais) =>
                    marcado
                      ? atuais.filter((nomeAtual) => nomeAtual !== cardapio.nome)
                      : [...atuais, cardapio.nome],
                  )
                }
                className={cn(
                  "inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ring-1 transition-colors",
                  marcado
                    ? "bg-primary text-primary-foreground ring-primary"
                    : "bg-surface ring-input hover:bg-secondary",
                )}
              >
                {marcado ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
                {cardapio.nome}
              </button>
            );
          })}
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
  const [busca, setBusca] = useState("");
  const [novo, setNovo] = useState("");
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState<{ id: string; nome: string } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [escolhendoItensDe, setEscolhendoItensDe] = useState<CardapioPublico | null>(null);

  const itensEm = (nome: string) => itens.filter((item) => item.cardapios.includes(nome)).length;
  const formatosCom = (nome: string) =>
    formatos.filter((formato) => formato.cardapios.includes(nome)).map((formato) => formato.nome);
  const termoBusca = normalizarBusca(busca);
  const cardapiosVisiveis = termoBusca
    ? cardapios.filter((cardapio) => normalizarBusca(cardapio.nome).includes(termoBusca))
    : cardapios;

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
    let criado: CardapioPublico | null = null;
    const ok = await executar(
      async () => {
        criado = await criar({ data: { nome: novo.trim() } });
      },
      "Cardápio criado. Agora marque os itens dele.",
      "Não foi possível criar o cardápio.",
    );
    if (!ok) return;
    setNovo("");
    setCriando(false);
    // Cardápio novo começa vazio: já abre a lista para montá-lo.
    if (criado) setEscolhendoItensDe(criado);
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
        ? `${contagem(quantidade, "item deixa", "itens deixam")} de aparecer neste cardápio do formulário. Os itens continuam cadastrados.`
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
      <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold">Cardápios do formulário</h2>
        </div>
        {criando ? null : (
          <Button
            type="button"
            className="w-full sm:w-auto"
            disabled={salvando}
            onClick={() => {
              setBusca("");
              setCriando(true);
            }}
          >
            <Plus className="size-4" /> Novo cardápio
          </Button>
        )}
      </div>
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          aria-label="Pesquisar cardápios"
          placeholder="Pesquisar cardápio"
          className="pl-9"
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
        />
      </div>
      {criando ? (
        <form
          onSubmit={adicionar}
          className="bg-secondary/50 flex flex-col gap-2 rounded-xl p-3 ring-1 ring-black/5 sm:flex-row"
        >
          <Input
            autoFocus
            aria-label="Nome do novo cardápio"
            placeholder="Nome do cardápio, ex.: Churrasco"
            maxLength={80}
            value={novo}
            onChange={(event) => setNovo(event.target.value)}
          />
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setNovo("");
                setCriando(false);
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando}>
              {salvando ? "Criando…" : "Criar cardápio"}
            </Button>
          </div>
        </form>
      ) : null}
      <ListaArrastavel
        itens={cardapiosVisiveis}
        onReordenar={aoReordenar}
        desativado={editando !== null || Boolean(termoBusca) || criando}
        rotuloDoItem={(cardapio) => `o cardápio ${cardapio.nome}`}
        className="grid gap-2"
      >
        {(cardapio, alca) => (
          <div className="bg-surface flex flex-wrap items-center gap-x-2 gap-y-3 rounded-xl p-3 ring-1 ring-black/5">
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
                <ResumoCardapio
                  nome={cardapio.nome}
                  quantidadeItens={itensEm(cardapio.nome)}
                  formatos={formatosCom(cardapio.nome)}
                />
                <div className="flex shrink-0 gap-1 max-sm:w-full max-sm:justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    aria-label={`Escolher os itens do cardápio ${cardapio.nome}`}
                    title="Escolher itens"
                    disabled={salvando}
                    onClick={() => setEscolhendoItensDe(cardapio)}
                  >
                    <ListChecks className="size-4" />
                    <span>Escolher itens</span>
                  </Button>
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
      {cardapios.length && !cardapiosVisiveis.length ? (
        <p className="text-muted-foreground py-6 text-center text-sm">
          Nenhum cardápio encontrado para “{busca.trim()}”.
        </p>
      ) : null}
      {escolhendoItensDe ? (
        <EscolherItensDialog
          cardapio={escolhendoItensDe}
          itens={itens}
          onFechar={() => setEscolhendoItensDe(null)}
        />
      ) : null}
    </div>
  );
}

/**
 * Nome do cardápio, quantos itens tem e quais formatos o abrem, com alerta quando ele está
 * vazio ou quando nenhum formato o abre (aí o cliente quase não o encontra).
 */
function ResumoCardapio({
  nome,
  quantidadeItens,
  formatos,
}: {
  nome: string;
  quantidadeItens: number;
  formatos: string[];
}) {
  return (
    <div className="min-w-0 flex-1 basis-48">
      <p className="text-sm font-medium">{nome}</p>
      <p className="text-muted-foreground text-xs">
        {contagem(quantidadeItens, "item", "itens")}
        {formatos.length ? ` — aberto por ${formatos.join(", ")}` : ""}
      </p>
      {quantidadeItens === 0 || !formatos.length ? (
        <p className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
          <AlertTriangle className="size-3.5 shrink-0" />
          {quantidadeItens === 0
            ? "Vazio: use “Escolher itens” para montá-lo."
            : "Nenhum formato abre este cardápio. Ligue-o a um formato na aba Formatos."}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Monta um cardápio marcando os itens que já existem, numa tela só, em vez de abrir e editar
 * item por item. Os outros cardápios de cada item continuam como estão.
 */
function EscolherItensDialog({
  cardapio,
  itens,
  onFechar,
}: {
  cardapio: CardapioPublico;
  itens: Servico[];
  onFechar: () => void;
}) {
  const atualizar = useAtualizar();
  const definir = useServerFn(definirItensDoCardapio);
  const [busca, setBusca] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [marcados, setMarcados] = useState<Set<string>>(
    () => new Set(itens.filter((item) => item.cardapios.includes(cardapio.nome)).map((i) => i.id)),
  );

  const termo = normalizarBusca(busca.trim());
  const visiveis = itens
    .filter((item) => !termo || normalizarBusca(`${item.nome} ${item.categoria}`).includes(termo))
    .sort(
      (a, b) =>
        a.categoria.localeCompare(b.categoria, "pt-BR") || a.nome.localeCompare(b.nome, "pt-BR"),
    );
  const categorias = [...new Set(visiveis.map((item) => item.categoria))];
  const { adicionar, remover } = alteracoesDoCardapio(itens, cardapio.nome, [...marcados]);

  function alternar(id: string, marcado: boolean) {
    setMarcados((atuais) => {
      const proximos = new Set(atuais);
      if (marcado) proximos.add(id);
      else proximos.delete(id);
      return proximos;
    });
  }

  async function salvar() {
    if (!adicionar.length && !remover.length) return onFechar();
    setSalvando(true);
    try {
      await definir({ data: { id: cardapio.id, servicoIds: [...marcados] } });
      await atualizar();
      const partes = [
        adicionar.length ? `${adicionar.length} incluído(s)` : "",
        remover.length ? `${remover.length} retirado(s)` : "",
      ].filter(Boolean);
      toast.success(`Cardápio “${cardapio.nome}” atualizado: ${partes.join(" e ")}.`);
      onFechar();
    } catch (error) {
      toast.error(mensagem(error, "Não foi possível salvar os itens do cardápio."));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open onOpenChange={(aberto) => (aberto ? null : onFechar())}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-xl">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle>Itens do cardápio “{cardapio.nome}”</DialogTitle>
          <DialogDescription>
            Marque os itens que o cliente vê neste cardápio. Cada item continua com um cadastro só e
            pode estar em vários cardápios.
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            aria-label="Buscar item"
            placeholder="Buscar item ou categoria"
            className="pl-9"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
          />
        </div>
        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
          {categorias.length ? (
            categorias.map((categoria) => (
              <section key={categoria} className="py-2">
                <h3 className="text-muted-foreground py-1 text-xs font-semibold">{categoria}</h3>
                <ul className="grid gap-0.5">
                  {visiveis
                    .filter((item) => item.categoria === categoria)
                    .map((item) => (
                      <li key={item.id}>
                        <label className="hover:bg-secondary flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm">
                          <Checkbox
                            checked={marcados.has(item.id)}
                            onCheckedChange={(checked) => alternar(item.id, checked === true)}
                          />
                          <span className="min-w-0 flex-1">
                            {item.nome}
                            {item.status === "Inativo" ? (
                              <span className="text-muted-foreground"> (inativo)</span>
                            ) : null}
                          </span>
                        </label>
                      </li>
                    ))}
                </ul>
              </section>
            ))
          ) : (
            <p className="text-muted-foreground py-6 text-center text-sm">
              Nenhum item encontrado. Cadastre o item no Cardápio e volte aqui.
            </p>
          )}
        </div>
        <div className="border-border flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          <p className="text-muted-foreground text-sm">
            {marcados.size} {marcados.size === 1 ? "item marcado" : "itens marcados"}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onFechar} disabled={salvando}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void salvar()} disabled={salvando}>
              {salvando ? "Salvando…" : "Salvar itens"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
