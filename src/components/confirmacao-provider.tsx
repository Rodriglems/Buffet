import { useCallback, useRef, useState, type ReactNode } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ConfirmacaoContext, type PedidoConfirmacao } from "@/lib/confirmacao";
import { cn } from "@/lib/utils";

/** Modal único de confirmação do sistema, aberto por useConfirmar(). */
export function ConfirmacaoProvider({ children }: { children: ReactNode }) {
  const [pedido, setPedido] = useState<PedidoConfirmacao | null>(null);
  const resolver = useRef<((confirmado: boolean) => void) | null>(null);

  const confirmar = useCallback((novo: PedidoConfirmacao) => {
    // Um pedido pendente (raro) é encerrado como "cancelado" antes de abrir o próximo.
    resolver.current?.(false);
    setPedido(novo);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  function responder(confirmado: boolean) {
    resolver.current?.(confirmado);
    resolver.current = null;
    setPedido(null);
  }

  return (
    <ConfirmacaoContext.Provider value={confirmar}>
      {children}
      <AlertDialog
        open={pedido !== null}
        onOpenChange={(aberto) => (aberto ? null : responder(false))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pedido?.titulo}</AlertDialogTitle>
            {pedido?.descricao ? (
              <AlertDialogDescription>{pedido.descricao}</AlertDialogDescription>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => responder(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => responder(true)}
              className={cn(
                pedido?.perigoso &&
                  "bg-destructive text-destructive-foreground hover:bg-destructive/90",
              )}
            >
              {pedido?.textoConfirmar ?? "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmacaoContext.Provider>
  );
}
