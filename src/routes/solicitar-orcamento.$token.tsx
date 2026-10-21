import { useEffect, useState, type ComponentProps, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, CheckCircle2, Loader2 } from "lucide-react";

import { AmbientLight } from "@/components/ambient-light";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  obterFormularioOrcamento,
  enviarSolicitacaoOrcamento,
} from "@/features/orcamentos/solicitacao-publica";
import { aplicarCor } from "@/lib/theme-accent";

export const Route = createFileRoute("/solicitar-orcamento/$token")({
  loader: async ({ params }) => obterFormularioOrcamento({ data: { token: params.token } }),
  head: ({ loaderData }) => ({
    meta: [
      { title: `Solicitar orçamento — ${loaderData?.nomeFantasia ?? "Buffet"}` },
      {
        name: "description",
        content: "Conte sobre seu evento e receba um orçamento personalizado.",
      },
    ],
  }),
  component: SolicitarOrcamento,
});

function SolicitarOrcamento() {
  const empresa = Route.useLoaderData();
  const { token } = Route.useParams();
  const enviar = useServerFn(enviarSolicitacaoOrcamento);
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => aplicarCor(empresa.corTema), [empresa.corTema]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "").trim();
    setEnviando(true);
    setErro(null);
    try {
      await enviar({
        data: {
          token,
          nome: value("nome"),
          email: value("email"),
          telefone: value("telefone"),
          whatsapp: value("whatsapp"),
          tipoEvento: value("tipoEvento"),
          dataEvento: new Date(`${value("dataEvento")}T12:00:00`),
          quantidadeConvidados: Number(value("quantidadeConvidados")),
          localNome: value("localNome") || null,
          cidade: value("cidade") || null,
          observacoes: value("observacoes") || null,
          website: value("website"),
        },
      });
      setConcluido(true);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível enviar sua solicitação.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="relative min-h-screen px-4 py-10 sm:px-6">
      <AmbientLight />
      <div className="relative mx-auto max-w-3xl">
        <header className="mb-7 text-center">
          <div className="bg-primary text-primary-foreground mx-auto grid size-12 place-items-center rounded-2xl">
            <CalendarDays className="size-5" />
          </div>
          <p className="font-display mt-4 text-sm font-semibold">{empresa.nomeFantasia}</p>
          <h1 className="font-display mt-2 text-3xl font-bold tracking-tight">
            Peça seu orçamento
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Preencha os dados abaixo. Nossa equipe entrará em contato com uma proposta
            personalizada.
          </p>
        </header>

        {concluido ? (
          <section className="panel p-8 text-center">
            <CheckCircle2 className="text-success mx-auto size-12" />
            <h2 className="font-display mt-4 text-xl font-semibold">Solicitação recebida</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Seus dados e o evento já foram registrados. Em breve entraremos em contato.
            </p>
          </section>
        ) : (
          <form className="panel grid gap-6 p-6 sm:p-8" onSubmit={submit}>
            {erro ? (
              <p className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">{erro}</p>
            ) : null}
            <div>
              <h2 className="font-display font-semibold">Seus dados</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Nome completo" name="nome" required />
                <Field label="E-mail" name="email" type="email" required />
                <Field label="Telefone" name="telefone" type="tel" required />
                <Field label="WhatsApp" name="whatsapp" type="tel" required />
              </div>
            </div>
            <div className="border-t border-border pt-6">
              <h2 className="font-display font-semibold">Sobre o evento</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field
                  label="Tipo de evento"
                  name="tipoEvento"
                  placeholder="Casamento, aniversário…"
                  required
                />
                <Field label="Data do evento" name="dataEvento" type="date" required />
                <Field
                  label="Quantidade de convidados"
                  name="quantidadeConvidados"
                  type="number"
                  min="1"
                  required
                />
                <Field label="Local ou espaço" name="localNome" />
                <Field label="Cidade" name="cidade" />
                <div className="sm:col-span-2">
                  <Label htmlFor="observacoes" className="mb-1.5 block">
                    Conte mais sobre o evento
                  </Label>
                  <Textarea
                    id="observacoes"
                    name="observacoes"
                    rows={4}
                    placeholder="Cardápio desejado, estilo, restrições e outros detalhes…"
                  />
                </div>
              </div>
            </div>
            <div className="hidden" aria-hidden="true">
              <Label htmlFor="website">Website</Label>
              <Input id="website" name="website" tabIndex={-1} autoComplete="off" />
            </div>
            <Button type="submit" disabled={enviando} className="h-11">
              {enviando ? <Loader2 className="size-4 animate-spin" /> : null}
              {enviando ? "Enviando…" : "Enviar solicitação"}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}

function Field({
  label,
  name,
  ...props
}: { label: string; name: string } & ComponentProps<typeof Input>) {
  return (
    <div>
      <Label htmlFor={name} className="mb-1.5 block">
        {label}
      </Label>
      <Input id={name} name={name} {...props} />
    </div>
  );
}
