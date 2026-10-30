import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckSquare, Download, Loader2, MoreHorizontal, Search, X } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, Panel } from "@/components/panel";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/states";
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
  listarEventosComPdf,
} from "@/features/documentos/eventos-pdf";
import { formatBRL, formatDate } from "@/lib/format";
import { pageMeta } from "@/lib/meta";
import { usePlaceholderBusca } from "@/lib/placeholder-busca";

export const Route = createFileRoute("/admin/documentos")({
  head: () => pageMeta("Documentos", "PDFs dos eventos confirmados."),
  loader: () => listarEventosComPdf(),
  component: DocumentosPage,
});

const LIMITE_POR_VEZ = 50;

type EventoComPdf = Awaited<ReturnType<typeof listarEventosComPdf>>[number];
type Ordem = "chegada-recente" | "chegada-antiga" | "data-evento";

// "Chegada" é quando o pedido foi recebido (criação do evento).
const ORDENACOES: Record<
  Ordem,
  { rotulo: string; comparar: (a: EventoComPdf, b: EventoComPdf) => number }
> = {
  "chegada-recente": {
    rotulo: "Mais recentes",
    comparar: (a, b) => b.createdAt.localeCompare(a.createdAt),
  },
  "chegada-antiga": {
    rotulo: "Mais antigos",
    comparar: (a, b) => a.createdAt.localeCompare(b.createdAt),
  },
  "data-evento": {
    rotulo: "Data do evento",
    comparar: (a, b) => a.dataEvento.localeCompare(b.dataEvento),
  },
};

function formatarRecebimento(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DocumentosPage() {
  const placeholderBusca = usePlaceholderBusca("Buscar por evento ou cliente");
  const eventos = Route.useLoaderData();
  const [busca, setBusca] = useState("");
  const [baixando, setBaixando] = useState<string | null>(null);
  // Modo de seleção aberto pelo menu "⋯" para juntar vários cardápios em um único PDF.
  const [selecionando, setSelecionando] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(() => new Set());
  const [ordem, setOrdem] = useState<Ordem>("chegada-recente");
  const [dataFiltro, setDataFiltro] = useState("");
  const termo = busca.trim().toLowerCase();
  const lista = eventos
    .filter((evento) =>
      [evento.tipo, evento.nome, evento.cliente.nome].some((valor) =>
        valor.toLowerCase().includes(termo),
      ),
    )
    // Filtro pela data do evento (ex.: imprimir os cardápios de um dia).
    .filter((evento) => !dataFiltro || evento.dataEvento.slice(0, 10) === dataFiltro)
    .sort(ORDENACOES[ordem].comparar);
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
      <PageHeader
        title="Documentos"
        subtitle="O PDF de cada evento fica disponível quando ele é confirmado"
        actions={
          eventos.length ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Mais opções">
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
          ) : null
        }
      />
      <Panel className="p-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder={placeholderBusca}
              className="bg-surface border-0 pl-9 ring-1 ring-black/5"
            />
          </div>
          <Select value={ordem} onValueChange={(valor) => setOrdem(valor as Ordem)}>
            <SelectTrigger
              className="bg-surface w-full border-0 ring-1 ring-black/5 sm:w-44"
              aria-label="Ordenar documentos"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(ORDENACOES) as Ordem[]).map((chave) => (
                <SelectItem key={chave} value={chave}>
                  {ORDENACOES[chave].rotulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              aria-label="Filtrar pela data do evento"
              title="Filtrar pela data do evento"
              value={dataFiltro}
              onChange={(event) => setDataFiltro(event.target.value)}
              className="bg-surface w-full border-0 ring-1 ring-black/5 sm:w-44"
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

        {lista.length === 0 ? (
          <EmptyState
            title={eventos.length ? "Nenhum documento encontrado" : "Nenhum evento confirmado"}
            description={
              eventos.length
                ? "Ajuste a busca para encontrar o evento."
                : "Quando um evento for confirmado, o PDF dele aparece aqui."
            }
          />
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full sm:min-w-[860px] text-left text-sm">
              <thead>
                <tr className="text-muted-foreground border-b border-border text-[11px] uppercase">
                  {selecionando ? (
                    <th className="w-10 pb-2">
                      <Checkbox
                        checked={todosMarcados}
                        onCheckedChange={(marcado) => marcarTodos(marcado === true)}
                        aria-label="Selecionar todos"
                      />
                    </th>
                  ) : null}
                  <th className="pb-2 font-medium">Evento</th>
                  <th className="pb-2 font-medium max-sm:hidden">Cliente</th>
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
                      <td className="py-3 pr-3 font-medium">
                        <Link
                          to="/admin/eventos/$id"
                          params={{ id: evento.id }}
                          className="hover:underline"
                        >
                          {evento.tipo}
                        </Link>
                        <p className="text-muted-foreground text-xs font-normal sm:hidden">
                          {evento.cliente.nome} · {formatDate(evento.dataEvento)}
                        </p>
                      </td>
                      <td className="text-muted-foreground py-3 pr-3 max-sm:hidden">
                        {evento.cliente.nome}
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
      </Panel>
    </div>
  );
}
