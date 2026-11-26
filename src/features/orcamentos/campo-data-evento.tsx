import { useState } from "react";
import { ptBR } from "date-fns/locale";
import { CalendarDays, ChevronDown } from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Data do calendário (meio-dia local, para não pular de dia com o fuso) a partir de AAAA-MM-DD. */
const paraDia = (data: string) => new Date(`${data}T12:00:00`);
const paraTexto = (dia: Date) =>
  [
    dia.getFullYear(),
    String(dia.getMonth() + 1).padStart(2, "0"),
    String(dia.getDate()).padStart(2, "0"),
  ].join("-");

/**
 * Campo da data do evento no formulário público, com calendário próprio no lugar do nativo do
 * navegador: os dias que a equipe bloqueou aparecem em vermelho, riscados e sem clique, e os
 * dias antes da data mínima ficam apagados. O calendário abre logo abaixo do campo.
 */
export function CampoDataEvento({
  valor,
  onChange,
  bloqueadas,
  minima,
  invalido,
  descricaoId,
}: {
  /** AAAA-MM-DD, ou vazio. */
  valor: string;
  onChange: (data: string) => void;
  /** Datas bloqueadas, AAAA-MM-DD. */
  bloqueadas: readonly string[];
  /** Primeira data aceita, AAAA-MM-DD. */
  minima: string;
  invalido?: boolean;
  descricaoId?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const diasBloqueados = bloqueadas.map(paraDia);
  const selecionado = valor ? paraDia(valor) : undefined;
  const texto = selecionado
    ? selecionado.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "Escolha a data";

  return (
    <div className="grid min-w-0 gap-1.5">
      <Label htmlFor="dataEvento" className="text-[13px]">
        Data do evento
      </Label>
      <button
        id="dataEvento"
        type="button"
        aria-expanded={aberto}
        aria-controls="dataEvento-calendario"
        aria-invalid={invalido || undefined}
        aria-describedby={descricaoId}
        onClick={() => setAberto((atual) => !atual)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setAberto(false);
        }}
        className={cn(
          "border-input bg-background focus-visible:ring-ring flex h-11 w-full min-w-0 items-center gap-2 rounded-md border px-3 text-left text-base focus-visible:ring-1 focus-visible:outline-none md:text-sm",
          invalido && "border-destructive",
        )}
      >
        <CalendarDays className="text-muted-foreground size-4 shrink-0" aria-hidden />
        <span
          className={cn(
            "min-w-0 flex-1 truncate first-letter:uppercase",
            !selecionado && "text-muted-foreground",
          )}
        >
          {texto}
        </span>
        <ChevronDown
          className={cn(
            "text-muted-foreground size-4 transition-transform",
            aberto && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {aberto ? (
        <div id="dataEvento-calendario" className="grid gap-2">
          <Calendar
            mode="single"
            locale={ptBR}
            selected={selecionado}
            defaultMonth={selecionado ?? paraDia(minima)}
            onSelect={(dia) => {
              if (!dia) return;
              onChange(paraTexto(dia));
              setAberto(false);
            }}
            disabled={[{ before: paraDia(minima) }, ...diasBloqueados]}
            showOutsideDays={false}
            modifiers={{ bloqueada: diasBloqueados }}
            modifiersClassNames={{
              bloqueada:
                // A célula desabilitada vem com transparência: aqui a cor fica cheia.
                // Vermelho cheio, mas num círculo menor que a célula: marca a data sem formar uma faixa.
                "opacity-100 [&_button]:bg-destructive! [&_button]:text-white! [&_button]:line-through [&_button]:opacity-100! [&_button]:mx-auto [&_button]:size-8! [&_button]:min-w-0! [&_button]:rounded-full! [&_button]:text-sm!",
            }}
            classNames={{
              caption_label: "select-none text-base font-semibold capitalize",
              weekday:
                "text-foreground/60 flex-1 select-none text-[11px] font-semibold uppercase tracking-wide",
              // Sem a transparência dupla do padrão (célula + botão), que apagava os dias passados.
              disabled: "text-muted-foreground",
              today: "[&_button]:ring-primary [&_button]:ring-1 [&_button]:text-primary",
            }}
            className={cn(
              "bg-surface w-full rounded-xl p-3 shadow-sm ring-1 ring-black/10",
              "[--cell-size:min(2.75rem,calc((100vw_-_6rem)/7))] [&_td]:aspect-auto [&_td]:h-(--cell-size) [&_td_button]:aspect-auto [&_td_button]:h-(--cell-size)",
              // Dias livres em destaque; passados em cinza legível, sem parecer clicáveis.
              "[&_td_button]:text-foreground/75 [&_td_button]:text-[15px] [&_td_button]:font-normal [&_td_button:not(:disabled):hover]:bg-primary/10",
              "[&_td_button:disabled]:font-normal [&_td_button:disabled]:opacity-100 [&_td_button:disabled]:text-muted-foreground/70",
            )}
          />
          {bloqueadas.length ? (
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <span className="bg-destructive size-3 rounded-full" aria-hidden />
              Data indisponível
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
