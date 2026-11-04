import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BellOff, BellRing, Loader2, Send, Share, SquarePlus } from "lucide-react";
import { toast } from "sonner";

import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { enviarPushDeTeste } from "@/features/notificacoes/push";
import {
  ativarPush,
  desativarPush,
  lerSituacaoPush,
  type SituacaoPush,
} from "@/features/notificacoes/push-cliente";

/** Cartão para ligar ou desligar as notificações neste aparelho. */
export function AtivarPush() {
  const testar = useServerFn(enviarPushDeTeste);
  const [situacao, setSituacao] = useState<SituacaoPush | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    void lerSituacaoPush()
      .then(setSituacao)
      .catch(() => setSituacao("SEM_SUPORTE"));
  }, []);

  async function executar(acao: () => Promise<void>) {
    setOcupado(true);
    try {
      await acao();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível alterar as notificações.",
      );
    } finally {
      setOcupado(false);
    }
  }

  function ativar() {
    void executar(async () => {
      const nova = await ativarPush();
      setSituacao(nova);
      if (nova === "ATIVO") {
        await testar();
        toast.success("Notificações ativadas neste aparelho.");
      }
    });
  }

  function enviarTeste() {
    void executar(async () => {
      const { enviados } = await testar();
      if (enviados) toast.success("Teste enviado. A notificação deve chegar em instantes.");
      else toast.error("O teste não pôde ser enviado. Desative e ative de novo.");
    });
  }

  function desativar() {
    void executar(async () => {
      await desativarPush();
      setSituacao(await lerSituacaoPush());
      toast.success("Notificações desativadas neste aparelho.");
    });
  }

  // Sem nada que a pessoa possa fazer aqui, o cartão não aparece.
  if (!situacao || situacao === "NAO_CONFIGURADO") return null;
  if (situacao === "SEM_SUPORTE") return null;

  return (
    <Panel className="flex flex-wrap items-center justify-between gap-3 p-5">
      <div className="flex min-w-0 flex-1 basis-64 items-start gap-3">
        {situacao === "BLOQUEADO" ? (
          <BellOff className="text-muted-foreground mt-0.5 size-5 shrink-0" />
        ) : (
          <BellRing className="text-primary mt-0.5 size-5 shrink-0" />
        )}
        <div className="min-w-0">
          <p className="font-display font-semibold">Notificações neste aparelho</p>
          {situacao === "ATIVO" ? (
            <p className="text-muted-foreground text-sm">
              Ativadas. Os avisos chegam mesmo com o app fechado.
            </p>
          ) : situacao === "PEDIR" ? (
            <p className="text-muted-foreground text-sm">
              Receba os avisos no celular, mesmo com o app fechado.
            </p>
          ) : situacao === "BLOQUEADO" ? (
            <p className="text-muted-foreground text-sm">
              Estão bloqueadas neste aparelho. Libere em Ajustes do celular → Notificações → Mesly e
              abra o app de novo.
            </p>
          ) : (
            <div className="text-muted-foreground text-sm">
              <p>No iPhone, as notificações só funcionam com o app na Tela de Início:</p>
              <ol className="mt-1 grid gap-1">
                <li className="flex items-center gap-1.5">
                  1. Abra esta página no Safari e toque em <Share className="size-4" />{" "}
                  Compartilhar.
                </li>
                <li className="flex items-center gap-1.5">
                  2. Toque em <SquarePlus className="size-4" /> Adicionar à Tela de Início.
                </li>
                <li>3. Abra o Mesly pelo ícone novo e volte a esta tela.</li>
              </ol>
            </div>
          )}
        </div>
      </div>
      {situacao === "PEDIR" ? (
        <Button disabled={ocupado} onClick={ativar}>
          {ocupado ? <Loader2 className="size-4 animate-spin" /> : <BellRing className="size-4" />}
          Ativar notificações
        </Button>
      ) : situacao === "ATIVO" ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={ocupado} onClick={enviarTeste}>
            <Send className="size-4" /> Enviar teste
          </Button>
          <Button variant="ghost" disabled={ocupado} onClick={desativar}>
            Desativar
          </Button>
        </div>
      ) : null}
    </Panel>
  );
}
