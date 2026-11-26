import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ptBR } from "date-fns/locale";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { ErrorState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  bloquearDatas,
  desbloquearData,
  listarDatasBloqueadas,
} from "@/features/eventos/bloqueios";
import { contagem } from "@/features/servicos/regras-cardapio";
import { useConfirmar } from "@/lib/confirmacao";
import { cn } from "@/lib/utils";

const CHAVE = ["datas-bloqueadas"] as const;

/** Data do calendário (meio-dia local, para não pular de dia com o fuso) a partir de AAAA-MM-DD. */
const paraDia = (data: string) => new Date(`${data}T12:00:00`);
const paraTexto = (dia: Date) =>
  [
    dia.getFullYear(),
    String(dia.getMonth() + 1).padStart(2, "0"),
    String(dia.getDate()).padStart(2, "0"),
  ].join("-");

/**
 * Janela da aba Eventos para bloquear datas no formulário público de orçamento. O cliente não
 * consegue pedir orçamento nesses dias e nunca vê o motivo, que é só para a equipe. Tudo acontece
 * no calendário: tocar num dia livre o escolhe para bloquear; tocar num dia bloqueado (em vermelho)
 * o desbloqueia, depois de confirmar.
 */
export function DatasBloqueadasDialog({
  aberto,
  onOpenChange,
}: {
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const listar = useServerFn(listarDatasBloqueadas);
  const bloquear = useServerFn(bloquearDatas);
  const desbloquear = useServerFn(desbloquearData);
  const pedirConfirmacao = useConfirmar();
  const consulta = useQuery({ queryKey: CHAVE, queryFn: () => listar(), enabled: aberto });
  const [selecionadas, setSelecionadas] = useState<Date[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [desbloqueando, setDesbloqueando] = useState(false);

  const bloqueadas = consulta.data ?? [];
  const porData = new Map(bloqueadas.map((item) => [item.data, item]));
  const diasBloqueados = bloqueadas.map((item) => paraDia(item.data));
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  function fechar(proximo: boolean) {
    if (!proximo) {
      setSelecionadas([]);
    }
    onOpenChange(proximo);
  }

  async function salvar() {
    if (!selecionadas.length) return;
    setSalvando(true);
    try {
      const { bloqueadas: total } = await bloquear({
        data: { datas: selecionadas.map(paraTexto) },
      });
      await queryClient.invalidateQueries({ queryKey: CHAVE });
      toast.success(
        `${contagem(total, "data bloqueada", "datas bloqueadas")} no formulário de orçamento.`,
      );
      setSelecionadas([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível bloquear as datas.");
    } finally {
      setSalvando(false);
    }
  }

  /** Toque num dia bloqueado: confirma e libera a data. */
  async function liberar(dia: Date) {
    const item = porData.get(paraTexto(dia));
    if (!item || desbloqueando) return;
    const dataLonga = dia.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    });
    const ok = await pedirConfirmacao({
      titulo: `Desbloquear ${dataLonga}?`,
      descricao: "O cliente volta a poder pedir orçamento nesse dia.",
      textoConfirmar: "Desbloquear",
    });
    if (!ok) return;
    setDesbloqueando(true);
    try {
      await desbloquear({ data: { id: item.id } });
      await queryClient.invalidateQueries({ queryKey: CHAVE });
      toast.success(`${dia.toLocaleDateString("pt-BR")} liberada para orçamentos.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível desbloquear.");
    } finally {
      setDesbloqueando(false);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={fechar}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 p-0 sm:max-w-xl">
        <DialogHeader className="border-border border-b px-6 pt-6 pb-4 pr-12 text-left">
          <DialogTitle>Datas bloqueadas</DialogTitle>
          {/* Só para leitor de tela: a janela precisa de uma descrição. */}
          <DialogDescription className="sr-only">
            Escolha dias livres para bloquear ou toque num dia bloqueado para desbloquear.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="bg-primary size-3 rounded-full" /> Escolhida agora
            </span>
            <span className="flex items-center gap-1.5">
              <span className="bg-destructive size-3 rounded-full" /> Bloqueada
            </span>
            {consulta.isPending || desbloqueando ? (
              <Loader2 className="size-3.5 animate-spin" aria-label="Carregando" />
            ) : null}
          </div>
          {consulta.isError ? <ErrorState onRetry={() => void consulta.refetch()} /> : null}
          <Calendar
            mode="multiple"
            locale={ptBR}
            selected={selecionadas}
            // Dia bloqueado não entra na seleção: o toque nele é para desbloquear.
            onSelect={(dias) =>
              setSelecionadas((dias ?? []).filter((dia) => !porData.has(paraTexto(dia))))
            }
            onDayClick={(dia, modificadores) => {
              if (modificadores["bloqueada"]) void liberar(dia);
            }}
            disabled={{ before: hoje }}
            showOutsideDays={false}
            modifiers={{ bloqueada: diasBloqueados }}
            // Mesmo visual do calendário do formulário público: datas marcadas num círculo menor
            // que a célula (vermelho = bloqueada, azul = escolhida agora).
            modifiersClassNames={{
              bloqueada:
                "[&_button]:bg-destructive! [&_button]:text-white! [&_button]:line-through [&_button]:hover:bg-destructive/85!",
              selected: "[&_button]:bg-primary! [&_button]:text-primary-foreground!",
            }}
            classNames={{
              caption_label: "select-none text-base font-semibold capitalize",
              weekday:
                "text-foreground/60 flex-1 select-none text-[11px] font-semibold uppercase tracking-wide",
              disabled: "text-muted-foreground",
              today: "[&_button]:ring-primary [&_button]:ring-1",
            }}
            className={cn(
              "bg-surface w-full rounded-xl p-3 shadow-sm ring-1 ring-black/10",
              "[--cell-size:min(2.75rem,calc((100vw_-_6rem)/7))] [&_td]:aspect-auto [&_td]:h-(--cell-size)",
              "[&_td_button]:mx-auto [&_td_button]:size-8! [&_td_button]:min-w-0! [&_td_button]:rounded-full!",
              "[&_td_button]:text-foreground/75 [&_td_button]:text-[15px] [&_td_button]:font-normal [&_td_button:not(:disabled):hover]:bg-primary/10",
              "[&_td_button:disabled]:opacity-100 [&_td_button:disabled]:text-muted-foreground/70",
            )}
          />
        </div>

        <DialogFooter className="border-border bg-background flex-row justify-end gap-2 border-t px-6 py-4">
          <Button type="button" variant="outline" onClick={() => fechar(false)}>
            Fechar
          </Button>
          <Button
            type="button"
            disabled={!selecionadas.length || salvando}
            onClick={() => void salvar()}
          >
            {salvando ? <Loader2 className="size-4 animate-spin" /> : null}
            {selecionadas.length
              ? `Bloquear ${contagem(selecionadas.length, "data", "datas")}`
              : "Escolha as datas"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
