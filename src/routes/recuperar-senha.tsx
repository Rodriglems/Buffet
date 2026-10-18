import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react";

import { AuthCard } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { solicitarRecuperacaoSenha } from "@/features/auth/server-functions";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/recuperar-senha")({
  validateSearch: (search: Record<string, unknown>) => ({
    email: typeof search["email"] === "string" ? search["email"].slice(0, 254) : "",
  }),
  head: () => pageMeta("Recuperar senha", "Receba um link seguro para criar uma nova senha."),
  component: RecuperarSenha,
});

function RecuperarSenha() {
  const search = Route.useSearch();
  const solicitar = useServerFn(solicitarRecuperacaoSenha);
  const [email, setEmail] = useState(search.email);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      const resultado = await solicitar({ data: { email } });
      setMensagem(resultado.mensagem);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível solicitar a recuperação.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <AuthCard title="Recuperar senha" subtitle="Informe o e-mail usado para acessar o Mesly.">
      {mensagem ? (
        <div className="mt-7">
          <div className="bg-surface rounded-xl p-4 ring-1 ring-black/5">
            <CheckCircle2 className="text-primary size-5" />
            <p className="mt-3 text-sm leading-relaxed">{mensagem}</p>
            <p className="text-muted-foreground mt-2 text-xs">
              Verifique também as pastas de spam e lixo eletrônico.
            </p>
          </div>
          <Button asChild variant="outline" className="mt-5 w-full">
            <Link to="/">
              <ArrowLeft className="size-4" /> Voltar para o login
            </Link>
          </Button>
        </div>
      ) : (
        <form className="mt-7 flex flex-col gap-5" onSubmit={enviar} noValidate>
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
            <Label htmlFor="email">E-mail</Label>
            <div className="relative">
              <Mail className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Digite seu e-mail"
                className="bg-surface h-11 border-0 pl-10 ring-1 ring-black/10"
              />
            </div>
          </div>

          <Button type="submit" disabled={carregando} className="h-11 w-full">
            {carregando ? <Loader2 className="size-4 animate-spin" /> : null}
            {carregando ? "Enviando…" : "Enviar link de recuperação"}
          </Button>
          <Link
            to="/"
            className="text-muted-foreground hover:text-foreground flex items-center justify-center gap-2 text-sm"
          >
            <ArrowLeft className="size-4" /> Voltar para o login
          </Link>
        </form>
      )}
    </AuthCard>
  );
}
