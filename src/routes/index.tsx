import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";

import { AmbientLight } from "@/components/ambient-light";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "@/features/auth/server-functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Entrar — Mesa Buffet & Eventos" },
      {
        name: "description",
        content:
          "Acesse o painel Mesa para gerenciar clientes, eventos, orçamentos, contratos e pagamentos do seu buffet.",
      },
      { property: "og:title", content: "Entrar — Mesa Buffet & Eventos" },
      {
        property: "og:description",
        content: "Painel de gestão para empresas de buffet e eventos.",
      },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("marina@mesabuffet.com.br");
  const [senha, setSenha] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const entrarNoServidor = useServerFn(login);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setErro(null);

    if (!email.trim() || !senha.trim()) {
      setErro("Informe e-mail e senha para continuar.");
      return;
    }
    setCarregando(true);
    try {
      const resultado = await entrarNoServidor({ data: { email, senha } });
      await navigate({ to: resultado.destino });
    } catch {
      setErro("Credenciais inválidas. Verifique seus dados e tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <AmbientLight />

      <div className="panel w-full max-w-sm p-7">
        <div className="flex items-center gap-2.5">
          <div className="bg-brand text-primary-foreground grid size-10 place-items-center rounded-xl ring-1 ring-black/5">
            <span className="font-display text-base font-semibold">M</span>
          </div>
          <div className="leading-tight">
            <p className="font-display text-base font-semibold">Mesa</p>
            <p className="text-muted-foreground text-[11px]">Buffet &amp; Eventos</p>
          </div>
        </div>

        <h1 className="font-display mt-7 text-xl font-semibold tracking-tight">
          Entrar na sua conta
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Gerencie eventos, orçamentos e pagamentos em um só lugar.
        </p>

        <form className="mt-6 flex flex-col gap-4" onSubmit={entrar}>
          {erro && (
            <div
              role="alert"
              className="bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg p-3 text-xs"
            >
              <AlertCircle className="mt-px size-4 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@empresa.com.br"
              className="bg-surface border-0 ring-1 ring-black/5"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="senha">Senha</Label>
            <div className="relative">
              <Input
                id="senha"
                type={verSenha ? "text" : "password"}
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                className="bg-surface border-0 pr-10 ring-1 ring-black/5"
              />
              <button
                type="button"
                onClick={() => setVerSenha((v) => !v)}
                aria-label={verSenha ? "Ocultar senha" : "Mostrar senha"}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
              >
                {verSenha ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-2 text-xs">
              <Checkbox defaultChecked id="lembrar" />
              <span>Lembrar-me</span>
            </label>
            <button type="button" className="text-brand text-xs font-medium hover:underline">
              Esqueci minha senha
            </button>
          </div>

          <Button type="submit" disabled={carregando} className="w-full">
            {carregando && <Loader2 className="size-4 animate-spin" />}
            {carregando ? "Entrando…" : "Entrar"}
          </Button>
        </form>

        <p className="text-muted-foreground mt-6 text-center text-[11px]">
          O acesso e o painel são definidos pelo seu perfil de usuário.
        </p>
      </div>
    </div>
  );
}
