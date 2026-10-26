import { type ChangeEvent, type FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  FolderPlus,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader, Panel } from "@/components/panel";
import { SeletorImagem } from "@/components/seletor-imagem";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import { normalizarBusca } from "@/features/orcamentos/formulario-publico";
import {
  createServico,
  criarCategoria,
  deleteServico,
  excluirCategoria,
  listarCategorias,
  listServicos,
  renomearCategoria,
  reordenarCategorias,
  reorderServicos,
  updateServico,
  type CreateServicoInput,
  type Servico,
  type ServicoStatus,
} from "@/features/servicos/server-functions";
import { uploadImagem } from "@/features/uploads/server-functions";
import { CARDAPIOS, TIPOS_EVENTO, type TipoEvento } from "@/lib/catalogo";
import { useConfirmar } from "@/lib/confirmacao";
import { formatBRL } from "@/lib/format";
import { pageMeta } from "@/lib/meta";
import { limparNumeroDigitado } from "@/lib/numero";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/servicos")({
  head: () => pageMeta("Cardápio", "Organize o cardápio por categorias e as sugestões do chefe."),
  component: CardapioPage,
});

type Secao = "cardapio" | "chef";
type Categoria = { id: string; nome: string; ordem: number };
const TODOS = "todos";

function novoItem(sugestaoChef: boolean, categoria: string, ordem = 0): CreateServicoInput {
  return {
    nome: "",
    categoria,
    tiposEvento: [],
    cardapios: [],
    descricao: "",
    imagemUrl: "",
    valorBase: 0,
    precoVisivel: true,
    ordem,
    sugestaoChef,
    unidade: "por evento",
    status: "Ativo",
    opcoesRotulo: "",
    opcoesIds: [],
  };
}

const ordenar = (a: Servico, b: Servico) =>
  a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR");

function CardapioPage() {
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [cardapioFiltro, setCardapioFiltro] = useState<string>(TODOS);
  const [secao, setSecao] = useState<Secao>("cardapio");
  const [itemAberto, setItemAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateServicoInput>(() => novoItem(false, "Outros"));
  const [categoriaEditada, setCategoriaEditada] = useState<Categoria | "nova" | null>(null);
  const [abertas, setAbertas] = useState<Set<string>>(() => new Set());
  const alternarCategoria = (id: string) =>
    setAbertas((atuais) => {
      const proximas = new Set(atuais);
      if (!proximas.delete(id)) proximas.add(id);
      return proximas;
    });
  const itens = useQuery({ queryKey: ["servicos"], queryFn: listServicos });
  const carregarCategorias = useServerFn(listarCategorias);
  const categorias = useQuery({
    queryKey: ["categorias-cardapio"],
    queryFn: () => carregarCategorias(),
  });
  const reordenar = useServerFn(reordenarCategorias);
  const excluirCat = useServerFn(excluirCategoria);
  const confirmar = useConfirmar();

  const atualizarTudo = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["servicos"] }),
      queryClient.invalidateQueries({ queryKey: ["categorias-cardapio"] }),
    ]);

  const excluirMutation = useMutation({
    mutationFn: deleteServico,
    onSuccess: async (resultado) => {
      await atualizarTudo();
      toast.success(
        resultado.inativado
          ? "Item ocultado para preservar orçamentos existentes."
          : "Item removido com sucesso.",
      );
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível remover o item."),
  });
  const ordenarMutation = useMutation({
    mutationFn: reorderServicos,
    onSuccess: () => atualizarTudo(),
    onError: () => toast.error("Não foi possível reorganizar os itens."),
  });

  const sugestaoChef = secao === "chef";
  const termo = normalizarBusca(busca.trim());
  const visiveis = useMemo(
    () =>
      (itens.data ?? [])
        .filter((item) => item.sugestaoChef === sugestaoChef)
        .filter(
          (item) =>
            sugestaoChef ||
            cardapioFiltro === TODOS ||
            item.cardapios.includes(cardapioFiltro as Servico["cardapios"][number]),
        )
        .filter((item) =>
          termo
            ? normalizarBusca(`${item.nome} ${item.categoria} ${item.descricao}`).includes(termo)
            : true,
        )
        .sort(ordenar),
    [itens.data, sugestaoChef, cardapioFiltro, termo],
  );
  const listaCategorias = categorias.data ?? [];
  const nomesCategorias = listaCategorias.map((categoria) => categoria.nome);

  function abrirNovo(categoria = nomesCategorias[0] ?? "Outros") {
    const maiorOrdem = Math.max(-1, ...(itens.data ?? []).map((item) => item.ordem));
    setEditandoId(null);
    setForm(novoItem(sugestaoChef, sugestaoChef ? "Outros" : categoria, maiorOrdem + 1));
    setItemAberto(true);
  }

  function abrirEdicao(item: Servico) {
    setEditandoId(item.id);
    const { id: _id, ...dados } = item;
    setForm(dados);
    setItemAberto(true);
  }

  async function remover(item: Servico) {
    const ok = await confirmar({
      titulo: `Remover “${item.nome}”?`,
      descricao: "O item sai do cardápio. Orçamentos já registrados com ele continuam preservados.",
      textoConfirmar: "Remover item",
      perigoso: true,
    });
    if (ok) excluirMutation.mutate(item.id);
  }

  /** Troca o item de posição com o vizinho dentro da mesma lista, preservando a ordem do resto. */
  function mover(lista: Servico[], indice: number, deslocamento: -1 | 1) {
    const atual = lista[indice];
    const vizinho = lista[indice + deslocamento];
    if (!atual || !vizinho) return;
    const ids = (itens.data ?? [])
      .filter((item) => item.sugestaoChef === sugestaoChef)
      .sort(ordenar)
      .map((item) => item.id);
    const origem = ids.indexOf(atual.id);
    const destino = ids.indexOf(vizinho.id);
    [ids[origem], ids[destino]] = [ids[destino]!, ids[origem]!];
    ordenarMutation.mutate(ids);
  }

  async function moverCategoria(indice: number, deslocamento: -1 | 1) {
    const ids = listaCategorias.map((categoria) => categoria.id);
    const destino = indice + deslocamento;
    if (!ids[destino]) return;
    [ids[indice], ids[destino]] = [ids[destino]!, ids[indice]!];
    try {
      await reordenar({ data: { ids } });
      await atualizarTudo();
    } catch {
      toast.error("Não foi possível reorganizar as categorias.");
    }
  }

  async function removerCategoria(categoria: Categoria) {
    const ok = await confirmar({
      titulo: `Excluir a categoria “${categoria.nome}”?`,
      descricao: "A categoria deixa de aparecer no cardápio e no formulário de orçamento.",
      textoConfirmar: "Excluir categoria",
      perigoso: true,
    });
    if (!ok) return;
    try {
      await excluirCat({ data: { id: categoria.id } });
      toast.success("Categoria excluída.");
      await atualizarTudo();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível excluir.");
    }
  }

  function linhasDoItem(lista: Servico[]) {
    return lista.map((item, indice) => (
      <ItemLinha
        key={item.id}
        item={item}
        primeiro={indice === 0}
        ultimo={indice === lista.length - 1}
        ocupado={ordenarMutation.isPending || excluirMutation.isPending}
        onMover={(deslocamento) => mover(lista, indice, deslocamento)}
        onEditar={() => abrirEdicao(item)}
        onRemover={() => void remover(item)}
      />
    ));
  }

  const carregando = itens.isPending || categorias.isPending;
  const erro = itens.isError || categorias.isError;
  // Itens com categoria sem cadastro (ex.: criada fora desta tela) não podem sumir da lista.
  const semCategoria = visiveis.filter((item) => !nomesCategorias.includes(item.categoria));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Cardápio"
        subtitle="Organize os itens por categoria e configure a Sugestão do Chefe"
        actions={
          <>
            {sugestaoChef ? null : (
              <Button variant="outline" onClick={() => setCategoriaEditada("nova")}>
                <FolderPlus className="size-4" /> Nova categoria
              </Button>
            )}
            <Button onClick={() => abrirNovo()}>
              <Plus className="size-4" />
              {sugestaoChef ? "Nova sugestão" : "Novo item"}
            </Button>
          </>
        }
      />

      <div className="flex gap-2" role="tablist" aria-label="Áreas do cardápio">
        <Button
          type="button"
          role="tab"
          aria-selected={secao === "cardapio"}
          variant={secao === "cardapio" ? "default" : "outline"}
          onClick={() => setSecao("cardapio")}
        >
          Itens do cardápio
        </Button>
        <Button
          type="button"
          role="tab"
          aria-selected={secao === "chef"}
          variant={secao === "chef" ? "default" : "outline"}
          onClick={() => setSecao("chef")}
        >
          Sugestão do Chefe
        </Button>
      </div>

      <Panel className="flex flex-col gap-3 p-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder={sugestaoChef ? "Buscar sugestões" : "Buscar item ou categoria"}
            className="bg-surface border-0 pl-9 ring-1 ring-black/5"
          />
        </div>
        {sugestaoChef ? null : (
          <Select value={cardapioFiltro} onValueChange={setCardapioFiltro}>
            <SelectTrigger
              className="bg-surface w-full border-0 ring-1 ring-black/5 sm:w-72"
              aria-label="Filtrar por cardápio"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos os cardápios</SelectItem>
              {CARDAPIOS.map((cardapio) => (
                <SelectItem key={cardapio} value={cardapio}>
                  {cardapio}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </Panel>

      {carregando ? (
        <Panel className="p-5">
          <LoadingState label="Carregando cardápio…" />
        </Panel>
      ) : erro ? (
        <Panel className="p-5">
          <ErrorState
            onRetry={() => {
              void itens.refetch();
              void categorias.refetch();
            }}
          />
        </Panel>
      ) : sugestaoChef ? (
        <Panel className="p-5">
          {visiveis.length ? (
            <div className="grid gap-3">{linhasDoItem(visiveis)}</div>
          ) : (
            <EmptyState
              title="Nenhuma sugestão configurada"
              description="Cadastre uma sugestão e defina para quais eventos ela aparecerá."
              action={<Button onClick={() => abrirNovo()}>Cadastrar</Button>}
            />
          )}
        </Panel>
      ) : (
        <div className="grid gap-4">
          {listaCategorias.map((categoria, indice) => {
            const doGrupo = visiveis.filter((item) => item.categoria === categoria.nome);
            // Durante uma busca ou filtro, categorias sem resultado ficam ocultas.
            if ((termo || cardapioFiltro !== TODOS) && !doGrupo.length) return null;
            // Começam recolhidas; a busca abre as categorias com resultado.
            const aberta = Boolean(termo) || abertas.has(categoria.id);
            return (
              <Panel key={categoria.id} className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => alternarCategoria(categoria.id)}
                    aria-expanded={aberta}
                    aria-controls={`itens-${categoria.id}`}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <ChevronRight
                      className={cn(
                        "text-primary size-5 shrink-0 transition-transform",
                        aberta && "rotate-90",
                      )}
                    />
                    <span>
                      <span className="font-display block text-lg font-semibold">
                        {categoria.nome}
                      </span>
                      <span className="text-muted-foreground block text-xs">
                        {doGrupo.length} item(ns)
                      </span>
                    </span>
                  </button>
                  <div className="flex flex-wrap items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Subir a categoria ${categoria.nome}`}
                      disabled={indice === 0}
                      onClick={() => void moverCategoria(indice, -1)}
                    >
                      <ChevronUp className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Descer a categoria ${categoria.nome}`}
                      disabled={indice === listaCategorias.length - 1}
                      onClick={() => void moverCategoria(indice, 1)}
                    >
                      <ChevronDown className="size-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCategoriaEditada(categoria)}
                    >
                      <Pencil className="size-4" /> Renomear
                    </Button>
                    {doGrupo.length ? null : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void removerCategoria(categoria)}
                      >
                        <Trash2 className="size-4" /> Excluir
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => {
                        setAbertas((atuais) => new Set(atuais).add(categoria.id));
                        abrirNovo(categoria.nome);
                      }}
                    >
                      <Plus className="size-4" /> Adicionar item
                    </Button>
                  </div>
                </div>
                {aberta ? (
                  <div id={`itens-${categoria.id}`}>
                    {doGrupo.length ? (
                      <div className="mt-4 grid gap-3">{linhasDoItem(doGrupo)}</div>
                    ) : (
                      <p className="text-muted-foreground mt-3 text-sm">
                        Nenhum item nesta categoria ainda.
                      </p>
                    )}
                  </div>
                ) : null}
              </Panel>
            );
          })}
          {semCategoria.length ? (
            <Panel className="p-5">
              <h2 className="font-display text-lg font-semibold">Sem categoria cadastrada</h2>
              <p className="text-muted-foreground text-xs">
                Edite os itens abaixo e escolha uma categoria existente.
              </p>
              <div className="mt-4 grid gap-3">{linhasDoItem(semCategoria)}</div>
            </Panel>
          ) : null}
          {(termo || cardapioFiltro !== TODOS) && !visiveis.length ? (
            <Panel className="p-5">
              <EmptyState
                title="Nenhum item encontrado"
                description="Ajuste a busca ou o filtro de cardápio."
              />
            </Panel>
          ) : null}
        </div>
      )}

      <ItemDialog
        aberto={itemAberto}
        onOpenChange={setItemAberto}
        editandoId={editandoId}
        form={form}
        setForm={setForm}
        categorias={nomesCategorias}
        todosItens={itens.data ?? []}
        onSalvo={atualizarTudo}
      />
      <CategoriaDialog
        categoria={categoriaEditada}
        onFechar={() => setCategoriaEditada(null)}
        onSalvo={atualizarTudo}
      />
    </div>
  );
}

function ItemLinha({
  item,
  primeiro,
  ultimo,
  ocupado,
  onMover,
  onEditar,
  onRemover,
}: {
  item: Servico;
  primeiro: boolean;
  ultimo: boolean;
  ocupado: boolean;
  onMover: (deslocamento: -1 | 1) => void;
  onEditar: () => void;
  onRemover: () => void;
}) {
  return (
    <article className="bg-surface flex flex-col gap-4 rounded-xl p-4 ring-1 ring-black/5 sm:flex-row sm:items-center">
      {item.imagemUrl ? (
        <img
          src={item.imagemUrl}
          alt=""
          className="h-24 w-full rounded-lg object-cover sm:size-16"
        />
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-medium">{item.nome}</h3>
          <StatusBadge status={item.status} />
          {!item.precoVisivel ? (
            <span className="text-muted-foreground text-xs">Preço oculto</span>
          ) : null}
          {item.opcoesIds.length ? (
            <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[11px]">
              {item.opcoesIds.length} opção(ões) de {item.opcoesRotulo.toLowerCase() || "escolha"}
            </span>
          ) : null}
        </div>
        {item.descricao ? (
          <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">{item.descricao}</p>
        ) : null}
        <p className="mt-1 text-sm">
          {item.valorBase > 0 ? `${formatBRL(item.valorBase)} · ${item.unidade}` : "Sob consulta"}
        </p>
      </div>
      <div className="flex flex-wrap gap-1 sm:justify-end">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Mover para cima"
          disabled={primeiro || ocupado}
          onClick={() => onMover(-1)}
        >
          <ChevronUp className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Mover para baixo"
          disabled={ultimo || ocupado}
          onClick={() => onMover(1)}
        >
          <ChevronDown className="size-4" />
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onEditar}>
          <Pencil className="size-4" /> Editar
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={ocupado} onClick={onRemover}>
          <Trash2 className="size-4" /> Remover
        </Button>
      </div>
    </article>
  );
}

function CategoriaDialog({
  categoria,
  onFechar,
  onSalvo,
}: {
  categoria: Categoria | "nova" | null;
  onFechar: () => void;
  onSalvo: () => Promise<unknown>;
}) {
  const criar = useServerFn(criarCategoria);
  const renomear = useServerFn(renomearCategoria);
  const [nome, setNome] = useState("");
  const [salvando, setSalvando] = useState(false);
  const nova = categoria === "nova";
  const [aberturaAnterior, setAberturaAnterior] = useState<typeof categoria>(null);
  if (categoria !== aberturaAnterior) {
    setAberturaAnterior(categoria);
    setNome(categoria && categoria !== "nova" ? categoria.nome : "");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (nome.trim().length < 2) {
      toast.error("Informe o nome da categoria.");
      return;
    }
    setSalvando(true);
    try {
      if (categoria === "nova") await criar({ data: { nome: nome.trim() } });
      else if (categoria) await renomear({ data: { id: categoria.id, nome: nome.trim() } });
      toast.success(nova ? "Categoria criada." : "Categoria renomeada.");
      onFechar();
      await onSalvo();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar a categoria.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={categoria !== null} onOpenChange={(aberto) => (aberto ? null : onFechar())}>
      <DialogContent>
        <form className="grid gap-4" onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{nova ? "Nova categoria" : "Renomear categoria"}</DialogTitle>
            <DialogDescription>
              {nova
                ? "A categoria aparece no cardápio do formulário com este nome."
                : "Os itens da categoria acompanham o novo nome."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="categoria-nome">Nome</Label>
            <Input
              id="categoria-nome"
              required
              minLength={2}
              maxLength={80}
              value={nome}
              onChange={(event) => setNome(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando}>
              {salvando ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ItemDialog({
  aberto,
  onOpenChange,
  editandoId,
  form,
  setForm,
  categorias,
  todosItens,
  onSalvo,
}: {
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
  editandoId: string | null;
  form: CreateServicoInput;
  setForm: (atualizar: (atual: CreateServicoInput) => CreateServicoInput) => void;
  categorias: string[];
  todosItens: Servico[];
  onSalvo: () => Promise<unknown>;
}) {
  // Texto do preço separado do número para permitir "0" (sob consulta) e evitar zeros à esquerda.
  const [precoTexto, setPrecoTexto] = useState("");
  const [enviandoImagem, setEnviandoImagem] = useState(false);
  const [buscaOpcao, setBuscaOpcao] = useState("");
  // A seção de opções só aparece para itens que pedem uma escolha (ex.: massa recheada).
  const [comOpcoes, setComOpcoes] = useState(false);
  const [aberturaAnterior, setAberturaAnterior] = useState(false);
  if (aberto !== aberturaAnterior) {
    setAberturaAnterior(aberto);
    if (aberto) {
      setPrecoTexto(editandoId ? String(form.valorBase) : "");
      setBuscaOpcao("");
      setComOpcoes(form.opcoesIds.length > 0);
    }
  }

  const salvarMutation = useMutation({
    mutationFn: (dados: CreateServicoInput) =>
      editandoId ? updateServico(editandoId, dados) : createServico(dados),
    onSuccess: async () => {
      await onSalvo();
      onOpenChange(false);
      toast.success(editandoId ? "Item atualizado com sucesso." : "Item cadastrado com sucesso.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o item."),
  });

  const atualizar = (dados: Partial<CreateServicoInput>) =>
    setForm((atual) => ({ ...atual, ...dados }));

  async function escolherImagem(event: ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    event.target.value = "";
    if (!arquivo) return;
    if (!(["image/png", "image/jpeg", "image/webp"] as string[]).includes(arquivo.type)) {
      toast.error("Escolha uma imagem PNG, JPG ou WebP.");
      return;
    }
    if (arquivo.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2 MB.");
      return;
    }
    setEnviandoImagem(true);
    try {
      const url = await uploadImagem("servico", arquivo);
      atualizar({ imagemUrl: url });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar a imagem.");
    } finally {
      setEnviandoImagem(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (precoTexto.trim() === "") {
      toast.error("Informe o preço (use 0 para valor sob consulta).");
      return;
    }
    salvarMutation.mutate(form);
  }

  const termoOpcao = normalizarBusca(buscaOpcao.trim());
  const candidatas = todosItens
    .filter((item) => item.id !== editandoId && !item.sugestaoChef)
    .filter(
      (item) =>
        form.opcoesIds.includes(item.id) ||
        (termoOpcao && normalizarBusca(`${item.nome} ${item.categoria}`).includes(termoOpcao)),
    )
    .sort(
      (a, b) =>
        Number(form.opcoesIds.includes(b.id)) - Number(form.opcoesIds.includes(a.id)) ||
        a.nome.localeCompare(b.nome, "pt-BR"),
    )
    .slice(0, 40);
  const opcoesCategoria = categorias.includes(form.categoria)
    ? categorias
    : [form.categoria, ...categorias];

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>
              {editandoId ? "Editar" : "Cadastrar"} {form.sugestaoChef ? "sugestão" : "item"}
            </DialogTitle>
            <DialogDescription>
              {form.sugestaoChef
                ? "A sugestão só será exibida quando estiver ativa e for aplicável ao tipo de evento."
                : "O preço oculto continua disponível para os cálculos internos."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="item-nome">Nome</Label>
              <Input
                id="item-nome"
                required
                minLength={2}
                value={form.nome}
                onChange={(event) => atualizar({ nome: event.target.value })}
              />
            </div>
            {!form.sugestaoChef ? (
              <div className="grid gap-1.5">
                <Label htmlFor="item-categoria">Categoria</Label>
                <Select
                  value={form.categoria}
                  onValueChange={(categoria) => atualizar({ categoria })}
                >
                  <SelectTrigger id="item-categoria">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {opcoesCategoria.map((categoria) => (
                      <SelectItem key={categoria} value={categoria}>
                        {categoria}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="grid gap-1.5">
              <Label htmlFor="item-status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(status) => atualizar({ status: status as ServicoStatus })}
              >
                <SelectTrigger id="item-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="item-valor">Preço</Label>
              <Input
                id="item-valor"
                inputMode="decimal"
                required
                value={precoTexto}
                onChange={(event) => {
                  const texto = limparNumeroDigitado(event.target.value);
                  setPrecoTexto(texto);
                  atualizar({ valorBase: Number(texto.replace(",", ".")) || 0 });
                }}
              />
              <p className="text-muted-foreground text-xs">Use 0 para “valor sob consulta”.</p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="item-unidade">Unidade</Label>
              <Input
                id="item-unidade"
                required
                placeholder="por pessoa, por evento…"
                value={form.unidade}
                onChange={(event) => atualizar({ unidade: event.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <Checkbox
                checked={form.precoVisivel}
                onCheckedChange={(checked) => atualizar({ precoVisivel: checked === true })}
              />
              Exibir o preço para clientes
            </label>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="item-descricao">Descrição</Label>
              <Textarea
                id="item-descricao"
                rows={3}
                value={form.descricao}
                onChange={(event) => atualizar({ descricao: event.target.value })}
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="item-imagem">Foto do item (opcional)</Label>
              <SeletorImagem
                id="item-imagem"
                temImagem={Boolean(form.imagemUrl)}
                enviando={enviandoImagem}
                onChange={(event) => void escolherImagem(event)}
              />
              {form.imagemUrl ? (
                <div className="bg-surface flex items-center gap-3 rounded-xl p-3 ring-1 ring-black/5">
                  <img
                    src={form.imagemUrl}
                    alt="Pré-visualização"
                    className="size-20 rounded-lg object-cover"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => atualizar({ imagemUrl: "" })}
                  >
                    Remover imagem
                  </Button>
                </div>
              ) : null}
            </div>
            {!form.sugestaoChef ? (
              <div className="grid gap-2 sm:col-span-2">
                <div>
                  <Label>Cardápios públicos</Label>
                  <p className="text-muted-foreground text-xs">
                    Selecione onde este item será apresentado.
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {CARDAPIOS.map((cardapio) => (
                    <label key={cardapio} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={form.cardapios.includes(cardapio)}
                        onCheckedChange={(checked) =>
                          atualizar({
                            cardapios: checked
                              ? [...form.cardapios, cardapio]
                              : form.cardapios.filter((item) => item !== cardapio),
                          })
                        }
                      />
                      {cardapio}
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
            {!form.sugestaoChef ? (
              <label className="flex items-start gap-2 text-sm sm:col-span-2">
                <Checkbox
                  className="mt-0.5"
                  checked={comOpcoes}
                  onCheckedChange={(checked) => {
                    setComOpcoes(checked === true);
                    // Desmarcar remove as opções: o item volta a ser uma escolha simples.
                    if (checked !== true) atualizar({ opcoesIds: [], opcoesRotulo: "" });
                  }}
                />
                <span>
                  Este item tem opções para o cliente escolher
                  <span className="text-muted-foreground block text-xs">
                    Ex.: uma massa recheada em que o cliente escolhe o recheio.
                  </span>
                </span>
              </label>
            ) : null}
            {!form.sugestaoChef && comOpcoes ? (
              <div className="bg-surface grid gap-3 rounded-xl p-4 ring-1 ring-black/5 sm:col-span-2">
                <div>
                  <p className="text-sm font-semibold">Opções para o cliente escolher</p>
                  <ol className="text-muted-foreground mt-1 list-decimal space-y-0.5 pl-4 text-xs">
                    <li>
                      Em <strong>Nome da escolha</strong>, escreva a palavra que o cliente vê (ex.:
                      Recheio, Molho, Sabor).
                    </li>
                    <li>Busque abaixo e marque os itens que servem como opção deste item.</li>
                    <li>
                      Salve. No formulário, ao marcar este item, o cliente escolhe uma das opções
                      (ex.: “Recheio para Conchiglioni”).
                    </li>
                  </ol>
                </div>
                <div className="grid gap-1.5 sm:max-w-xs">
                  <Label htmlFor="item-opcoes-rotulo">Nome da escolha</Label>
                  <Input
                    id="item-opcoes-rotulo"
                    placeholder="Recheio"
                    aria-describedby="item-opcoes-rotulo-ajuda"
                    value={form.opcoesRotulo}
                    onChange={(event) => atualizar({ opcoesRotulo: event.target.value })}
                  />
                  <p id="item-opcoes-rotulo-ajuda" className="text-muted-foreground text-xs">
                    Se ficar vazio, aparece “Opção”.
                  </p>
                </div>
                <div className="relative">
                  <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <Input
                    value={buscaOpcao}
                    onChange={(event) => setBuscaOpcao(event.target.value)}
                    placeholder="Buscar itens para usar como opção…"
                    className="pl-9"
                  />
                </div>
                {candidatas.length ? (
                  <div className="grid max-h-56 gap-1 overflow-y-auto">
                    {candidatas.map((item) => (
                      <label key={item.id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={form.opcoesIds.includes(item.id)}
                          onCheckedChange={(checked) =>
                            atualizar({
                              opcoesIds: checked
                                ? [...form.opcoesIds, item.id]
                                : form.opcoesIds.filter((opcaoId) => opcaoId !== item.id),
                            })
                          }
                        />
                        {item.nome}
                        <span className="text-muted-foreground text-xs">{item.categoria}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-xs">
                    {termoOpcao
                      ? "Nenhum item encontrado. Cadastre a opção como item do cardápio primeiro."
                      : "Nenhuma opção. Busque um item para adicionar."}
                  </p>
                )}
                <div className="bg-primary/5 text-muted-foreground grid gap-1 rounded-lg p-3 text-xs">
                  <p>
                    <strong className="text-foreground">A opção precisa existir como item.</strong>{" "}
                    Para um recheio novo, cadastre-o antes (ex.: na categoria “Recheios para
                    massas”) e depois marque-o aqui.
                  </p>
                  <p>
                    Itens usados como opção não aparecem soltos no formulário: o cliente só os
                    escolhe dentro deste item.
                  </p>
                  <p>Cada item tem a própria lista: marque só as opções que combinam com ele.</p>
                </div>
              </div>
            ) : null}
            <div className="grid gap-2 sm:col-span-2">
              <div>
                <Label>Tipos de evento</Label>
                <p className="text-muted-foreground text-xs">
                  Sem seleção, {form.sugestaoChef ? "a sugestão" : "o item"} será válido para todos.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {TIPOS_EVENTO.map((tipo) => (
                  <label key={tipo} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.tiposEvento.includes(tipo)}
                      onCheckedChange={(checked) =>
                        atualizar({
                          tiposEvento: checked
                            ? [...form.tiposEvento, tipo as TipoEvento]
                            : form.tiposEvento.filter((item) => item !== tipo),
                        })
                      }
                    />
                    {tipo}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={salvarMutation.isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={salvarMutation.isPending || enviandoImagem}>
              {salvarMutation.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
