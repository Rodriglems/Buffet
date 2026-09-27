import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";

import { AmbientLight } from "@/components/ambient-light";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

  function entrar(e: FormEvent, destino: "/admin" | "/cliente") {
    e.preventDefault();
    setErro(null);

    if (!email.trim() || !senha.trim()) {
      setErro("Informe e-mail e senha para continuar.");
      return;
    }
    if (senha.length < 4) {
      setErro("Credenciais inválidas. Verifique seus dados e tente novamente.");
      return;
    }

    setCarregando(true);
    setTimeout(() => {
      setCarregando(false);
      navigate({ to: destino });
    }, 900);
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

        <form className="mt-6 flex flex-col gap-4" onSubmit={(e) => entrar(e, "/admin")}>
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

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={(e) => entrar(e, "/cliente")}
          >
            Entrar como cliente
          </Button>
        </form>

        <p className="text-muted-foreground mt-6 text-center text-[11px]">
          Ambiente de demonstração com dados fictícios.{" "}
          <Link to="/admin" className="text-brand hover:underline">
            Ver painel
          </Link>
        </p>
      </div>
    </div>
  );
}
