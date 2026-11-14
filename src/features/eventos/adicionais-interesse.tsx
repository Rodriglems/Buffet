import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
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
import { atualizarEvento } from "@/features/eventos/server-functions";

const LIMITE_ADICIONAIS = 10;

/** Resumo discreto com edição dos interesses informados para um evento específico. */
export function AdicionaisInteresseEvento({
  eventoId,
  itens,
}: {
  eventoId: string;
  itens: string[];
}) {
  const router = useRouter();
  const atualizar = useServerFn(atualizarEvento);
  const [aberto, setAberto] = useState(false);
  const [valores, setValores] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);

  function abrirEdicao() {
    setValores(itens.length ? [...itens] : [""]);
    setAberto(true);
  }

  function alterar(indice: number, valor: string) {
    setValores((atuais) => atuais.map((item, atual) => (atual === indice ? valor : item)));
  }

  function remover(indice: number) {
    setValores((atuais) => atuais.filter((_, atual) => atual !== indice));
  }

  async function salvar() {
    const limpos = valores.map((item) => item.trim()).filter(Boolean);
    if (limpos.some((item) => item.length < 2)) {
      toast.error("Cada adicional precisa ter pelo menos 2 caracteres.");
      return;
    }
    const normalizados = new Set(limpos.map((item) => item.toLocaleLowerCase("pt-BR")));
    if (normalizados.size !== limpos.length) {
      toast.error("Remova os adicionais repetidos antes de salvar.");
      return;
    }

    setSalvando(true);
    try {
      await atualizar({ data: { id: eventoId, dados: { servicosAdicionais: limpos } } });
      await router.invalidate();
      setAberto(false);
      toast.success("Adicionais de interesse atualizados.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível salvar os adicionais.",
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <div className="border-border mt-4 flex items-start justify-between gap-3 border-t pt-4">
        <div className="min-w-0">
          <p className="text-sm font-medium">Adicionais de interesse</p>
          <p className="text-muted-foreground mt-0.5 text-sm leading-5">
            {itens.length ? itens.join(" · ") : "Nenhum adicional informado"}
          </p>
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-10 shrink-0"
          aria-label="Editar adicionais de interesse"
          title="Editar adicionais de interesse"
          onClick={abrirEdicao}
        >
          <Pencil className="size-4" />
        </Button>
      </div>

      <Dialog open={aberto} onOpenChange={(proximo) => !salvando && setAberto(proximo)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionais de interesse</DialogTitle>
            <DialogDescription>
              Ajuste o que o cliente demonstrou interesse para este evento.
            </DialogDescription>
          </DialogHeader>

          <div className="grid max-h-[50vh] gap-2 overflow-y-auto py-1">
            {valores.map((valor, indice) => (
              <div key={indice} className="flex items-center gap-2">
                <Input
                  value={valor}
                  maxLength={160}
                  aria-label={`Adicional ${indice + 1}`}
                  placeholder="Ex.: Serviço de garçom"
                  onChange={(event) => alterar(indice, event.target.value)}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="text-destructive hover:text-destructive size-10 shrink-0"
                  aria-label={`Remover adicional ${indice + 1}`}
                  title="Remover"
                  onClick={() => remover(indice)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            className="justify-self-start"
            disabled={valores.length >= LIMITE_ADICIONAIS}
            onClick={() => setValores((atuais) => [...atuais, ""])}
          >
            <Plus className="size-4" /> Adicionar interesse
          </Button>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={salvando}
              onClick={() => setAberto(false)}
            >
              Cancelar
            </Button>
            <Button type="button" disabled={salvando} onClick={() => void salvar()}>
              {salvando ? <Loader2 className="size-4 animate-spin" /> : null}
              Salvar alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
