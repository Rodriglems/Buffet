import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FORMAS_PAGAMENTO,
  planejarParcelas,
  type IntervaloParcelas,
} from "@/features/pagamentos/parcelas";
import { criarParcelas } from "@/features/pagamentos/server-functions";
import { formatBRL } from "@/lib/format";
import { lerNumero, limparNumeroDigitado } from "@/lib/numero";

/** Valor guardado como texto para não exibir zeros à esquerda durante a digitação. */
type ParcelaEditavel = { valor: string; dataVencimento: string; descricao: string };

export type EventoParaParcelas = {
  id: string;
  nome: string;
  cliente: string;
  /** Valor ainda sem parcela cadastrada (total do orçamento − parcelas existentes). */
  saldo: number;
};

const INTERVALOS = {
  mensal: { rotulo: "Mensal", valor: { tipo: "mensal" } },
  quinzenal: { rotulo: "A cada 15 dias", valor: { tipo: "dias", dias: 15 } },
  semanal: { rotulo: "Semanal", valor: { tipo: "dias", dias: 7 } },
  personalizado: { rotulo: "A cada X dias", valor: null },
} as const satisfies Record<string, { rotulo: string; valor: IntervaloParcelas | null }>;

type ChaveIntervalo = keyof typeof INTERVALOS;

function hojeIso() {
  const hoje = new Date();
  return [
    hoje.getFullYear(),
    String(hoje.getMonth() + 1).padStart(2, "0"),
    String(hoje.getDate()).padStart(2, "0"),
  ].join("-");
}

export function GerarParcelasDialog({
  aberto,
  onOpenChange,
  eventos,
  eventoFixoId,
  onSalvo,
}: {
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
  eventos: EventoParaParcelas[];
  eventoFixoId?: string;
  onSalvo: () => Promise<void> | void;
}) {
  const salvar = useServerFn(criarParcelas);
  const [eventoId, setEventoId] = useState(eventoFixoId ?? "");
  const [total, setTotal] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [primeiroVencimento, setPrimeiroVencimento] = useState(hojeIso);
  const [chaveIntervalo, setChaveIntervalo] = useState<ChaveIntervalo>("mensal");
  const [diasPersonalizados, setDiasPersonalizados] = useState("30");
  const [parcelas, setParcelas] = useState<ParcelaEditavel[]>([]);
  const [formaPagamento, setFormaPagamento] = useState("");
  const [salvando, setSalvando] = useState(false);

  const evento = eventos.find((item) => item.id === eventoId);
  const intervalo: IntervaloParcelas = useMemo(
    () =>
      INTERVALOS[chaveIntervalo].valor ?? {
        tipo: "dias",
        dias: Math.max(1, Number(diasPersonalizados) || 1),
      },
    [chaveIntervalo, diasPersonalizados],
  );

  useEffect(() => {
    if (!aberto) return;
    setEventoId(eventoFixoId ?? "");
    setQuantidade("1");
    setPrimeiroVencimento(hojeIso());
    setChaveIntervalo("mensal");
    setFormaPagamento("");
  }, [aberto, eventoFixoId]);

  // Depende só do id e do saldo: a lista de eventos é recriada a cada render do componente pai.
  const saldo = evento?.saldo;
  useEffect(() => {
    if (saldo !== undefined) setTotal(saldo > 0 ? saldo.toFixed(2) : "");
  }, [eventoId, saldo]);

  // Recalcula a simulação sempre que as condições mudam; ajustes manuais valem até a próxima mudança.
  useEffect(() => {
    const valor = lerNumero(total);
    const vezes = lerNumero(quantidade);
    if (!(valor > 0) || !(vezes >= 1) || !primeiroVencimento) {
      setParcelas([]);
      return;
    }
    setParcelas(
      planejarParcelas({
        total: valor,
        quantidade: Math.min(vezes, 60),
        primeiroVencimento,
        intervalo,
      }).map((parcela) => ({ ...parcela, valor: String(parcela.valor) })),
    );
  }, [total, quantidade, primeiroVencimento, intervalo]);

  function ajustar(indice: number, campo: "valor" | "dataVencimento", valor: string) {
    setParcelas((atuais) =>
      atuais.map((parcela, atual) =>
        atual === indice
          ? { ...parcela, [campo]: campo === "valor" ? limparNumeroDigitado(valor) : valor }
          : parcela,
      ),
    );
  }

  const somaParcelas = parcelas.reduce((soma, parcela) => soma + lerNumero(parcela.valor), 0);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!eventoId || !parcelas.length) return;
    if (!formaPagamento) {
      toast.error("Escolha a forma de pagamento.");
      return;
    }
    if (parcelas.some((parcela) => !(lerNumero(parcela.valor) > 0) || !parcela.dataVencimento)) {
      toast.error("Todas as parcelas precisam de valor e vencimento.");
      return;
    }
    setSalvando(true);
    try {
      await salvar({
        data: {
          eventoId,
          formaPagamento,
          parcelas: parcelas.map((parcela) => ({
            valor: lerNumero(parcela.valor),
            dataVencimento: new Date(`${parcela.dataVencimento}T12:00:00`),
            descricao: parcela.descricao,
          })),
        },
      });
      toast.success(
        parcelas.length === 1 ? "Parcela cadastrada." : `${parcelas.length} parcelas cadastradas.`,
      );
      onOpenChange(false);
      await onSalvo();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar as parcelas.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <form className="grid gap-4" onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Definir pagamento</DialogTitle>
            <DialogDescription>
              Escolha a forma de pagamento, divida o valor e defina o vencimento de cada parcela.
              Você pode ajustar valores e datas antes de salvar.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            {eventoFixoId ? null : (
              <div className="grid gap-1.5 sm:col-span-2">
                <Label>Evento</Label>
                <Select value={eventoId} onValueChange={setEventoId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o evento" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventos.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.nome} · {item.cliente}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Forma de pagamento</Label>
              <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                <SelectTrigger className="w-full" aria-label="Forma de pagamento">
                  <SelectValue placeholder="Selecione a forma de pagamento" />
                </SelectTrigger>
                <SelectContent>
                  {FORMAS_PAGAMENTO.map((forma) => (
                    <SelectItem key={forma} value={forma}>
                      {forma}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="parcelas-total">Valor a parcelar</Label>
              <Input
                id="parcelas-total"
                inputMode="decimal"
                required
                value={total}
                onChange={(event) => setTotal(limparNumeroDigitado(event.target.value))}
              />
              {evento ? (
                <p className="text-muted-foreground text-xs">
                  Saldo sem parcela: {formatBRL(Math.max(0, evento.saldo))}
                </p>
              ) : null}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="parcelas-quantidade">Número de parcelas</Label>
              <Input
                id="parcelas-quantidade"
                inputMode="numeric"
                required
                value={quantidade}
                onChange={(event) =>
                  setQuantidade(limparNumeroDigitado(event.target.value.replace(/\D/g, "")))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="parcelas-primeiro">Primeiro vencimento</Label>
              <Input
                id="parcelas-primeiro"
                type="date"
                required
                value={primeiroVencimento}
                onChange={(event) => setPrimeiroVencimento(event.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Intervalo entre parcelas</Label>
              <div className="flex gap-2">
                <Select
                  value={chaveIntervalo}
                  onValueChange={(valor) => setChaveIntervalo(valor as ChaveIntervalo)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(INTERVALOS).map(([chave, item]) => (
                      <SelectItem key={chave} value={chave}>
                        {item.rotulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {chaveIntervalo === "personalizado" ? (
                  <Input
                    aria-label="Dias entre parcelas"
                    type="number"
                    min="1"
                    className="w-20"
                    value={diasPersonalizados}
                    onChange={(event) => setDiasPersonalizados(event.target.value)}
                  />
                ) : null}
              </div>
            </div>
          </div>

          {parcelas.length ? (
            <div className="overflow-x-auto">
              <table className="tabela-formulario w-full min-w-[420px] text-left text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b border-border text-[11px] uppercase">
                    <th className="pb-2 font-medium">Parcela</th>
                    <th className="pb-2 font-medium">Vencimento</th>
                    <th className="pb-2 font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {parcelas.map((parcela, indice) => (
                    <tr key={indice}>
                      <td className="py-2 pr-3">{parcela.descricao}</td>
                      <td className="py-2 pr-3">
                        <Input
                          type="date"
                          aria-label={`Vencimento da ${parcela.descricao}`}
                          value={parcela.dataVencimento}
                          onChange={(event) =>
                            ajustar(indice, "dataVencimento", event.target.value)
                          }
                        />
                      </td>
                      <td className="py-2">
                        <Input
                          inputMode="decimal"
                          aria-label={`Valor da ${parcela.descricao}`}
                          value={parcela.valor}
                          onChange={(event) => ajustar(indice, "valor", event.target.value)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-muted-foreground mt-2 text-right text-xs">
                Soma das parcelas: <strong>{formatBRL(somaParcelas)}</strong>
              </p>
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={salvando || !eventoId || !parcelas.length || !formaPagamento}
            >
              {salvando ? "Salvando…" : "Salvar parcelas"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
