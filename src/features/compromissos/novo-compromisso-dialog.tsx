import { useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { criarCompromisso } from "@/features/compromissos/server-functions";

export function NovoCompromissoDialog({
  aberto,
  onOpenChange,
  dataInicial,
  onSalvo,
}: {
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
  /** Data já selecionada na agenda, no formato YYYY-MM-DD. */
  dataInicial: string;
  onSalvo: () => unknown;
}) {
  const criar = useServerFn(criarCompromisso);
  const [salvando, setSalvando] = useState(false);

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const form = new FormData(evento.currentTarget);
    const texto = (campo: string) => String(form.get(campo) ?? "").trim();
    setSalvando(true);
    try {
      await criar({
        data: {
          titulo: texto("titulo"),
          data: texto("data"),
          hora: texto("hora") || null,
          observacoes: texto("observacoes") || null,
        },
      });
      toast.success("Compromisso adicionado à agenda.");
      onOpenChange(false);
      await onSalvo();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo compromisso</DialogTitle>
          <DialogDescription>
            Lembretes da equipe que aparecem na agenda junto com eventos e vencimentos.
          </DialogDescription>
        </DialogHeader>
        {/* key: reabre com a data selecionada na agenda e os campos limpos. */}
        <form key={`${aberto}-${dataInicial}`} onSubmit={salvar} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="compromisso-titulo">Compromisso</Label>
            <Input
              id="compromisso-titulo"
              name="titulo"
              required
              minLength={2}
              maxLength={200}
              placeholder="Ex.: Pagar boleto da fornecedora de bebidas"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="compromisso-data">Data</Label>
              <Input
                id="compromisso-data"
                name="data"
                type="date"
                required
                defaultValue={dataInicial}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="compromisso-hora">Horário (opcional)</Label>
              <Input id="compromisso-hora" name="hora" type="time" />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="compromisso-observacoes">Observações (opcional)</Label>
            <Textarea
              id="compromisso-observacoes"
              name="observacoes"
              maxLength={2000}
              rows={3}
              placeholder="Ex.: Boleto enviado por e-mail, vence às 18h"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando}>
              {salvando ? <Loader2 className="size-4 animate-spin" /> : null}
              Salvar compromisso
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
