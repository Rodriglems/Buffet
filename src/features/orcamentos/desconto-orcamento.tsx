import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TipoDesconto } from "@/features/orcamentos/calculos";
import { atualizarDescontoOrcamento } from "@/features/orcamentos/server-functions";
import { formatBRL } from "@/lib/format";
import { lerNumero, limparNumeroDigitado } from "@/lib/numero";

const STATUS_SEM_DESCONTO = ["REJEITADO", "EXPIRADO", "CANCELADO"];

function podeAlterarDesconto(status: string) {
  return !STATUS_SEM_DESCONTO.includes(status);
}

export function DescontoOrcamento({
  orcamento,
}: {
  orcamento: {
    id: string;
    status: string;
    subtotal: string | number;
    tipoDesconto: TipoDesconto;
    descontoValor: string | number;
  };
}) {
  const atualizar = useServerFn(atualizarDescontoOrcamento);
  const router = useRouter();
  const [tipo, setTipo] = useState<TipoDesconto>(orcamento.tipoDesconto);
  const [valor, setValor] = useState(String(Number(orcamento.descontoValor)));
  const [salvando, setSalvando] = useState(false);
  const subtotal = Number(orcamento.subtotal);

  if (!podeAlterarDesconto(orcamento.status)) return null;

  const numero = lerNumero(valor);
  const erro =
    numero < 0
      ? "O desconto não pode ser negativo."
      : tipo === "PERCENTUAL" && numero > 100
        ? "O percentual vai de 0 a 100."
        : tipo === "VALOR_FIXO" && numero > subtotal
          ? `O desconto não pode passar de ${formatBRL(subtotal)}.`
          : null;

  async function aplicar() {
    if (erro) {
      toast.error(erro);
      return;
    }
    setSalvando(true);
    try {
      await atualizar({ data: { id: orcamento.id, tipoDesconto: tipo, desconto: numero } });
      toast.success("Desconto aplicado com sucesso.");
      await router.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível aplicar o desconto.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor={`desconto-${orcamento.id}`}>Aplicar ou alterar desconto</Label>
      <div className="grid grid-cols-[1fr_7rem] gap-2">
        <Select value={tipo} onValueChange={(novo) => setTipo(novo as TipoDesconto)}>
          <SelectTrigger aria-label="Tipo de desconto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PERCENTUAL">Percentual (%)</SelectItem>
            <SelectItem value="VALOR_FIXO">Valor fixo (R$)</SelectItem>
          </SelectContent>
        </Select>
        <Input
          id={`desconto-${orcamento.id}`}
          inputMode="decimal"
          aria-invalid={Boolean(erro)}
          value={valor}
          onChange={(event) => setValor(limparNumeroDigitado(event.target.value))}
        />
      </div>
      {erro ? <p className="text-destructive text-xs">{erro}</p> : null}
      <Button
        type="button"
        size="sm"
        disabled={salvando || Boolean(erro)}
        onClick={() => void aplicar()}
      >
        {salvando ? "Aplicando…" : "Aplicar desconto"}
      </Button>
    </div>
  );
}
