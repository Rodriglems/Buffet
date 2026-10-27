import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, LockKeyhole } from "lucide-react";

import { AuthCard } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { InputSenha } from "@/components/input-senha";
import { Label } from "@/components/ui/label";
import { redefinirSenha, validarTokenRecuperacaoSenha } from "@/features/auth/server-functions";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/redefinir-senha")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search["token"] === "string" ? search["token"] : "",
  }),
  loaderDeps: ({ search }) => ({ token: search.token }),
  loader: ({ deps }) => validarTokenRecuperacaoSenha({ data: { token: deps.token } }),
  head: () => pageMeta("Criar nova senha", "Defina uma nova senha para sua conta Mesly."),
  component: RedefinirSenha,
});

function RedefinirSenha() {
  const { token } = Route.useSearch();
  const { valido } = Route.useLoaderData();
  const redefinir = useServerFn(redefinirSenha);
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const senhasDiferentes = confirmacao.length > 0 && senha !== confirmacao;

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    // O servidor exige 12 caracteres para a equipe; aqui só o mínimo comum a todos.
    if (senha.length < 4) {
      setErro("A nova senha precisa ter pelo menos 4 caracteres.");
      return;
    }
    if (senha !== confirmacao) {
      setErro("As senhas informadas não são iguais.");
      return;
    }

    setCarregando(true);
    try {
      await redefinir({ data: { token, senha } });
      setConcluido(true);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível alterar a senha.");
    } finally {
      setCarregando(false);
    }
  }

  if (!valido) {
    return (
      <AuthCard title="Link inválido" subtitle="Este link expirou ou já foi utilizado.">
        <div className="mt-7">
          <div className="bg-destructive/10 text-destructive rounded-xl p-4 text-sm ring-1 ring-current/15">
            Solicite um novo link de recuperação para continuar.
          </div>
          <Button asChild className="mt-5 w-full">
            <Link to="/recuperar-senha" search={{ email: "" }}>
              Solicitar novo link
            </Link>
          </Button>
        </div>
      </AuthCard>
    );
  }

  if (concluido) {
    return (
      <AuthCard title="Senha alterada" subtitle="Sua nova senha já está pronta para uso.">
        <div className="mt-7">
          <CheckCircle2 className="text-primary size-6" />
          <p className="mt-3 text-sm">Entre novamente usando a nova senha.</p>
          <Button asChild className="mt-5 w-full">
            <Link to="/">Ir para o login</Link>
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Criar nova senha"
      subtitle="Clientes: pelo menos 4 caracteres. Equipe: pelo menos 12."
    >
      <form className="mt-7 flex flex-col gap-5" onSubmit={salvar} noValidate>
        {erro ? (
          <div
            role="alert"
            className="bg-destructive/10 text-destructive ring-destructive/20 flex items-start gap-2.5 rounded-lg p-3 text-[13px] ring-1"
          >
            <AlertCircle className="mt-px size-4 shrink-0" />
            <span>{erro}</span>
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <Label htmlFor="nova-senha">Nova senha</Label>
          <div className="relative">
            <LockKeyhole className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 z-10 size-4 -translate-y-1/2" />
            <InputSenha
              id="nova-senha"
              autoComplete="new-password"
              autoFocus
              required
              minLength={4}
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              className="bg-surface h-11 border-0 pl-10 ring-1 ring-black/10"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="confirmar-senha">Confirmar nova senha</Label>
          <InputSenha
            id="confirmar-senha"
            autoComplete="new-password"
            required
            minLength={4}
            aria-invalid={senhasDiferentes}
            aria-describedby={senhasDiferentes ? "senhas-diferentes" : undefined}
            value={confirmacao}
            onChange={(event) => setConfirmacao(event.target.value)}
            className="bg-surface h-11 border-0 ring-1 ring-black/10"
          />
          {senhasDiferentes ? (
            <p id="senhas-diferentes" className="text-destructive text-xs">
              As senhas não são iguais.
            </p>
          ) : null}
        </div>

        <Button type="submit" disabled={carregando} className="h-11 w-full">
          {carregando ? <Loader2 className="size-4 animate-spin" /> : null}
          {carregando ? "Alterando…" : "Salvar nova senha"}
        </Button>
        <Link
          to="/"
          className="text-muted-foreground hover:text-foreground flex items-center justify-center gap-2 text-sm"
        >
          <ArrowLeft className="size-4" /> Voltar para o login
        </Link>
      </form>
    </AuthCard>
  );
}
