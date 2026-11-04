import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Search, X } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listarClientes } from "@/features/clientes/server-functions";
import { telefoneDe } from "@/lib/empresa-cabecalho";
import type { StatusAcessoCliente } from "@/lib/acesso-cliente";
import { cn } from "@/lib/utils";

export type ClienteEscolhido = {
  id: string;
  nome: string;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  acesso: StatusAcessoCliente;
};

const contatoDe = (cliente: Pick<ClienteEscolhido, "telefone" | "whatsapp" | "email">) =>
  [telefoneDe(cliente.telefone ?? cliente.whatsapp), cliente.email].filter(Boolean).join(" · ") ||
  "Sem contato";

/**
 * Campo único para achar o cliente por nome, telefone ou e-mail, ou cadastrar um novo. A busca
 * é feita no servidor, porque a base pode ter centenas de nomes.
 */
export function SeletorCliente({
  escolhido,
  podeCriar,
  onEscolher,
  onLimpar,
  onCriar,
}: {
  escolhido: ClienteEscolhido | null;
  podeCriar: boolean;
  onEscolher: (cliente: ClienteEscolhido) => void;
  onLimpar: () => void;
  /** Abre o cadastro rápido com o que foi digitado. */
  onCriar: (digitado: string) => void;
}) {
  const buscar = useServerFn(listarClientes);
  const idLista = useId();
  const raiz = useRef<HTMLDivElement>(null);
  const [texto, setTexto] = useState("");
  const [termo, setTermo] = useState("");
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);

  useEffect(() => {
    const espera = setTimeout(() => setTermo(texto.trim()), 250);
    return () => clearTimeout(espera);
  }, [texto]);

  // Fecha a lista ao clicar fora do campo.
  useEffect(() => {
    if (!aberto) return;
    const aoClicar = (evento: PointerEvent) => {
      if (!raiz.current?.contains(evento.target as Node)) setAberto(false);
    };
    document.addEventListener("pointerdown", aoClicar);
    return () => document.removeEventListener("pointerdown", aoClicar);
  }, [aberto]);

  const consulta = useQuery({
    queryKey: ["clientes-busca", termo],
    queryFn: () => buscar({ data: { page: 1, pageSize: 8, busca: termo } }),
    enabled: aberto && !escolhido,
    staleTime: 10_000,
  });
  const clientes = consulta.data?.items ?? [];
  const mostrarCriar = podeCriar && termo.length > 0;
  const totalOpcoes = clientes.length + (mostrarCriar ? 1 : 0);

  if (escolhido) {
    return (
      <div className="bg-surface flex flex-wrap items-center justify-between gap-3 rounded-xl p-3 ring-1 ring-black/5">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-medium">
            {escolhido.nome}
            <StatusBadge status={escolhido.acesso} dot={false} />
          </p>
          <p className="text-muted-foreground text-xs">{contatoDe(escolhido)}</p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={onLimpar}>
          <X className="size-4" /> Trocar cliente
        </Button>
      </div>
    );
  }

  function confirmar(indice: number) {
    const cliente = clientes[indice];
    if (cliente) {
      onEscolher(cliente);
      setTexto("");
      setAberto(false);
    } else if (mostrarCriar) {
      onCriar(termo);
      setAberto(false);
    }
  }

  function aoTeclar(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      setAberto(true);
      setAtivo((atual) => Math.min(atual + 1, Math.max(totalOpcoes - 1, 0)));
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setAtivo((atual) => Math.max(atual - 1, 0));
    } else if (evento.key === "Enter") {
      // Enter escolhe na lista; não envia o formulário do evento.
      evento.preventDefault();
      if (aberto && totalOpcoes) confirmar(ativo);
    } else if (evento.key === "Escape" && aberto) {
      evento.stopPropagation();
      setAberto(false);
    }
  }

  return (
    <div ref={raiz} className="relative">
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          role="combobox"
          aria-label="Buscar cliente"
          aria-expanded={aberto}
          aria-controls={idLista}
          aria-autocomplete="list"
          aria-activedescendant={aberto && totalOpcoes ? `${idLista}-${ativo}` : undefined}
          autoComplete="off"
          placeholder="Busque por nome, telefone ou e-mail"
          className="bg-surface border-0 pl-9 ring-1 ring-black/5"
          value={texto}
          onFocus={() => setAberto(true)}
          onChange={(evento) => {
            setTexto(evento.target.value);
            setAtivo(0);
            setAberto(true);
          }}
          onKeyDown={aoTeclar}
        />
      </div>
      {aberto ? (
        <ul
          id={idLista}
          role="listbox"
          aria-label="Clientes encontrados"
          className="bg-popover absolute z-30 mt-1 max-h-80 w-full overflow-y-auto rounded-xl border p-1 shadow-lg"
        >
          {consulta.isFetching && !clientes.length ? (
            <li className="text-muted-foreground flex items-center gap-2 p-3 text-sm">
              <Loader2 className="size-4 animate-spin" /> Buscando…
            </li>
          ) : null}
          {consulta.isError ? (
            <li className="text-destructive p-3 text-sm">Não foi possível buscar os clientes.</li>
          ) : null}
          {clientes.map((cliente, indice) => (
            <li
              key={cliente.id}
              id={`${idLista}-${indice}`}
              role="option"
              aria-selected={ativo === indice}
              className={cn(
                "flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm",
                ativo === indice && "bg-accent",
              )}
              onPointerEnter={() => setAtivo(indice)}
              onClick={() => confirmar(indice)}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{cliente.nome}</span>
                <span className="text-muted-foreground block truncate text-xs">
                  {contatoDe(cliente)}
                </span>
              </span>
              <StatusBadge status={cliente.acesso} dot={false} />
            </li>
          ))}
          {!consulta.isFetching && !consulta.isError && !clientes.length ? (
            <li className="text-muted-foreground p-3 text-sm">
              {termo ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado ainda."}
            </li>
          ) : null}
          {mostrarCriar ? (
            <li
              id={`${idLista}-${clientes.length}`}
              role="option"
              aria-selected={ativo === clientes.length}
              className={cn(
                "text-primary flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
                ativo === clientes.length && "bg-accent",
              )}
              onPointerEnter={() => setAtivo(clientes.length)}
              onClick={() => confirmar(clientes.length)}
            >
              <Plus className="size-4 shrink-0" />
              <span className="truncate">Cadastrar “{termo}” como novo cliente</span>
            </li>
          ) : null}
        </ul>
      ) : null}
      {podeCriar && !aberto && !termo ? (
        <button
          type="button"
          className="text-primary mt-2 text-xs font-medium hover:underline"
          onClick={() => onCriar("")}
        >
          + Cadastrar novo cliente
        </button>
      ) : null}
    </div>
  );
}
