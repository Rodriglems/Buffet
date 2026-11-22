import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { faixaDaPagina, totalDePaginas } from "@/lib/paginacao";

/** Rodapé de lista paginada: faixa de itens e botões Anterior/Próxima (44px no celular). */
export function Paginacao({
  pagina,
  porPagina,
  total,
  carregando = false,
  onMudar,
}: {
  pagina: number;
  porPagina: number;
  total: number;
  carregando?: boolean;
  onMudar: (pagina: number) => void;
}) {
  const paginas = totalDePaginas(total, porPagina);
  if (paginas <= 1) return null;
  return (
    <nav
      aria-label="Paginação"
      className="border-border mt-4 flex items-center justify-between gap-3 border-t pt-4"
    >
      <p className="text-muted-foreground text-sm tabular-nums">
        {faixaDaPagina(pagina, porPagina, total)}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="max-sm:size-11 max-sm:px-0"
          disabled={pagina <= 1 || carregando}
          onClick={() => onMudar(pagina - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeft className="size-4" />
          <span className="hidden sm:inline">Anterior</span>
        </Button>
        <span className="text-sm tabular-nums" aria-current="page">
          {pagina} de {paginas}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="max-sm:size-11 max-sm:px-0"
          disabled={pagina >= paginas || carregando}
          onClick={() => onMudar(pagina + 1)}
          aria-label="Próxima página"
        >
          <span className="hidden sm:inline">Próxima</span>
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </nav>
  );
}
