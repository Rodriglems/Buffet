import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { atualizarEvento } from "@/features/eventos/server-functions";
import { useConfirmar } from "@/lib/confirmacao";
import {
  DESCRICOES_STATUS_EVENTO,
  ROTULOS_STATUS_EVENTO,
  STATUS_EVENTO,
  type StatusEvento,
} from "@/lib/status-evento";

export function AlterarStatusEvento({ eventoId, status }: { eventoId: string; status: string }) {
  const atualizar = useServerFn(atualizarEvento);
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);
  const confirmar = useConfirmar();

  async function alterar(novo: StatusEvento) {
    if (novo === status) return;
    if (
      novo === "CANCELADO" &&
      !(await confirmar({
        titulo: "Cancelar este evento?",
        descricao: "O evento sai do fluxo de etapas. Você pode reativá-lo depois pelo status.",
        textoConfirmar: "Cancelar evento",
        perigoso: true,
      }))
    ) {
      return;
    }
    setSalvando(true);
    try {
      await atualizar({ data: { id: eventoId, dados: { status: novo } } });
      toast.success(`Status alterado para “${ROTULOS_STATUS_EVENTO[novo]}”.`);
      await router.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível alterar o status.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Select
      value={status}
      disabled={salvando}
      onValueChange={(valor) => void alterar(valor as StatusEvento)}
    >
      <SelectTrigger className="w-48" aria-label="Status do evento">
        {/* Sem filhos, o Radix copiaria também a descrição do item para o botão. */}
        <SelectValue>{ROTULOS_STATUS_EVENTO[status as StatusEvento] ?? status}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {STATUS_EVENTO.map((item) => (
          <SelectItem key={item} value={item}>
            <span className="flex flex-col">
              <span>{ROTULOS_STATUS_EVENTO[item]}</span>
              <span className="text-muted-foreground text-[11px]">
                {DESCRICOES_STATUS_EVENTO[item]}
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
