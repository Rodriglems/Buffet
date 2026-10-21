import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
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
import { Switch } from "@/components/ui/switch";
import { atualizarPermissoes } from "@/features/usuarios/server-functions";
import {
  PERMISSION_LABELS,
  parsePermissoes,
  type PermissionKey,
  type Permissoes,
} from "@/lib/permissions";

const grupos: { titulo: string; chaves: PermissionKey[] }[] = [
  {
    titulo: "Eventos e comercial",
    chaves: ["contatos", "eventos", "orcamentos", "contratos", "servicos"],
  },
  { titulo: "Financeiro", chaves: ["financeiro", "pagamentos", "custos"] },
  {
    titulo: "Organização",
    chaves: ["agenda", "atividades", "notificacoes", "usuarios", "configuracoes"],
  },
];

export function PermissoesDialog({
  aberto,
  onOpenChange,
  usuario,
  proprio,
}: {
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
  usuario: { id: string; nome: string; role: string; permissoes: unknown };
  proprio: boolean;
}) {
  const router = useRouter();
  const salvar = useServerFn(atualizarPermissoes);
  const [permissoes, setPermissoes] = useState<Permissoes>(() =>
    parsePermissoes(usuario.permissoes),
  );
  const [enviando, setEnviando] = useState(false);
  const cliente = usuario.role === "CLIENT";

  function alternar(chave: PermissionKey, valor: boolean) {
    if (proprio && (chave === "usuarios" || chave === "configuracoes")) return;
    setPermissoes((atual) => ({ ...atual, [chave]: valor }));
  }

  async function confirmar() {
    setEnviando(true);
    try {
      await salvar({ data: { id: usuario.id, permissoes } });
      toast.success("Permissões atualizadas.");
      onOpenChange(false);
      await router.invalidate();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível salvar as permissões.",
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog
      open={aberto}
      onOpenChange={(next) => {
        if (next) setPermissoes(parsePermissoes(usuario.permissoes));
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Permissões de {usuario.nome}</DialogTitle>
          <DialogDescription>
            {cliente
              ? "Este acesso entra só no portal do cliente. As áreas administrativas não se aplicam."
              : "O início continua disponível. Cada item e cada aba do menu segue a permissão marcada."}
          </DialogDescription>
        </DialogHeader>
        {cliente ? null : (
          <div className="flex flex-col gap-5">
            {grupos.map((grupo) => (
              <section key={grupo.titulo}>
                <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
                  {grupo.titulo}
                </p>
                <div className="mt-2 flex flex-col gap-3">
                  {grupo.chaves.map((chave) => {
                    const bloqueada =
                      proprio && (chave === "usuarios" || chave === "configuracoes");
                    return (
                      <label
                        key={chave}
                        className="flex items-center justify-between gap-4 text-sm"
                      >
                        <span>
                          {PERMISSION_LABELS[chave]}
                          {bloqueada ? (
                            <span className="text-muted-foreground block text-[11px]">
                              Seu próprio acesso a esta área permanece ativo.
                            </span>
                          ) : null}
                        </span>
                        <Switch
                          checked={permissoes[chave]}
                          disabled={bloqueada}
                          onCheckedChange={(valor) => alternar(chave, valor)}
                        />
                      </label>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          {cliente ? null : (
            <Button type="button" disabled={enviando} onClick={() => void confirmar()}>
              {enviando ? "Salvando…" : "Salvar permissões"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
