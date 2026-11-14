import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, Panel } from "@/components/panel";
import { EmptyState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { AtivarPush } from "@/features/notificacoes/ativar-push";
import { avisarNotificacoesAtualizadas } from "@/features/notificacoes/eventos-cliente";
import {
  gerarLembretesOperacionais,
  limparNotificacoes,
  listarNotificacoes,
  marcarNotificacaoLida,
  marcarTodasLidas,
} from "@/features/notificacoes/server-functions";
import { useConfirmar } from "@/lib/confirmacao";
import { formatDate } from "@/lib/format";
import { pageMeta } from "@/lib/meta";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/notificacoes")({
  head: () => pageMeta("Notificações", "Alertas de pagamentos, orçamentos e eventos."),
  loader: () => listarNotificacoes({ data: { page: 1, pageSize: 100, apenasNaoLidas: false } }),
  component: Notificacoes,
});

function Notificacoes() {
  const { items: lista, naoLidas } = Route.useLoaderData();
  const marcarUma = useServerFn(marcarNotificacaoLida);
  const marcarTodas = useServerFn(marcarTodasLidas);
  const limparTodas = useServerFn(limparNotificacoes);
  const gerarLembretes = useServerFn(gerarLembretesOperacionais);
  const confirmar = useConfirmar();
  const router = useRouter();
  const [limpando, setLimpando] = useState(false);

  async function limpar() {
    const ok = await confirmar({
      titulo: "Limpar todas as notificações?",
      descricao:
        "Todo o histórico de notificações será excluído. Isso não desativa os próximos avisos no celular.",
      textoConfirmar: "Limpar notificações",
      perigoso: true,
    });
    if (!ok) return;

    setLimpando(true);
    try {
      const resultado = await limparTodas();
      await router.invalidate();
      avisarNotificacoesAtualizadas();
      toast.success(
        resultado.removidas === 1
          ? "1 notificação removida."
          : `${resultado.removidas} notificações removidas.`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível limpar as notificações.",
      );
    } finally {
      setLimpando(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Notificações"
        subtitle={naoLidas ? `${naoLidas} não lidas` : "Tudo em dia"}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                void gerarLembretes()
                  .then((resultado) => router.invalidate().then(() => resultado))
                  .then((resultado) => {
                    avisarNotificacoesAtualizadas();
                    toast.success(`${resultado.notificacoesCriadas} lembrete(s) criado(s).`);
                  })
                  .catch(() => toast.error("Não foi possível atualizar os lembretes."));
              }}
            >
              Atualizar lembretes
            </Button>
            <Button
              variant="outline"
              disabled={!naoLidas}
              onClick={() => {
                void marcarTodas()
                  .then(() => router.invalidate())
                  .then(() => {
                    avisarNotificacoesAtualizadas();
                    toast.success("Todas marcadas como lidas.");
                  });
              }}
            >
              Marcar todas como lidas
            </Button>
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              disabled={!lista.length || limpando}
              onClick={() => void limpar()}
            >
              {limpando ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Limpar notificações
            </Button>
          </div>
        }
      />
      <AtivarPush />
      <Panel className="p-2">
        {lista.length === 0 ? (
          <EmptyState title="Sem notificações" description="Você será avisado aqui." />
        ) : (
          <ul>
            {lista.map((n) => (
              <li key={n.id}>
                <button
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl p-3 text-left hover:bg-accent/40",
                    !n.lida && "bg-brand/5",
                  )}
                  onClick={() =>
                    void marcarUma({ data: { id: n.id } })
                      .then(() => router.invalidate())
                      .then(avisarNotificacoesAtualizadas)
                  }
                >
                  <span
                    className={cn(
                      "mt-1.5 size-2 shrink-0 rounded-full",
                      n.lida ? "bg-transparent" : "bg-brand",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{n.titulo}</p>
                    <p className="text-muted-foreground text-xs">{n.mensagem}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground text-[11px]">{formatDate(n.createdAt)}</p>
                    <p className="text-muted-foreground text-[11px]">
                      {new Date(n.createdAt).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
