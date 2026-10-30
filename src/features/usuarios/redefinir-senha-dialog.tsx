import { useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Copy, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { InputSenha } from "@/components/input-senha";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { redefinirSenhaUsuario } from "@/features/usuarios/server-functions";
import {
  gerarSenha,
  problemaNaSenha,
  TAMANHO_MINIMO_SENHA,
  type PerfilSenha,
} from "@/lib/regras-senha";
import { copiarTexto } from "@/lib/copiar-texto";

export type AlvoRedefinicao = {
  nome: string;
  perfil: PerfilSenha;
  /** Cliente sem conta no portal: a senha cria o acesso com o e-mail do cadastro. */
  criarAcesso?: boolean;
} & ({ usuarioId: string; clienteId?: never } | { clienteId: string; usuarioId?: never });

function aleatorio(limite: number) {
  const valores = new Uint32Array(1);
  crypto.getRandomValues(valores);
  return valores[0]! % limite;
}

export function RedefinirSenhaDialog({
  alvo,
  onOpenChange,
  onConcluido,
}: {
  /** Quem terá a senha redefinida; null fecha o diálogo. */
  alvo: AlvoRedefinicao | null;
  onOpenChange: (aberto: boolean) => void;
  onConcluido?: () => unknown;
}) {
  const redefinir = useServerFn(redefinirSenhaUsuario);
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [concluido, setConcluido] = useState<{ email: string; senha: string } | null>(null);
  const perfil = alvo?.perfil ?? "CLIENT";

  function fechar(aberto: boolean) {
    if (!aberto) {
      setSenha("");
      setConfirmacao("");
      setConcluido(null);
    }
    onOpenChange(aberto);
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    if (!alvo) return;
    const problema = problemaNaSenha(perfil, senha);
    if (problema) return void toast.error(problema);
    if (senha !== confirmacao) return void toast.error("As senhas digitadas não são iguais.");
    setSalvando(true);
    try {
      const resultado = await redefinir({
        data: alvo.clienteId
          ? { clienteId: alvo.clienteId, senha }
          : { usuarioId: alvo.usuarioId!, senha },
      });
      toast.success(resultado.acessoCriado ? "Acesso ao portal criado." : "Senha redefinida.");
      setConcluido({ email: resultado.email, senha });
      await onConcluido?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível redefinir a senha.");
    } finally {
      setSalvando(false);
    }
  }

  async function copiar() {
    if (!concluido) return;
    try {
      await copiarTexto(`E-mail: ${concluido.email}\nSenha: ${concluido.senha}`);
      toast.success("Dados de acesso copiados.");
    } catch {
      toast.error("Não foi possível copiar. Anote os dados mostrados na tela.");
    }
  }

  return (
    <Dialog open={!!alvo} onOpenChange={fechar}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {alvo?.criarAcesso ? "Criar acesso ao portal" : "Redefinir senha"}
          </DialogTitle>
          <DialogDescription>
            {alvo?.criarAcesso
              ? `${alvo.nome} passa a entrar no portal com o e-mail do cadastro e a senha definida aqui.`
              : `Nova senha de ${alvo?.nome ?? ""}. As sessões abertas com a senha antiga são encerradas e o bloqueio por tentativas é desfeito.`}
          </DialogDescription>
        </DialogHeader>

        {concluido ? (
          <div className="grid gap-4">
            <div className="bg-surface grid gap-1 rounded-xl p-4 text-sm ring-1 ring-black/5">
              <p>
                <span className="text-muted-foreground">E-mail: </span>
                <strong>{concluido.email}</strong>
              </p>
              <p>
                <span className="text-muted-foreground">Senha: </span>
                <strong className="font-mono">{concluido.senha}</strong>
              </p>
            </div>
            <p className="text-muted-foreground text-xs">
              Envie esses dados para {alvo?.nome}. Por segurança, a senha não aparece de novo.
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => void copiar()}>
                <Copy className="size-4" /> Copiar dados
              </Button>
              <Button type="button" onClick={() => fechar(false)}>
                Concluir
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={salvar} className="grid gap-4">
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="nova-senha">Nova senha</Label>
                <button
                  type="button"
                  className="text-primary text-xs font-medium hover:underline"
                  onClick={() => {
                    const sugestao = gerarSenha(perfil, aleatorio);
                    setSenha(sugestao);
                    setConfirmacao(sugestao);
                  }}
                >
                  Gerar senha
                </button>
              </div>
              <InputSenha
                id="nova-senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="new-password"
                required
                maxLength={200}
                autoFocus
              />
              <p className="text-muted-foreground text-xs">
                Mínimo de {TAMANHO_MINIMO_SENHA[perfil]} caracteres
                {perfil === "CLIENT" ? " (pode ser só números)" : ""}.
              </p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="confirmar-senha">Confirme a nova senha</Label>
              <InputSenha
                id="confirmar-senha"
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
                autoComplete="new-password"
                required
                maxLength={200}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => fechar(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={salvando}>
                {salvando ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <KeyRound className="size-4" />
                )}
                {alvo?.criarAcesso ? "Criar acesso" : "Redefinir senha"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
