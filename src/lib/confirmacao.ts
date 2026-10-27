import { createContext, useContext } from "react";

export type PedidoConfirmacao = {
  titulo: string;
  descricao?: string;
  /** Texto do botão de confirmar (padrão: "Confirmar"). */
  textoConfirmar?: string;
  /** Ações destrutivas (excluir, cancelar) usam o botão vermelho. */
  perigoso?: boolean;
};

export type Confirmar = (pedido: PedidoConfirmacao) => Promise<boolean>;

export const ConfirmacaoContext = createContext<Confirmar | null>(null);

/**
 * Abre o modal de confirmação do sistema no lugar do window.confirm do navegador.
 * Uso: `if (!(await confirmar({ titulo: "Excluir item?" }))) return;`
 */
export function useConfirmar(): Confirmar {
  const confirmar = useContext(ConfirmacaoContext);
  if (!confirmar)
    throw new Error("useConfirmar precisa do ConfirmacaoProvider na raiz da aplicação.");
  return confirmar;
}
