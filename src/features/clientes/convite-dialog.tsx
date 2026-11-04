import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Loader2, Mail, MessageCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { enviarConvitePorEmail, gerarConviteCliente } from "@/features/clientes/convites";
import { caminhoDoConvite } from "@/lib/acesso-cliente";
import { copiarTexto } from "@/lib/copiar-texto";
import { createWhatsAppUrl } from "@/lib/sharing";

export type ClienteConvidado = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  whatsapp: string | null;
};

/** Gera o link individual de acesso e oferece os canais disponíveis para enviá-lo. */
export function ConviteClienteDialog({
  cliente,
  onFechar,
}: {
  /** Cliente convidado; null fecha o diálogo. */
  cliente: ClienteConvidado | null;
  onFechar: () => void;
}) {
  const gerar = useServerFn(gerarConviteCliente);
  const enviarEmail = useServerFn(enviarConvitePorEmail);
  const [token, setToken] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const clienteId = cliente?.id ?? null;

  useEffect(() => {
    if (!clienteId) return;
    let ativo = true;
    setToken(null);
    setErro(null);
    gerar({ data: { clienteId } })
      .then((convite) => {
        if (ativo) setToken(convite.token);
      })
      .catch((error: unknown) => {
        if (ativo) setErro(error instanceof Error ? error.message : "Não foi possível gerar.");
      });
    return () => {
      ativo = false;
    };
  }, [clienteId, gerar]);

  const link = token ? `${window.location.origin}${caminhoDoConvite(token)}` : "";
  const telefoneWhatsApp = cliente?.whatsapp ?? cliente?.telefone ?? null;

  async function copiar() {
    try {
      await copiarTexto(link);
      toast.success("Link copiado.");
    } catch {
      toast.error("Não foi possível copiar. Selecione o link e copie manualmente.");
    }
  }

  function abrirWhatsApp() {
    if (!cliente || !telefoneWhatsApp) return;
    const primeiroNome = cliente.nome.trim().split(/\s+/)[0];
    try {
      window.open(
        createWhatsAppUrl(
          telefoneWhatsApp,
          `Olá, ${primeiroNome}! Crie sua senha para acompanhar seu evento e seus pagamentos pelo nosso portal. O link vale por 7 dias:\n\n${link}`,
        ),
        "_blank",
        "noopener,noreferrer",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "WhatsApp inválido.");
    }
  }

  async function enviarPorEmail() {
    if (!cliente || !token) return;
    setEnviando(true);
    try {
      const resultado = await enviarEmail({ data: { clienteId: cliente.id, token } });
      toast.success(`Convite enviado para ${resultado.email}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar o e-mail.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={!!cliente} onOpenChange={(aberto) => (aberto ? null : onFechar())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convidar para acessar</DialogTitle>
          <DialogDescription>
            {cliente?.nome} abre o link, confirma o e-mail e cria a própria senha. Os eventos e
            pagamentos já aparecem no portal. O link vale por 7 dias e só pode ser usado uma vez.
          </DialogDescription>
        </DialogHeader>
        {erro ? (
          <p role="alert" className="text-destructive text-sm">
            {erro}
          </p>
        ) : !token ? (
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" /> Gerando o link…
          </p>
        ) : (
          <div className="grid gap-3">
            <Input
              readOnly
              aria-label="Link do convite"
              value={link}
              onFocus={(event) => event.target.select()}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <Button type="button" variant="outline" onClick={() => void copiar()}>
                <Copy className="size-4" /> Copiar link
              </Button>
              {telefoneWhatsApp ? (
                <Button type="button" onClick={abrirWhatsApp}>
                  <MessageCircle className="size-4" /> Enviar no WhatsApp
                </Button>
              ) : null}
              {cliente?.email ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={enviando}
                  className="sm:col-span-2"
                  onClick={() => void enviarPorEmail()}
                >
                  {enviando ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Mail className="size-4" />
                  )}
                  Enviar para {cliente.email}
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
