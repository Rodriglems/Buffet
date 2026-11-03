import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { listarCardapiosEFormatos } from "@/features/servicos/cardapios-formatos";

export const CHAVE_CARDAPIOS_FORMATOS = ["cardapios-formatos"] as const;
export type AbaCardapiosFormatos = "formatos" | "cardapios";

/** Cardápios públicos e formatos da empresa, compartilhados entre a tela e o painel. */
export function useCardapiosEFormatos() {
  const carregar = useServerFn(listarCardapiosEFormatos);
  return useQuery({ queryKey: CHAVE_CARDAPIOS_FORMATOS, queryFn: () => carregar() });
}
