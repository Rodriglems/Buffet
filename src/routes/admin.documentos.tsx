import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckSquare, Download, Loader2, MoreHorizontal, Search, X } from "lucide-react";
import { toast } from "sonner";

import { Paginacao } from "@/components/paginacao";
import { PageHeader, Panel } from "@/components/panel";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  baixarPdfDoEvento,
  baixarPdfsDosEventos,
  listarDocumentosDosEventos,
  STATUS_DOCUMENTOS,
  type OrdemDocumentos,
} from "@/features/documentos/eventos-pdf";
import { formatBRL, formatDate } from "@/lib/format";
import { pageMeta } from "@/lib/meta";
import { usePlaceholderBusca } from "@/lib/placeholder-busca";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/documentos")({
  head: () => pageMeta("Documentos", "Cardápios em PDF dos eventos aprovados em diante."),
  component: DocumentosPage,
});

const LIMITE_POR_VEZ = 50;
const POR_PAGINA = 20;

type StatusDocumento = (typeof STATUS_DOCUMENTOS)[number];

const ROTULOS_ORDEM: Record<OrdemDocumentos, string> = {
  "chegada-recente": "Mais recentes",
  "chegada-antiga": "Mais antigos",
  "data-evento": "Data do evento",
};

/** Filtros por status, no plural, na ordem do fluxo do evento. */
const FILTROS_STATUS: { valor: StatusDocumento | "TODOS"; rotulo: string }[] = [
  { valor: "TODOS", rotulo: "Todos" },
  { valor: "APROVADO", rotulo: "Aprovados" },
  { valor: "CONFIRMADO", rotulo: "Confirmados" },
  { valor: "FINALIZADO", rotulo: "Finalizados" },
  { valor: "CANCELADO", rotulo: "Cancelados" },
];

function formatarRecebimento(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Valor que só muda depois de uma pausa na digitação, para não buscar a cada letra. */
function useComAtraso<T>(valor: T, ms = 300): T {
  const [atrasado, setAtrasado] = useState(valor);
  useEffect(() => {
    const timer = setTimeout(() => setAtrasado(valor), ms);
    return () => clearTimeout(timer);
  }, [valor, ms]);
  return atrasado;
}

function DocumentosPage() {
  const placeholderBusca = usePlaceholderBusca("Buscar por evento ou cliente");
  const listar = useServerFn(listarDocumentosDosEventos);
  const [busca, setBusca] = useState("");
  const buscaAtrasada = useComAtraso(busca.trim());
  const [status, setStatus] = useState<StatusDocumento | "TODOS">("TODOS");
  const [ordem, setOrdem] = useState<OrdemDocumentos>("chegada-recente");
  const [dataFiltro, setDataFiltro] = useState("");
  const [pagina, setPagina] = useState(1);
  const [baixando, setBaixando] = useState<string | null>(null);
  // Modo de seleção aberto pelo menu "⋯" para juntar vários cardápios em um único PDF.
  const [selecionando, setSelecionando] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(() => new Set());

  // Qualquer filtro novo volta para a primeira página.
  useEffect(() => setPagina(1), [buscaAtrasada, status, ordem, dataFiltro]);

  const consulta = useQuery({
    queryKey: ["documentos", { pagina, buscaAtrasada, status, ordem, dataFiltro }],
    queryFn: () =>
      listar({
        data: {
          page: pagina,
          pageSize: POR_PAGINA,
          busca: buscaAtrasada,
          ordem,
          ...(status === "TODOS" ? {} : { status }),
          ...(dataFiltro ? { data: dataFiltro } : {}),
        },
      }),
    placeholderData: keepPreviousData,
  });
  const lista = consulta.data?.items ?? [];
  const total = consulta.data?.total ?? 0;
  const contagens = consulta.data?.contagens ?? {};
  const totalGeral = STATUS_DOCUMENTOS.reduce((soma, item) => soma + (contagens[item] ?? 0), 0);
  const filtrando = Boolean(buscaAtrasada || dataFiltro || status !== "TODOS");
  const todosMarcados = lista.length > 0 && lista.every((evento) => selecionados.has(evento.id));

  async function baixar(id: string) {
    setBaixando(id);
    try {
      await baixarPdfDoEvento(id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível gerar o PDF.");
    } finally {
      setBaixando(null);
    }
  }

  function alternar(id: string, marcado: boolean) {
    setSelecionados((atuais) => {
      const proximos = new Set(atuais);
      if (marcado) proximos.add(id);
      else proximos.delete(id);
      return proximos;
    });
  }

  /** Marca ou desmarca os documentos desta página (a seleção vale entre páginas). */
  function marcarTodos(marcado: boolean) {
    setSelecionados((atuais) => {
      const proximos = new Set(atuais);
      for (const evento of lista) {
        if (marcado) proximos.add(evento.id);
        else proximos.delete(evento.id);
      }
      return proximos;
    });
  }

  function sairDaSelecao() {
    setSelecionando(false);
    setSelecionados(new Set());
  }

  async function baixarSelecionados() {
    if (selecionados.size > LIMITE_POR_VEZ) {
      toast.error(`Selecione no máximo ${LIMITE_POR_VEZ} documentos por vez.`);
      return;
    }
    setBaixando("varios");
    try {
      await baixarPdfsDosEventos([...selecionados]);
      toast.success(
        selecionados.size === 1
          ? "Documento baixado."
          : `${selecionados.size} cardápios juntos em um único PDF, prontos para imprimir.`,
      );
      sairDaSelecao();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível gerar os PDFs.");
    } finally {
      setBaixando(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Documentos" />

      {/* Filtro por status, com quantos documentos há em cada um. Quebra de linha no celular. */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por status">
        {FILTROS_STATUS.map((filtro) => {
          const ativo = status === filtro.valor;
          const quantidade = filtro.valor === "TODOS" ? totalGeral : (contagens[filtro.valor] ?? 0);
          return (
            <button
              key={filtro.valor}
              type="button"
              aria-pressed={ativo}
              onClick={() => setStatus(filtro.valor)}
              className={cn(
                "flex min-h-10 shrink-0 items-center gap-2 rounded-full px-3.5 text-sm font-medium ring-1 transition-colors sm:min-h-9 sm:px-4",
                ativo
                  ? "bg-primary text-primary-foreground ring-primary"
                  : "bg-surface text-foreground hover:bg-muted ring-black/5",
              )}
            >
              {filtro.rotulo}
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs tabular-nums",
                  ativo ? "bg-white/20" : "bg-muted text-muted-foreground",
                )}
              >
                {quantidade}
              </span>
            </button>
          );
        })}
      </div>

      <Panel className="p-5">
        {/* Celular: busca com o ⋯ ao lado; ordenação e data lado a lado embaixo. */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
          <div className="col-span-2 flex gap-2 sm:col-span-1">
            <div className="relative min-w-0 flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder={placeholderBusca}
                className="bg-surface border-0 pl-9 ring-1 ring-black/5 max-sm:h-11"
              />
            </div>
            {totalGeral ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0 max-sm:size-11"
                    aria-label="Mais opções"
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setSelecionando(true)}>
                    <CheckSquare className="size-4" />
                    Selecionar PDFs
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
          <Select value={ordem} onValueChange={(valor) => setOrdem(valor as OrdemDocumentos)}>
            <SelectTrigger
              className="bg-surface w-full border-0 ring-1 ring-black/5 max-sm:h-11 sm:w-44"
              aria-label="Ordenar documentos"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(ROTULOS_ORDEM) as OrdemDocumentos[]).map((chave) => (
                <SelectItem key={chave} value={chave}>
                  {ROTULOS_ORDEM[chave]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex min-w-0 items-center gap-1">
            <Input
              type="date"
              aria-label="Filtrar pela data do evento"
              title="Filtrar pela data do evento"
              value={dataFiltro}
              onChange={(event) => setDataFiltro(event.target.value)}
              className="bg-surface w-full min-w-0 border-0 px-2.5 ring-1 ring-black/5 max-sm:h-11 max-sm:text-sm sm:w-44 sm:px-3"
            />
            {dataFiltro ? (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Limpar filtro de data"
                onClick={() => setDataFiltro("")}
              >
                <X className="size-4" />
              </Button>
            ) : null}
          </div>
        </div>

        {selecionando ? (
          <div className="bg-primary/5 ring-primary/20 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl p-3 ring-1">
            <p className="text-sm">
              <strong>{selecionados.size}</strong>{" "}
              {selecionados.size === 1 ? "documento selecionado" : "documentos selecionados"}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="ghost" onClick={sairDaSelecao}>
                <X className="size-4" /> Cancelar
              </Button>
              <Button
                size="sm"
                disabled={!selecionados.size || baixando !== null}
                onClick={() => void baixarSelecionados()}
              >
                {baixando === "varios" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
                Baixar em um único PDF
              </Button>
            </div>
          </div>
        ) : null}

        {consulta.isPending ? (
          <LoadingState label="Carregando documentos…" />
        ) : consulta.isError ? (
          <ErrorState onRetry={() => void consulta.refetch()} />
        ) : lista.length === 0 ? (
          <EmptyState
            title={filtrando ? "Nenhum documento encontrado" : "Nenhum documento ainda"}
            description={
              filtrando
                ? "Ajuste a busca, a data ou o status para encontrar o evento."
                : "Quando um evento for aprovado, o cardápio em PDF aparece aqui."
            }
          />
        ) : (
          <div
            className={cn(
              "mt-4 overflow-x-auto transition-opacity",
              consulta.isPlaceholderData && "opacity-60",
            )}
            aria-busy={consulta.isFetching}
          >
            <table className="w-full sm:min-w-[860px] text-left text-sm">
              <thead>
                <tr className="text-muted-foreground border-b border-border text-[11px] uppercase">
                  {selecionando ? (
                    <th className="w-10 pb-2">
                      <Checkbox
                        checked={todosMarcados}
                        onCheckedChange={(marcado) => marcarTodos(marcado === true)}
                        aria-label="Selecionar todos desta página"
                      />
                    </th>
                  ) : null}
                  <th className="pb-2 font-medium">Cliente</th>
                  <th className="pb-2 font-medium max-sm:hidden">Data do evento</th>
                  <th className="pb-2 font-medium max-sm:hidden">Valor</th>
                  <th className="pb-2 font-medium max-sm:hidden">Recebido em</th>
                  <th className="pb-2 font-medium">Status</th>
                  {selecionando ? null : <th className="pb-2 font-medium text-right">PDF</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lista.map((evento) => {
                  const marcado = selecionados.has(evento.id);
                  return (
                    <tr
                      key={evento.id}
                      className={selecionando && marcado ? "bg-primary/5" : undefined}
                    >
                      {selecionando ? (
                        <td className="py-3 pr-3">
                          <Checkbox
                            checked={marcado}
                            onCheckedChange={(valor) => alternar(evento.id, valor === true)}
                            aria-label={`Selecionar ${evento.tipo} de ${evento.cliente.nome}`}
                          />
                        </td>
                      ) : null}
                      {/* Nome do cliente em destaque; o tipo do evento embaixo. */}
                      <td className="py-3 pr-3">
                        <Link
                          to="/admin/eventos/$id"
                          params={{ id: evento.id }}
                          className="font-medium hover:underline"
                        >
                          {evento.cliente.nome}
                        </Link>
                        <p className="text-muted-foreground text-xs">
                          {evento.tipo}
                          <span className="sm:hidden"> · {formatDate(evento.dataEvento)}</span>
                        </p>
                      </td>
                      <td className="text-muted-foreground py-3 pr-3 max-sm:hidden">
                        {formatDate(evento.dataEvento)}
                      </td>
                      <td className="py-3 pr-3 max-sm:hidden">
                        {evento.orcamentos[0] ? formatBRL(Number(evento.orcamentos[0].total)) : "—"}
                      </td>
                      <td className="text-muted-foreground py-3 pr-3 whitespace-nowrap max-sm:hidden">
                        {formatarRecebimento(evento.createdAt)}
                      </td>
                      <td className="py-3 pr-3">
                        <StatusBadge status={evento.status} />
                      </td>
                      {selecionando ? null : (
                        <td className="py-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="max-sm:size-11 max-sm:px-0"
                            disabled={baixando !== null}
                            aria-label={`Baixar PDF de ${evento.tipo} de ${evento.cliente.nome}`}
                            title="Baixar PDF"
                            onClick={() => void baixar(evento.id)}
                          >
                            {baixando === evento.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Download className="size-4" />
                            )}
                            <span className="hidden sm:inline">Baixar PDF</span>
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Paginacao
          pagina={pagina}
          porPagina={POR_PAGINA}
          total={total}
          carregando={consulta.isFetching}
          onMudar={(proxima) => {
            setPagina(proxima);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      </Panel>
    </div>
  );
}
