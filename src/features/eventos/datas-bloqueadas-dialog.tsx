import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ptBR } from "date-fns/locale";
import { CalendarX2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { ErrorState, LoadingState } from "@/components/states";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  bloquearDatas,
  desbloquearData,
  listarDatasBloqueadas,
} from "@/features/eventos/bloqueios";
import { chaveDaData } from "@/features/eventos/datas-bloqueadas";
import { contagem } from "@/features/servicos/regras-cardapio";

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
 * consegue pedir orçamento nesses dias e nunca vê o motivo, que é só para a equipe.
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
  const consulta = useQuery({ queryKey: CHAVE, queryFn: () => listar(), enabled: aberto });
  const [selecionadas, setSelecionadas] = useState<Date[]>([]);
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [desbloqueando, setDesbloqueando] = useState<string | null>(null);

  const bloqueadas = consulta.data ?? [];
  const diasBloqueados = bloqueadas.map((item) => paraDia(item.data));
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  function fechar(proximo: boolean) {
    if (!proximo) {
      setSelecionadas([]);
      setMotivo("");
    }
    onOpenChange(proximo);
  }

  async function salvar() {
    if (!selecionadas.length) return;
    setSalvando(true);
    try {
      const { bloqueadas: total } = await bloquear({
        data: { datas: selecionadas.map(paraTexto), motivo: motivo.trim() || undefined },
      });
      await queryClient.invalidateQueries({ queryKey: CHAVE });
      toast.success(
        `${contagem(total, "data bloqueada", "datas bloqueadas")} no formulário de orçamento.`,
      );
      setSelecionadas([]);
      setMotivo("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível bloquear as datas.");
    } finally {
      setSalvando(false);
    }
  }

  async function liberar(id: string, data: string) {
    setDesbloqueando(id);
    try {
      await desbloquear({ data: { id } });
      await queryClient.invalidateQueries({ queryKey: CHAVE });
      toast.success(`${paraDia(data).toLocaleDateString("pt-BR")} liberada para orçamentos.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível desbloquear.");
    } finally {
      setDesbloqueando(null);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={fechar}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 p-0 sm:max-w-xl">
        <DialogHeader className="border-border border-b px-6 pt-6 pb-4 pr-12 text-left">
          <DialogTitle>Datas bloqueadas</DialogTitle>
          <DialogDescription>
            O cliente não consegue pedir orçamento nesses dias. O motivo fica só para a equipe.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <section className="space-y-3">
            <p className="text-sm font-semibold">Bloquear novas datas</p>
            <div className="text-muted-foreground flex flex-wrap gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="bg-primary size-3 rounded-sm" /> Escolhida agora
              </span>
              <span className="flex items-center gap-1.5">
                <span className="bg-destructive/15 ring-destructive/40 size-3 rounded-sm ring-1" />{" "}
                Já bloqueada
              </span>
            </div>
            <Calendar
              mode="multiple"
              locale={ptBR}
              selected={selecionadas}
              onSelect={(dias) => setSelecionadas(dias ?? [])}
              // Passado e dias já bloqueados não podem ser escolhidos de novo.
              disabled={[{ before: hoje }, ...diasBloqueados]}
              modifiers={{ bloqueada: diasBloqueados }}
              modifiersClassNames={{
                bloqueada:
                  "[&_button]:bg-destructive/15 [&_button]:text-destructive [&_button]:line-through [&_button]:opacity-100",
              }}
              className="bg-surface w-full rounded-xl p-3 ring-1 ring-black/5 [--cell-size:min(2.75rem,calc((100vw_-_6rem)/7))] [&_td_button]:aspect-auto [&_td_button]:h-(--cell-size) [&_td]:aspect-auto [&_td]:h-(--cell-size)"
            />
            <div className="grid gap-1.5">
              <Label htmlFor="bloqueio-motivo">
                Motivo{" "}
                <span className="text-muted-foreground font-normal">(opcional, interno)</span>
              </Label>
              <Input
                id="bloqueio-motivo"
                maxLength={120}
                placeholder="Ex.: Natal, folga da equipe, evento fechado"
                value={motivo}
                onChange={(event) => setMotivo(event.target.value)}
                className="max-sm:h-11"
              />
            </div>
          </section>

          <section className="grid gap-2" aria-live="polite">
            <p className="text-sm font-semibold">Próximas datas bloqueadas</p>
            {consulta.isPending ? (
              <LoadingState label="Carregando…" />
            ) : consulta.isError ? (
              <ErrorState onRetry={() => void consulta.refetch()} />
            ) : bloqueadas.length ? (
              <ul className="divide-border divide-y rounded-xl ring-1 ring-black/5">
                {bloqueadas.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 px-3 py-2">
                    <CalendarX2 className="text-destructive size-4 shrink-0" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium first-letter:uppercase">
                        {paraDia(item.data).toLocaleDateString("pt-BR", {
                          weekday: "long",
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                      {item.motivo ? (
                        <span className="text-muted-foreground block text-xs">{item.motivo}</span>
                      ) : null}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 max-sm:h-11"
                      disabled={desbloqueando !== null}
                      onClick={() => void liberar(item.id, chaveDaData(item.data))}
                    >
                      {desbloqueando === item.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : null}
                      Desbloquear
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">
                Nenhuma data bloqueada. Escolha os dias no calendário acima.
              </p>
            )}
          </section>
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
