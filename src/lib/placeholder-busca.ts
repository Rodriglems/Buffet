import { useEffect, useState } from "react";

const CELULAR = "(max-width: 639px)";

/**
 * Dica do campo de busca: completa no computador e só "Buscar" no celular, onde o texto
 * longo fica cortado. Começa com a versão longa para o HTML do servidor bater com o do navegador.
 */
export function usePlaceholderBusca(completo: string, curto = "Buscar"): string {
  const [celular, setCelular] = useState(false);
  useEffect(() => {
    const consulta = window.matchMedia(CELULAR);
    const atualizar = () => setCelular(consulta.matches);
    atualizar();
    consulta.addEventListener("change", atualizar);
    return () => consulta.removeEventListener("change", atualizar);
  }, []);
  return celular ? curto : completo;
}
