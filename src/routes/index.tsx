import { useState, type FormEvent } from "react";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  CalendarDays,
  Eye,
  EyeOff,
  FileSignature,
  Loader2,
  Lock,
  Mail,
  Wallet,
} from "lucide-react";

import { AmbientLight } from "@/components/ambient-light";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { currentUser, login } from "@/features/auth/server-functions";

export const Route = createFileRoute("/")({
  // Quem já está conectado (ex.: abrindo o app instalado) vai direto para a sua área.
  beforeLoad: async () => {
    const usuario = await currentUser();
    if (usuario) throw redirect({ to: usuario.role === "ADMIN" ? "/admin" : "/cliente" });
  },
  head: () => ({
    meta: [
      { title: "Entrar — Mesly" },
      {
        name: "description",
        content:
          "Acesse o painel Mesly para gerenciar clientes, eventos, orçamentos, documentos e pagamentos do seu buffet.",
      },
      { property: "og:title", content: "Entrar — Mesly" },
      {
        property: "og:description",
        content: "Painel de gestão para empresas de buffet e eventos.",
      },
    ],
  }),
  component: Login,
});

const destaques = [
  {
    icon: CalendarDays,
    titulo: "Agenda de eventos",
    texto: "Acompanhe cada evento, do orçamento ao dia da festa.",
  },
  {
    icon: FileSignature,
    titulo: "Orçamentos e documentos",
    texto: "Propostas e documentos organizados em um só lugar.",
  },
  {
    icon: Wallet,
    titulo: "Pagamentos e custos",
    texto: "Controle financeiro claro para decidir com segurança.",
  },
];

function Logo({ inverso = false }: { inverso?: boolean }) {
  // O "M" é sempre branco dentro de um quadrado preto, em ambos os lados.
  return (
    <div className="flex items-center gap-3">
      <div
        className={
          "grid size-11 place-items-center rounded-xl bg-neutral-950 text-white " +
          (inverso ? "ring-1 ring-white/15" : "ring-1 ring-black/10 shadow-md")
        }
      >
        <span className="font-display text-lg font-semibold leading-none">M</span>
      </div>
      <div className="leading-tight">
        <p
          className={`font-display text-lg font-semibold tracking-tight ${inverso ? "text-white" : ""}`}
        >
          Mesly
        </p>
        <p className={`text-xs ${inverso ? "text-white/60" : "text-muted-foreground"}`}>
          Buffet &amp; Eventos
        </p>
      </div>
    </div>
  );
}

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
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
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Painel de marca (somente telas grandes) */}
      <aside className="relative hidden overflow-hidden bg-neutral-950 text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        {/* Fundo decorativo */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse at 30% 20%, black 30%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse at 30% 20%, black 30%, transparent 75%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -left-24 size-[28rem] rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -bottom-32 size-[26rem] rounded-full bg-white/[0.06] blur-3xl"
        />

        <div className="relative">
          <Logo inverso />
        </div>

        <div className="relative max-w-md">
          <h2 className="font-display text-4xl leading-[1.15] font-semibold tracking-tight">
            Do primeiro contato ao brinde final, tudo sob controle.
          </h2>
          <p className="mt-4 text-base text-white/60">
            A plataforma de gestão feita para buffets e empresas de eventos.
          </p>

          <ul className="mt-10 flex flex-col gap-5">
            {destaques.map(({ icon: Icon, titulo, texto }) => (
              <li key={titulo} className="flex items-start gap-4">
                <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-white/10 ring-1 ring-white/10">
                  <Icon className="size-[18px] text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium">{titulo}</p>
                  <p className="mt-0.5 text-sm text-white/55">{texto}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/40">
          © {new Date().getFullYear()} Mesly · uma solução Luzion. Todos os direitos reservados.
        </p>
      </aside>

      {/* Formulário */}
      <main className="relative flex items-center justify-center px-5 py-10 sm:px-8">
        <AmbientLight />

        <div className="relative w-full max-w-[400px]">
          {/* Logo no mobile */}
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>

          <div className="panel p-7 shadow-xl shadow-black/[0.04] sm:p-8">
            <header>
              <h1 className="font-display text-2xl font-semibold tracking-tight">Bem-vindo</h1>
              <p className="text-muted-foreground mt-1.5 text-sm">
                Entre com sua conta para acessar o painel.
              </p>
            </header>

            <form className="mt-7 flex flex-col gap-5" onSubmit={entrar} noValidate>
              {erro && (
                <div
                  role="alert"
                  className="bg-destructive/10 text-destructive ring-destructive/20 flex items-start gap-2.5 rounded-lg p-3 text-[13px] leading-snug ring-1"
                >
                  <AlertCircle className="mt-px size-4 shrink-0" />
                  <span>{erro}</span>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Label htmlFor="email" className="text-[13px] font-medium">
                  E-mail
                </Label>
                <div className="relative">
                  <Mail className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Digite seu e-mail"
                    className="bg-surface h-11 border-0 pl-10 ring-1 ring-black/10 transition-shadow focus-visible:ring-2 focus-visible:ring-black/40"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="senha" className="text-[13px] font-medium">
                    Senha
                  </Label>
                </div>
                <div className="relative">
                  <Lock className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
                  <Input
                    id="senha"
                    type={verSenha ? "text" : "password"}
                    autoComplete="current-password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Digite sua senha"
                    className="bg-surface h-11 border-0 pr-11 pl-10 ring-1 ring-black/10 transition-shadow focus-visible:ring-2 focus-visible:ring-black/40"
                  />
                  <button
                    type="button"
                    onClick={() => setVerSenha((v) => !v)}
                    aria-label={verSenha ? "Ocultar senha" : "Mostrar senha"}
                    className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-md transition-colors hover:bg-black/5"
                  >
                    {verSenha ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <Link
                  to="/recuperar-senha"
                  search={{ email: email.trim() }}
                  className="text-muted-foreground hover:text-foreground self-end text-xs font-medium transition-colors hover:underline"
                >
                  Esqueci minha senha
                </Link>
              </div>

              <label className="flex cursor-pointer items-center gap-2.5 text-[13px]">
                <Checkbox defaultChecked id="lembrar" />
                <span>Manter conectado neste dispositivo</span>
              </label>

              <Button
                type="submit"
                disabled={carregando}
                className="h-11 w-full text-sm font-medium shadow-md transition-all hover:shadow-lg"
              >
                {carregando && <Loader2 className="size-4 animate-spin" />}
                {carregando ? "Entrando…" : "Entrar"}
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
