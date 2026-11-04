import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { verificarClienteExistente } from "@/features/clientes/server-functions";

export type ContatoDigitado = {
  nome?: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
};

export type ClienteParecido = Awaited<ReturnType<typeof verificarClienteExistente>>[number];

/** Procura cadastros parecidos enquanto a equipe digita, com uma pequena espera entre as teclas. */
export function useClientesParecidos(contato: ContatoDigitado) {
  const verificar = useServerFn(verificarClienteExistente);
  const chave = JSON.stringify(contato);
  const [chaveAtrasada, setChaveAtrasada] = useState(chave);
  useEffect(() => {
    const espera = setTimeout(() => setChaveAtrasada(chave), 400);
    return () => clearTimeout(espera);
  }, [chave]);
  const consulta = useQuery({
    queryKey: ["clientes-parecidos", chaveAtrasada],
    queryFn: () => verificar({ data: JSON.parse(chaveAtrasada) as ContatoDigitado }),
    staleTime: 10_000,
  });
  return consulta.data ?? [];
}

export function descreverParecidos(parecidos: ClienteParecido[]) {
  return parecidos.map((cliente) => `${cliente.nome} (mesmo ${cliente.motivo})`).join(", ");
}
