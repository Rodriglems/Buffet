import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertCircle, Loader2 } from "lucide-react";

import { AuthCard } from "@/components/auth-card";
import { InputSenha } from "@/components/input-senha";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ativarConvite, validarConvite } from "@/features/clientes/convites";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/ativar-acesso")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search["token"] === "string" ? search["token"] : "",
  }),
  loaderDeps: ({ search }) => ({ token: search.token }),
  loader: ({ deps }) => validarConvite({ data: { token: deps.token } }),
  head: () => pageMeta("Criar meu acesso", "Crie sua senha para acompanhar seu evento."),
  component: AtivarAcesso,
});

function AtivarAcesso() {
  const { token } = Route.useSearch();
  const convite = Route.useLoaderData();
  const ativar = useServerFn(ativarConvite);
  const [email, setEmail] = useState(convite.valido ? convite.email : "");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!convite.valido) {
    return (
      <AuthCard title="Link inválido" subtitle="Este link expirou ou já foi usado.">
        <div className="bg-destructive/10 text-destructive mt-7 rounded-xl p-4 text-sm ring-1 ring-current/15">
          Peça um novo convite ao buffet. Se você já criou sua senha, é só entrar normalmente.
        </div>
        <Button asChild className="mt-5 w-full">
          <a href="/">Ir para o login</a>
        </Button>
      </AuthCard>
    );
  }

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    if (senha.length < 4) {
      setErro("A senha precisa ter pelo menos 4 caracteres.");
      return;
    }
    if (senha !== confirmacao) {
      setErro("As senhas informadas não são iguais.");
      return;
    }
    setSalvando(true);
    try {
      await ativar({ data: { token, email, senha } });
      // Recarrega por inteiro para o portal já abrir com a sessão nova.
      window.location.assign("/cliente");
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível criar o acesso.");
      setSalvando(false);
    }
  }

  return (
    <AuthCard
      title={`Olá, ${convite.primeiroNome}!`}
      subtitle={`Crie sua senha para acompanhar seu evento com ${convite.nomeEmpresa}.`}
    >
      <form className="mt-7 flex flex-col gap-5" onSubmit={salvar}>
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
          <Label htmlFor="convite-email">Seu e-mail</Label>
          <Input
            id="convite-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(evento) => setEmail(evento.target.value)}
            className="bg-surface h-11 border-0 ring-1 ring-black/10"
          />
          <p className="text-muted-foreground text-xs">É com ele que você vai entrar no sistema.</p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="convite-senha">Crie uma senha</Label>
          <InputSenha
            id="convite-senha"
            autoComplete="new-password"
            required
            minLength={4}
            maxLength={200}
            value={senha}
            onChange={(evento) => setSenha(evento.target.value)}
            className="bg-surface h-11 border-0 ring-1 ring-black/10"
          />
          <p className="text-muted-foreground text-xs">
            Pelo menos 4 caracteres (pode ser só números).
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="convite-confirmacao">Confirme a senha</Label>
          <InputSenha
            id="convite-confirmacao"
            autoComplete="new-password"
            required
            maxLength={200}
            value={confirmacao}
            onChange={(evento) => setConfirmacao(evento.target.value)}
            className="bg-surface h-11 border-0 ring-1 ring-black/10"
          />
        </div>
        <Button type="submit" className="h-11" disabled={salvando}>
          {salvando ? <Loader2 className="size-4 animate-spin" /> : null}
          Criar meu acesso
        </Button>
      </form>
    </AuthCard>
  );
}
