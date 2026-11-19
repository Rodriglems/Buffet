import { type ChangeEvent, type FormEvent, type ReactNode, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Check,
  ChevronRight,
  FolderTree,
  FolderPlus,
  ListTree,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Settings2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { ListaArrastavel } from "@/components/lista-arrastavel";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "@/features/servicos/server-functions";
import { CardapiosFormatosPainel } from "@/features/servicos/cardapios-formatos-dialog";
import {
  contagem,
  itemComMesmoNome,
  itensParecidos,
  textoDoPreco,
  unidadesMaisUsadas,
} from "@/features/servicos/regras-cardapio";
import {
  useCardapiosEFormatos,
  type AbaCardapiosFormatos,
} from "@/features/servicos/use-cardapios-formatos";
import { uploadImagem } from "@/features/uploads/server-functions";
import { TIPOS_EVENTO, type TipoEvento } from "@/lib/catalogo";
import { useConfirmar } from "@/lib/confirmacao";
import { formatBRL } from "@/lib/format";
import { pageMeta } from "@/lib/meta";
import { limparNumeroDigitado } from "@/lib/numero";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/servicos")({
  head: () => pageMeta("Cardápio", "Organize o cardápio por categorias."),
  component: CardapioPage,
});

type Categoria = { id: string; nome: string; ordem: number };
type AbaCardapio = "categorias" | AbaCardapiosFormatos;
const TODOS = "todos";

function novoItem(categoria: string, ordem = 0): CreateServicoInput {
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
    sugestaoChef: false,
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
  const [itemAberto, setItemAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateServicoInput>(() => novoItem("Outros"));
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
  const cardapiosEFormatos = useCardapiosEFormatos();
  const nomesCardapios = (cardapiosEFormatos.data?.cardapios ?? []).map((c) => c.nome);
  const [abaAtiva, setAbaAtiva] = useState<AbaCardapio>("categorias");
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

  const termo = normalizarBusca(busca.trim());
  const visiveis = useMemo(
    () =>
      (itens.data ?? [])
        .filter((item) => cardapioFiltro === TODOS || item.cardapios.includes(cardapioFiltro))
        .filter((item) =>
          termo
            ? normalizarBusca(`${item.nome} ${item.categoria} ${item.descricao}`).includes(termo)
            : true,
        )
        .sort(ordenar),
    [itens.data, cardapioFiltro, termo],
  );
  const listaCategorias = categorias.data ?? [];
  const nomesCategorias = listaCategorias.map((categoria) => categoria.nome);

  function abrirNovo(categoria = nomesCategorias[0] ?? "Outros") {
    const maiorOrdem = Math.max(-1, ...(itens.data ?? []).map((item) => item.ordem));
    setEditandoId(null);
    setForm(novoItem(categoria, maiorOrdem + 1));
    setItemAberto(true);
  }

  function abrirEdicao(item: Servico) {
    setEditandoId(item.id);
    const { id: _id, ...dados } = item;
    setForm({ ...dados, sugestaoChef: false });
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

  // Com busca ou filtro parte da lista fica oculta: a ordem só muda vendo a lista inteira.
  const filtrando = Boolean(termo) || cardapioFiltro !== TODOS;

  /** Salva a nova ordem dos itens de uma categoria (a ordem só vale dentro dela). */
  async function reordenarItens(ids: string[]) {
    await ordenarMutation.mutateAsync(ids);
  }

  async function reordenarListaDeCategorias(ids: string[]) {
    try {
      await reordenar({ data: { ids } });
      await atualizarTudo();
    } catch (error) {
      toast.error("Não foi possível reorganizar as categorias.");
      throw error;
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
    return (
      <ListaArrastavel
        itens={lista}
        onReordenar={reordenarItens}
        desativado={filtrando}
        rotuloDoItem={(item) => `o item ${item.nome}`}
        className="grid gap-3"
      >
        {(item, alca) => (
          <ItemLinha
            item={item}
            alca={alca}
            ocupado={excluirMutation.isPending}
            onEditar={() => abrirEdicao(item)}
            onRemover={() => void remover(item)}
          />
        )}
      </ListaArrastavel>
    );
  }

  const carregando = itens.isPending || categorias.isPending;
  const erro = itens.isError || categorias.isError;
  // Itens com categoria sem cadastro (ex.: criada fora desta tela) não podem sumir da lista.
  const semCategoria = visiveis.filter((item) => !nomesCategorias.includes(item.categoria));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Cardápio" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={abaAtiva}
          onValueChange={(valor) => setAbaAtiva(valor as AbaCardapio)}
          className="min-w-0"
        >
          <TabsList
            className="grid h-auto w-full grid-cols-3 p-1 sm:inline-grid sm:w-auto"
            aria-label="Seções do cardápio"
          >
            <TabsTrigger
              value="categorias"
              className="min-h-10 gap-2 px-3 max-sm:gap-1 max-sm:px-1 max-sm:text-xs"
            >
              <FolderTree className="size-4 max-sm:hidden" />
              Categorias
            </TabsTrigger>
            <TabsTrigger
              value="cardapios"
              className="min-h-10 gap-2 px-3 max-sm:gap-1 max-sm:px-1 max-sm:text-xs"
            >
              <ListTree className="size-4 max-sm:hidden" />
              Cardápios
            </TabsTrigger>
            <TabsTrigger
              value="formatos"
              className="min-h-10 gap-2 px-3 max-sm:gap-1 max-sm:px-1 max-sm:text-xs"
            >
              <Settings2 className="size-4 max-sm:hidden" />
              Formatos
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {abaAtiva === "categorias" ? (
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
            <Button
              variant="outline"
              className="min-h-10 w-full sm:w-auto"
              onClick={() => setCategoriaEditada("nova")}
            >
              <FolderPlus className="size-4" />
              <span>Nova categoria</span>
            </Button>
            <Button className="min-h-10 w-full sm:w-auto" onClick={() => abrirNovo()}>
              <Plus className="size-4" />
              Novo item
            </Button>
          </div>
        ) : null}
      </div>

      {abaAtiva === "categorias" ? (
        <>
          <Panel className="flex flex-col gap-3 p-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar item ou categoria"
                className="bg-surface border-0 pl-9 ring-1 ring-black/5 max-sm:h-11"
              />
            </div>
            <Select value={cardapioFiltro} onValueChange={setCardapioFiltro}>
              <SelectTrigger
                className="bg-surface w-full border-0 ring-1 ring-black/5 max-sm:h-11 sm:w-72"
                aria-label="Filtrar por cardápio"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todos os cardápios</SelectItem>
                {nomesCardapios.map((cardapio) => (
                  <SelectItem key={cardapio} value={cardapio}>
                    {cardapio}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          ) : (
            // minmax(0,1fr): a coluna não cresce além da tela por causa de um texto comprido.
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
              <ListaArrastavel
                // Durante uma busca ou filtro, categorias sem resultado ficam ocultas.
                itens={listaCategorias.filter(
                  (categoria) =>
                    !filtrando || visiveis.some((item) => item.categoria === categoria.nome),
                )}
                onReordenar={reordenarListaDeCategorias}
                desativado={filtrando}
                rotuloDoItem={(categoria) => `a categoria ${categoria.nome}`}
                className="grid grid-cols-[minmax(0,1fr)] gap-4"
              >
                {(categoria, alca) => {
                  const doGrupo = visiveis.filter((item) => item.categoria === categoria.nome);
                  // Começam recolhidas; a busca abre as categorias com resultado.
                  const aberta = Boolean(termo) || abertas.has(categoria.id);
                  return (
                    <Panel className="p-3 sm:p-5">
                      <div className="flex items-center justify-between gap-2 sm:gap-3">
                        {alca}
                        <button
                          type="button"
                          onClick={() => alternarCategoria(categoria.id)}
                          aria-expanded={aberta}
                          aria-controls={`itens-${categoria.id}`}
                          className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-2 text-left sm:gap-3"
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
                              {contagem(doGrupo.length, "item", "itens")}
                            </span>
                          </span>
                        </button>
                        <div className="flex shrink-0 items-center gap-1">
                          {/* No celular os botões mostram só o ícone; o nome fica no aria-label. */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="max-sm:size-11"
                            aria-label={`Renomear a categoria ${categoria.nome}`}
                            title="Renomear"
                            onClick={() => setCategoriaEditada(categoria)}
                          >
                            <Pencil className="size-4" />
                            <span className="hidden sm:inline">Renomear</span>
                          </Button>
                          {doGrupo.length ? null : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="max-sm:size-11"
                              aria-label={`Excluir a categoria ${categoria.nome}`}
                              title="Excluir"
                              onClick={() => void removerCategoria(categoria)}
                            >
                              <Trash2 className="size-4" />
                              <span className="hidden sm:inline">Excluir</span>
                            </Button>
                          )}
                          <Button
                            size="sm"
                            className="max-sm:size-11"
                            aria-label={`Adicionar item em ${categoria.nome}`}
                            title="Adicionar item"
                            onClick={() => {
                              setAbertas((atuais) => new Set(atuais).add(categoria.id));
                              abrirNovo(categoria.nome);
                            }}
                          >
                            <Plus className="size-4" />
                            <span className="hidden sm:inline">Adicionar item</span>
                          </Button>
                        </div>
                      </div>
                      {aberta ? (
                        <div id={`itens-${categoria.id}`}>
                          {doGrupo.length ? (
                            <div className="mt-3 sm:mt-4">{linhasDoItem(doGrupo)}</div>
                          ) : (
                            <p className="text-muted-foreground mt-3 text-sm">
                              Nenhum item nesta categoria ainda.
                            </p>
                          )}
                        </div>
                      ) : null}
                    </Panel>
                  );
                }}
              </ListaArrastavel>
              {semCategoria.length ? (
                <Panel className="p-5">
                  <h2 className="font-display text-lg font-semibold">Sem categoria cadastrada</h2>
                  <p className="text-muted-foreground text-xs">
                    Edite os itens abaixo e escolha uma categoria existente.
                  </p>
                  <div className="mt-4">{linhasDoItem(semCategoria)}</div>
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
        </>
      ) : (
        <Panel className="p-4 sm:p-6">
          <CardapiosFormatosPainel aba={abaAtiva} itens={itens.data ?? []} />
        </Panel>
      )}

      <ItemDialog
        aberto={itemAberto}
        onOpenChange={setItemAberto}
        editandoId={editandoId}
        form={form}
        setForm={setForm}
        categorias={nomesCategorias}
        cardapios={nomesCardapios}
        onGerenciarCardapios={() => {
          setItemAberto(false);
          setAbaAtiva("cardapios");
        }}
        todosItens={itens.data ?? []}
        onSalvo={atualizarTudo}
        onAbrirExistente={(item) => {
          abrirEdicao(item);
          toast.info(`Editando “${item.nome}”. Marque o cardápio e salve.`);
        }}
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
  alca,
  ocupado,
  onEditar,
  onRemover,
}: {
  item: Servico;
  /** Alça de arrastar; ausente durante busca ou filtro. */
  alca: ReactNode;
  ocupado: boolean;
  onEditar: () => void;
  onRemover: () => void;
}) {
  const inativo = item.status === "Inativo";
  return (
    <article
      className={cn(
        "bg-surface flex items-center gap-1 rounded-xl py-1 pr-1 pl-1 ring-1 ring-black/5 sm:gap-2 sm:py-2 sm:pr-3",
        inativo && "bg-muted/40",
      )}
    >
      {alca}
      {/* A linha inteira abre a edição: alvo grande e fácil de tocar no celular. */}
      <button
        type="button"
        onClick={onEditar}
        aria-label={`Editar ${item.nome}`}
        className="hover:bg-secondary/60 focus-visible:ring-ring flex min-h-14 min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        {item.imagemUrl ? (
          <img
            src={item.imagemUrl}
            alt=""
            loading="lazy"
            className="size-12 shrink-0 rounded-lg object-cover sm:size-14"
          />
        ) : null}
        <span className="min-w-0 flex-1">
          <span className={cn("block font-medium", inativo && "text-muted-foreground")}>
            {item.nome}
          </span>
          {item.descricao ? (
            <span className="text-muted-foreground mt-0.5 line-clamp-1 block text-xs">
              {item.descricao}
            </span>
          ) : null}
          <span className="text-muted-foreground mt-0.5 flex flex-wrap gap-x-2 text-sm">
            <span className="text-foreground">
              {item.valorBase > 0
                ? `${formatBRL(item.valorBase)} / ${item.unidade}`
                : "Sob consulta"}
            </span>
            {!item.precoVisivel && item.valorBase > 0 ? <span>preço escondido</span> : null}
            {item.opcoesIds.length ? (
              <span>
                {contagem(item.opcoesIds.length, "opção", "opções")} de{" "}
                {item.opcoesRotulo.toLowerCase() || "escolha"}
              </span>
            ) : null}
          </span>
        </span>
        {/* Status fixo no canto direito: Ativo (verde) ou Inativo (cinza), sempre no mesmo lugar. */}
        <StatusBadge status={item.status} className="shrink-0 self-start sm:self-center" />
      </button>

      {/* Computador: as duas ações à vista. Celular: menu ⋯, para não remover sem querer. */}
      <div className="hidden shrink-0 gap-1 sm:flex">
        <Button type="button" size="sm" variant="outline" onClick={onEditar}>
          <Pencil className="size-4" /> Editar
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          disabled={ocupado}
          onClick={onRemover}
        >
          <Trash2 className="size-4" /> Remover
        </Button>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11 shrink-0 sm:hidden"
            aria-label={`Mais ações para ${item.nome}`}
          >
            <MoreVertical className="size-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem className="min-h-11" onSelect={onEditar}>
            <Pencil className="size-4" /> Editar
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive min-h-11 [&_svg]:text-destructive"
            disabled={ocupado}
            onSelect={onRemover}
          >
            <Trash2 className="size-4" /> Remover
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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
  cardapios,
  onGerenciarCardapios,
  todosItens,
  onSalvo,
  onAbrirExistente,
}: {
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
  editandoId: string | null;
  form: CreateServicoInput;
  setForm: (atualizar: (atual: CreateServicoInput) => CreateServicoInput) => void;
  categorias: string[];
  cardapios: string[];
  onGerenciarCardapios: () => void;
  todosItens: Servico[];
  onSalvo: () => Promise<unknown>;
  /** Troca o cadastro pela edição do item que já tem esse nome. */
  onAbrirExistente: (item: Servico) => void;
}) {
  // Texto do preço separado do número: vazio é "sob consulta" e evita zeros à esquerda.
  const [precoTexto, setPrecoTexto] = useState("");
  const [enviandoImagem, setEnviandoImagem] = useState(false);
  const [buscaOpcao, setBuscaOpcao] = useState("");
  // A seção de opções só aparece para itens que pedem uma escolha (ex.: massa recheada).
  const [comOpcoes, setComOpcoes] = useState(false);
  const [maisOpcoes, setMaisOpcoes] = useState(false);
  // Reinicia os campos ao abrir e também ao trocar de item com a janela aberta
  // ("Abrir este item" passa do cadastro para a edição do item existente).
  const chaveAbertura = aberto ? `aberto:${editandoId ?? "novo"}` : "fechado";
  const [aberturaAnterior, setAberturaAnterior] = useState("fechado");
  if (chaveAbertura !== aberturaAnterior) {
    setAberturaAnterior(chaveAbertura);
    if (aberto) {
      setPrecoTexto(editandoId ? textoDoPreco(form.valorBase) : "");
      setBuscaOpcao("");
      setComOpcoes(form.opcoesIds.length > 0);
      setMaisOpcoes(form.opcoesIds.length > 0 || form.tiposEvento.length > 0);
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
    salvarMutation.mutate(form);
  }

  // Enquanto a pessoa digita o nome: se o item já existe, leva até ele em vez de duplicar.
  const repetido = itemComMesmoNome(todosItens, form.nome, editandoId);
  // No cadastro, mostra pratos com nome parecido: o item pode já existir com outro nome.
  const parecidos =
    !editandoId && !repetido ? itensParecidos(todosItens, form.nome, editandoId) : [];

  const termoOpcao = normalizarBusca(buscaOpcao.trim());
  const candidatas = todosItens
    .filter((item) => item.id !== editandoId)
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

  const unidadesSugeridas = unidadesMaisUsadas(todosItens, 5);
  const cardapiosDoItem = [
    ...cardapios,
    // Cardápio que o item ainda tem, mas foi excluído: aparece para poder desmarcar.
    ...form.cardapios.filter((nome) => !cardapios.includes(nome)),
  ];
  const resumoMaisOpcoes = [
    form.opcoesIds.length ? `${form.opcoesIds.length} opção(ões) de escolha` : "",
    form.tiposEvento.length ? `${form.tiposEvento.length} tipo(s) de evento` : "",
  ]
    .filter(Boolean)
    .join(" e ");

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      {/* Topo e rodapé fixos: só o meio rola, e o Salvar fica sempre à vista (no celular também). */}
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 p-0 sm:max-w-2xl">
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <DialogHeader className="border-border border-b px-6 pt-6 pb-4 text-left">
            <DialogTitle>{editandoId ? "Editar item" : "Novo item do cardápio"}</DialogTitle>
            <DialogDescription>
              {editandoId
                ? "As mudanças valem para todos os cardápios em que o item aparece."
                : "Cadastre o prato uma vez e escolha em quais cardápios ele aparece."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid min-h-0 flex-1 gap-8 overflow-y-auto px-6 py-6">
            {/* ------------------------------ O prato ------------------------------ */}
            <Secao titulo="O prato">
              <div className="grid gap-1.5">
                <Label htmlFor="item-nome">Nome</Label>
                <Input
                  id="item-nome"
                  required
                  minLength={2}
                  placeholder="Ex.: Bolinho de bacalhau"
                  value={form.nome}
                  onChange={(event) => atualizar({ nome: event.target.value })}
                  aria-describedby={repetido ? "item-nome-repetido" : undefined}
                />
                {repetido ? (
                  <div
                    id="item-nome-repetido"
                    role="status"
                    className="bg-warning/12 text-warning-foreground flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm"
                  >
                    <span>
                      Já existe “{repetido.nome}” na categoria {repetido.categoria}
                      {repetido.status === "Inativo" ? " (inativo)" : ""}. Para colocá-lo em outro
                      cardápio, abra esse item.
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onAbrirExistente(repetido)}
                    >
                      Abrir este item
                    </Button>
                  </div>
                ) : parecidos.length ? (
                  <div
                    role="status"
                    className="bg-secondary grid gap-1 rounded-lg px-3 py-2 text-sm"
                  >
                    <p className="text-muted-foreground text-xs">
                      Itens parecidos já cadastrados. Se for um deles, abra em vez de cadastrar de
                      novo:
                    </p>
                    <ul className="grid gap-0.5">
                      {parecidos.map((item) => (
                        <li key={item.id} className="flex items-center justify-between gap-2">
                          <span className="min-w-0">
                            {item.nome}
                            <span className="text-muted-foreground"> — {item.categoria}</span>
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 shrink-0"
                            onClick={() => onAbrirExistente(item)}
                          >
                            Abrir
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="item-categoria">Categoria</Label>
                <Select
                  value={form.categoria}
                  onValueChange={(categoria) => atualizar({ categoria })}
                >
                  <SelectTrigger id="item-categoria" aria-describedby="item-categoria-ajuda">
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
                <p id="item-categoria-ajuda" className="text-muted-foreground text-xs">
                  O tipo do prato, ex.: Salgadinhos. Cada item tem uma só.
                </p>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="item-descricao">
                  Descrição <span className="text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <Textarea
                  id="item-descricao"
                  rows={2}
                  placeholder="O que vai no prato, como é servido…"
                  value={form.descricao}
                  onChange={(event) => atualizar({ descricao: event.target.value })}
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="item-imagem">
                  Foto <span className="text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <div className="flex flex-wrap items-center gap-3">
                  {form.imagemUrl ? (
                    <img
                      src={form.imagemUrl}
                      alt={`Foto de ${form.nome || "item"}`}
                      className="size-16 rounded-lg object-cover ring-1 ring-black/5"
                    />
                  ) : null}
                  <SeletorImagem
                    id="item-imagem"
                    temImagem={Boolean(form.imagemUrl)}
                    enviando={enviandoImagem}
                    onChange={(event) => void escolherImagem(event)}
                  />
                  {form.imagemUrl ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => atualizar({ imagemUrl: "" })}
                    >
                      Remover
                    </Button>
                  ) : null}
                </div>
              </div>
            </Secao>

            {/* ------------------------------- Preço ------------------------------- */}
            <Secao titulo="Preço">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="item-valor">Valor</Label>
                  <div className="relative">
                    <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                      R$
                    </span>
                    <Input
                      id="item-valor"
                      inputMode="decimal"
                      placeholder="Sob consulta"
                      className="pl-9"
                      aria-describedby="item-valor-ajuda"
                      value={precoTexto}
                      onChange={(event) => {
                        const texto = limparNumeroDigitado(event.target.value);
                        setPrecoTexto(texto);
                        atualizar({ valorBase: Number(texto.replace(",", ".")) || 0 });
                      }}
                    />
                  </div>
                </div>
                <div className="grid content-start gap-1.5">
                  <Label htmlFor="item-unidade">Cobrado</Label>
                  <Input
                    id="item-unidade"
                    required
                    placeholder="por pessoa, cento, kg…"
                    value={form.unidade}
                    onChange={(event) => atualizar({ unidade: event.target.value })}
                  />
                  {unidadesSugeridas.length ? (
                    <div className="flex flex-wrap gap-1.5" aria-label="Unidades mais usadas">
                      {unidadesSugeridas.map((unidade) => (
                        <button
                          key={unidade}
                          type="button"
                          aria-pressed={form.unidade.trim().toLowerCase() === unidade.toLowerCase()}
                          onClick={() => atualizar({ unidade })}
                          className="bg-secondary text-secondary-foreground hover:bg-muted aria-pressed:bg-primary aria-pressed:text-primary-foreground rounded-full px-2.5 py-1 text-xs transition-colors"
                        >
                          {unidade}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
              <label className="flex items-center justify-between gap-4 text-sm">
                <span>Mostrar o preço para o cliente</span>
                <Switch
                  checked={form.precoVisivel}
                  onCheckedChange={(precoVisivel) => atualizar({ precoVisivel })}
                />
              </label>
            </Secao>

            {/* ---------------------------- Onde aparece ---------------------------- */}
            <Secao
              titulo="Onde aparece"
              acao={
                <Button type="button" size="sm" variant="ghost" onClick={onGerenciarCardapios}>
                  <ListTree className="size-4" /> Gerenciar cardápios
                </Button>
              }
            >
              <div className="grid gap-2">
                <div
                  className="flex flex-wrap gap-2"
                  role="group"
                  aria-describedby="item-cardapios-ajuda"
                >
                  {cardapiosDoItem.map((cardapio) => {
                    const marcado = form.cardapios.includes(cardapio);
                    return (
                      <button
                        key={cardapio}
                        type="button"
                        aria-pressed={marcado}
                        onClick={() =>
                          atualizar({
                            cardapios: marcado
                              ? form.cardapios.filter((item) => item !== cardapio)
                              : [...form.cardapios, cardapio],
                          })
                        }
                        className={cn(
                          "inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ring-1 transition-colors",
                          marcado
                            ? "bg-primary text-primary-foreground ring-primary"
                            : "bg-surface ring-input hover:bg-secondary",
                        )}
                      >
                        {marcado ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
                        {cardapio}
                      </button>
                    );
                  })}
                </div>
                {!cardapiosDoItem.length ? (
                  <p className="text-muted-foreground text-sm">
                    Nenhum cardápio cadastrado. Crie um em “Gerenciar cardápios”.
                  </p>
                ) : null}
              </div>
              <label className="flex items-center justify-between gap-4 text-sm">
                <span>Disponível para clientes</span>
                <Switch
                  checked={form.status === "Ativo"}
                  onCheckedChange={(ativo) => atualizar({ status: ativo ? "Ativo" : "Inativo" })}
                />
              </label>
            </Secao>

            {/* ---------------------------- Mais opções ----------------------------- */}
            <section className="border-border rounded-xl border">
              <button
                type="button"
                aria-expanded={maisOpcoes}
                aria-controls="item-mais-opcoes"
                onClick={() => setMaisOpcoes((atual) => !atual)}
                className="hover:bg-secondary/60 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors"
              >
                <ChevronRight
                  className={cn(
                    "text-muted-foreground size-4 shrink-0 transition-transform",
                    maisOpcoes && "rotate-90",
                  )}
                />
                <span className="flex-1">
                  <span className="block text-sm font-semibold">Mais opções</span>
                  <span className="text-muted-foreground block text-xs">
                    {resumoMaisOpcoes || "Escolhas para o cliente (ex.: recheio) e tipos de evento"}
                  </span>
                </span>
              </button>
              {maisOpcoes ? (
                <div id="item-mais-opcoes" className="grid gap-6 px-4 pt-1 pb-4">
                  <div className="grid gap-3">
                    <label className="flex items-center justify-between gap-4 text-sm">
                      <span>O cliente escolhe uma opção deste item</span>
                      <Switch
                        checked={comOpcoes}
                        onCheckedChange={(ligado) => {
                          setComOpcoes(ligado);
                          // Desligar remove as opções: o item volta a ser uma escolha simples.
                          if (!ligado) atualizar({ opcoesIds: [], opcoesRotulo: "" });
                        }}
                      />
                    </label>
                    {comOpcoes ? (
                      <div className="bg-secondary/60 grid gap-3 rounded-lg p-4">
                        <div className="grid gap-1.5 sm:max-w-xs">
                          <Label htmlFor="item-opcoes-rotulo">Nome da escolha</Label>
                          <Input
                            id="item-opcoes-rotulo"
                            placeholder="Recheio"
                            aria-describedby="item-opcoes-rotulo-ajuda"
                            value={form.opcoesRotulo}
                            onChange={(event) => atualizar({ opcoesRotulo: event.target.value })}
                          />
                          <p
                            id="item-opcoes-rotulo-ajuda"
                            className="text-muted-foreground text-xs"
                          >
                            A palavra que o cliente vê, ex.: Recheio, Molho, Sabor.
                          </p>
                        </div>
                        <div className="relative">
                          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                          <Input
                            aria-label="Buscar itens para usar como opção"
                            value={buscaOpcao}
                            onChange={(event) => setBuscaOpcao(event.target.value)}
                            placeholder="Buscar itens para usar como opção…"
                            className="pl-9"
                          />
                        </div>
                        {candidatas.length ? (
                          <div className="grid max-h-56 gap-0.5 overflow-y-auto">
                            {candidatas.map((item) => (
                              <label
                                key={item.id}
                                className="hover:bg-surface flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm"
                              >
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
                                {/* Nome em cima e categoria embaixo: cabe no celular sem quebrar. */}
                                <span className="min-w-0 flex-1">
                                  <span className="block leading-5">{item.nome}</span>
                                  <span className="text-muted-foreground block text-xs">
                                    {item.categoria}
                                  </span>
                                </span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-xs">
                            {termoOpcao
                              ? "Nenhum item encontrado. Cadastre a opção como item do cardápio primeiro."
                              : "Busque e marque os itens que servem de opção (ex.: os recheios)."}
                          </p>
                        )}
                      </div>
                    ) : null}
                  </div>

                  <div className="grid gap-2">
                    <div>
                      <p className="text-sm font-medium">Tipos de evento</p>
                      <p className="text-muted-foreground text-xs">
                        Sem nenhum marcado, o item vale para todos os eventos.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Tipos de evento">
                      {TIPOS_EVENTO.map((tipo) => {
                        const marcado = form.tiposEvento.includes(tipo);
                        return (
                          <button
                            key={tipo}
                            type="button"
                            aria-pressed={marcado}
                            onClick={() =>
                              atualizar({
                                tiposEvento: marcado
                                  ? form.tiposEvento.filter((item) => item !== tipo)
                                  : [...form.tiposEvento, tipo as TipoEvento],
                              })
                            }
                            className={cn(
                              "min-h-8 rounded-full px-3 py-1 text-xs ring-1 transition-colors",
                              marcado
                                ? "bg-primary text-primary-foreground ring-primary"
                                : "bg-surface ring-input hover:bg-secondary",
                            )}
                          >
                            {tipo}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}
            </section>
          </div>

          <DialogFooter className="border-border bg-background flex-row justify-end gap-2 border-t px-6 py-4">
            <Button
              type="button"
              variant="outline"
              disabled={salvarMutation.isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={salvarMutation.isPending || enviandoImagem}>
              {salvarMutation.isPending
                ? "Salvando…"
                : editandoId
                  ? "Salvar alterações"
                  : "Cadastrar item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Bloco com título dentro da janela do item (O prato, Preço, Onde aparece). */
function Secao({
  titulo,
  acao,
  children,
}: {
  titulo: string;
  acao?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-foreground text-sm font-semibold">{titulo}</h3>
        {acao}
      </div>
      {children}
    </section>
  );
}
