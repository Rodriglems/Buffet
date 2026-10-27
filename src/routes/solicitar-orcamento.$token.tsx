import { useEffect, useMemo, useState, type FormEvent, type MouseEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Info,
  ListChecks,
  Loader2,
  Search,
  Sparkles,
  Utensils,
  WandSparkles,
  X,
  ChevronRight,
} from "lucide-react";

import { AmbientLight } from "@/components/ambient-light";
import { InputSenha } from "@/components/input-senha";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CampoFormulario as Field,
  ResumoCard,
  SelecaoFormulario as SelectField,
} from "@/features/orcamentos/formulario-publico-components";
import {
  DADOS_INICIAIS_FORMULARIO,
  descreverEscolha,
  ETAPAS_FORMULARIO,
  normalizarBusca,
  obterDataMinimaEvento,
  type DadosFormularioOrcamento,
} from "@/features/orcamentos/formulario-publico";
import {
  obterFormularioOrcamento,
  enviarSolicitacaoOrcamento,
} from "@/features/orcamentos/solicitacao-publica";
import {
  CARDAPIOS,
  CARDAPIOS_POR_FORMATO,
  FORMATOS_SERVICO,
  SERVICOS_ADICIONAIS,
  TIPOS_EVENTO,
  type Cardapio,
  type FormatoServico,
  type ServicoAdicional,
} from "@/lib/catalogo";
import { formatBRL } from "@/lib/format";
import { aplicarCor } from "@/lib/theme-accent";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/solicitar-orcamento/$token")({
  loader: async ({ params }) => obterFormularioOrcamento({ data: { token: params.token } }),
  head: ({ loaderData }) => ({
    meta: [
      { title: `Monte seu cardápio — ${loaderData?.nomeFantasia ?? "Buffet"}` },
      {
        name: "description",
        content: "Conte sobre seu evento, escolha o cardápio e receba uma proposta personalizada.",
      },
    ],
  }),
  component: SolicitarOrcamento,
});

type ServicoPublico = Awaited<ReturnType<typeof obterFormularioOrcamento>>["servicos"][number];
type Acesso = "CRIADO" | "JA_EXISTE" | "INDISPONIVEL";

const idCategoria = (categoria: string) =>
  `categoria-${normalizarBusca(categoria).replace(/[^a-z0-9]+/g, "-")}`;

function SolicitarOrcamento() {
  const empresa = Route.useLoaderData();
  const logo = empresa.logoOrcamentoUrl ?? empresa.logoUrl;
  const { token } = Route.useParams();
  const enviar = useServerFn(enviarSolicitacaoOrcamento);
  const [dados, setDados] = useState<DadosFormularioOrcamento>(DADOS_INICIAIS_FORMULARIO);
  const [etapa, setEtapa] = useState<1 | 2 | 3>(1);
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState<null | { acesso: Acesso; logado: boolean }>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const [cardapioAtivo, setCardapioAtivo] = useState<Cardapio | "">("");
  // A seleção vale para o pedido inteiro: trocar de cardápio ou categoria nunca a apaga.
  const [servicosSelecionados, setServicosSelecionados] = useState<string[]>([]);
  const [escolhas, setEscolhas] = useState<Record<string, string>>({});
  const [verEscolhidos, setVerEscolhidos] = useState(false);
  // Uma categoria aberta por vez (começam recolhidas); a busca abre as que têm resultado.
  const [categoriaAberta, setCategoriaAberta] = useState<string | null>(null);
  const [adicionais, setAdicionais] = useState<ServicoAdicional[]>([]);

  const formato = dados.formatoServico as FormatoServico | "";
  const cardapiosRecomendados = useMemo(() => {
    if (dados.tipoEvento === "Aniversário infantil") {
      return ["Café da manhã, coffee break e brunch", "Salgadinhos e finger foods"] as Cardapio[];
    }
    return formato ? CARDAPIOS_POR_FORMATO[formato] : [];
  }, [dados.tipoEvento, formato]);
  const cardapiosDisponiveis = mostrarTodos ? [...CARDAPIOS] : cardapiosRecomendados;

  useEffect(() => aplicarCor(empresa.corTema), [empresa.corTema]);
  useEffect(() => {
    const primeiro = cardapiosRecomendados[0] ?? "";
    if (!cardapioAtivo || (!mostrarTodos && !cardapiosRecomendados.includes(cardapioAtivo))) {
      setCardapioAtivo(primeiro);
    }
  }, [cardapioAtivo, cardapiosRecomendados, mostrarTodos]);

  const porId = useMemo(
    () => new Map(empresa.servicos.map((servico) => [servico.id, servico])),
    [empresa.servicos],
  );
  // Itens usados como opção de outro (ex.: recheios) são escolhidos dentro do item principal.
  const idsDeOpcoes = useMemo(
    () => new Set(empresa.servicos.flatMap((servico) => servico.opcoes.map((o) => o.opcaoId))),
    [empresa.servicos],
  );
  const ordemCategoria = useMemo(
    () => new Map(empresa.categoriasCardapio.map((categoria) => [categoria.nome, categoria.ordem])),
    [empresa.categoriasCardapio],
  );
  const compararCategorias = (a: string, b: string) =>
    (ordemCategoria.get(a) ?? 9999) - (ordemCategoria.get(b) ?? 9999) || a.localeCompare(b);
  const opcoesDe = (servico: ServicoPublico) =>
    servico.opcoes
      .map((opcao) => porId.get(opcao.opcaoId))
      .filter((opcao): opcao is ServicoPublico => Boolean(opcao));

  const tipoEventoSelecionado = dados.tipoEvento || "";
  const aplicavelAoEvento = (tiposEvento: string[]) =>
    tiposEvento.length === 0 || tiposEvento.includes(tipoEventoSelecionado);
  const servicosDoCardapio = empresa.servicos.filter(
    (servico) =>
      !servico.sugestaoChef &&
      !idsDeOpcoes.has(servico.id) &&
      aplicavelAoEvento(servico.tiposEvento) &&
      (cardapioAtivo ? servico.cardapios.includes(cardapioAtivo) : false),
  );
  const sugestoesChef = empresa.servicos.filter(
    (servico) => servico.sugestaoChef && aplicavelAoEvento(servico.tiposEvento),
  );
  const termo = normalizarBusca(busca.trim());
  const servicosFiltrados = servicosDoCardapio
    .filter((servico) =>
      termo
        ? normalizarBusca(
            `${servico.nome} ${servico.categoria} ${servico.descricao ?? ""}`,
          ).includes(termo)
        : true,
    )
    // Dentro de cada categoria, os pratos aparecem em ordem alfabética.
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));
  const categorias = Array.from(
    new Set(servicosFiltrados.map((servico) => servico.categoria)),
  ).sort(compararCategorias);
  const selecionados = servicosSelecionados
    .map((id) => porId.get(id))
    .filter((servico): servico is ServicoPublico => Boolean(servico));
  const categoriasSelecionadas = Array.from(
    new Set(selecionados.map((servico) => servico.categoria)),
  ).sort(compararCategorias);
  const semEscolha = selecionados.filter(
    (servico) => opcoesDe(servico).length && !escolhas[servico.id],
  );
  const senhasDiferentes = dados.confirmarSenha.length > 0 && dados.senha !== dados.confirmarSenha;

  function atualizar<K extends keyof DadosFormularioOrcamento>(
    campo: K,
    valor: DadosFormularioOrcamento[K],
  ) {
    setDados((atuais) => ({ ...atuais, [campo]: valor }));
  }

  function alternarServico(id: string, marcado: boolean) {
    setServicosSelecionados((atuais) =>
      marcado ? [...new Set([...atuais, id])] : atuais.filter((item) => item !== id),
    );
    if (!marcado) {
      setEscolhas((atuais) => {
        const { [id]: _removida, ...resto } = atuais;
        return resto;
      });
    }
  }

  function nomeComEscolha(servico: ServicoPublico) {
    const escolhida = escolhas[servico.id] ? porId.get(escolhas[servico.id]!) : undefined;
    return escolhida
      ? descreverEscolha(servico.nome, servico.opcoesRotulo || "Opção", escolhida.nome)
      : servico.nome;
  }

  /** Abre a categoria (fechando a anterior) e rola até ela, pois o fechamento desloca a página. */
  function abrirCategoria(categoria: string) {
    setCategoriaAberta(categoria);
    requestAnimationFrame(() =>
      document
        .getElementById(idCategoria(categoria))
        ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }

  function alternarCategoria(categoria: string) {
    if (categoriaAberta === categoria) setCategoriaAberta(null);
    else abrirCategoria(categoria);
  }

  function avancarParaCardapio(event: MouseEvent<HTMLButtonElement>) {
    const formulario = event.currentTarget.form;
    if (dados.senha !== dados.confirmarSenha) {
      setErro("As senhas informadas são diferentes.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (!formulario?.reportValidity()) return;
    setErro(null);
    setEtapa(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function avancarParaRevisao() {
    if (!servicosSelecionados.length) {
      setErro("Escolha pelo menos um item para montar sua proposta.");
      return;
    }
    if (semEscolha.length) {
      setErro(
        `Escolha ${semEscolha
          .map(
            (servico) => `o ${(servico.opcoesRotulo || "opção").toLowerCase()} de ${servico.nome}`,
          )
          .join(", ")}.`,
      );
      setVerEscolhidos(true);
      return;
    }
    setErro(null);
    setEtapa(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formulario = new FormData(event.currentTarget);
    const website = String(formulario.get("website") ?? "");
    if (!servicosSelecionados.length || !formato) return;
    setEnviando(true);
    setErro(null);
    try {
      const resposta = await enviar({
        data: {
          token,
          nome: dados.nome,
          email: dados.email,
          telefone: dados.telefone,
          whatsapp: dados.whatsapp,
          tipoEvento: dados.tipoEvento === "Outros" ? dados.tipoEventoOutro : dados.tipoEvento,
          formatoServico: formato,
          servicosAdicionais: adicionais,
          dataEvento: new Date(`${dados.dataEvento}T12:00:00`),
          quantidadeConvidados: Number(dados.quantidadeConvidados),
          localNome: dados.localNome || null,
          cidade: dados.cidade || null,
          observacoes: dados.observacoes || null,
          servicosIds: servicosSelecionados,
          escolhas: Object.fromEntries(
            Object.entries(escolhas).filter(([id]) => servicosSelecionados.includes(id)),
          ),
          senha: dados.senha,
          website,
        },
      });
      setConcluido({ acesso: resposta.acesso, logado: resposta.logado });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível enviar sua solicitação.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="relative min-h-screen px-4 py-8 sm:px-6 sm:py-12">
      <AmbientLight />
      <div className="relative mx-auto max-w-5xl">
        <header className="mb-8 text-center">
          {logo ? (
            <img
              src={logo}
              alt={`Logo ${empresa.nomeFantasia}`}
              className="mx-auto h-16 max-w-56 object-contain"
            />
          ) : (
            <div className="bg-primary text-primary-foreground mx-auto grid size-12 place-items-center rounded-2xl shadow-lg">
              <Utensils className="size-5" />
            </div>
          )}
          <p className="font-display mt-4 text-sm font-semibold">{empresa.nomeFantasia}</p>
          <h1 className="font-display mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Vamos montar seu evento?
          </h1>
          <p className="text-muted-foreground mx-auto mt-3 max-w-2xl text-sm sm:text-base">
            Conte o que está planejando, escolha seus pratos favoritos e receba uma proposta feita
            para você.
          </p>
        </header>

        {concluido ? (
          <section className="panel mx-auto max-w-2xl p-8 text-center sm:p-12">
            <div className="bg-success/10 mx-auto grid size-16 place-items-center rounded-full">
              <CheckCircle2 className="text-success size-9" />
            </div>
            <h2 className="font-display mt-5 text-2xl font-semibold">
              Solicitação enviada com sucesso!
            </h2>
            <p className="text-muted-foreground mt-3 text-sm leading-6">
              Vamos analisar o seu pedido e, em breve, entraremos em contato para apresentar o
              orçamento completo.
            </p>
            {concluido.acesso === "CRIADO" ? (
              <>
                <p className="text-muted-foreground mt-3 text-sm leading-6">
                  Sua conta foi criada{concluido.logado ? " e você já está conectado" : ""}. Nas
                  próximas vezes, entre com o e-mail <strong>{dados.email}</strong> e a senha que
                  você cadastrou.
                </p>
                <Button asChild className="mt-6">
                  <Link to={concluido.logado ? "/cliente" : "/"}>Acompanhar meu pedido</Link>
                </Button>
              </>
            ) : concluido.acesso === "JA_EXISTE" ? (
              <>
                <p className="text-muted-foreground mt-3 text-sm leading-6">
                  Você já tem uma conta conosco. Entre com a sua senha de sempre — a senha digitada
                  agora não substituiu a anterior.
                </p>
                <Button asChild className="mt-6">
                  <Link to="/">Acessar minha conta</Link>
                </Button>
              </>
            ) : (
              <>
                <p className="text-muted-foreground mt-3 text-sm leading-6">
                  Este e-mail já tem acesso ao sistema. Entre com a sua senha; se não lembrar, use
                  “Esqueci minha senha” na tela de acesso.
                </p>
                <Button asChild className="mt-6">
                  <Link to="/">Acessar minha conta</Link>
                </Button>
              </>
            )}
          </section>
        ) : (
          <form className="grid gap-5" onSubmit={submit}>
            <nav className="panel grid grid-cols-3 gap-2 p-2" aria-label="Etapas do formulário">
              {ETAPAS_FORMULARIO.map((item) => {
                const ativa = etapa === item.numero;
                const concluida = etapa > item.numero;
                return (
                  <div
                    key={item.numero}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-xl px-2 py-3 text-xs transition sm:text-sm",
                      ativa
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : concluida
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-5 place-items-center rounded-full text-[11px] font-bold",
                        ativa ? "bg-white/20" : "bg-black/5",
                      )}
                    >
                      {concluida ? <Check className="size-3" /> : item.numero}
                    </span>
                    <span className="font-medium">{item.label}</span>
                  </div>
                );
              })}
            </nav>

            {erro ? (
              <p role="alert" className="bg-destructive/10 text-destructive rounded-xl p-4 text-sm">
                {erro}
              </p>
            ) : null}

            <section className={etapa === 1 ? "panel grid gap-8 p-6 sm:p-8" : "hidden"}>
              <div>
                <p className="text-primary text-xs font-semibold uppercase tracking-wider">
                  Primeiro contato
                </p>
                <h2 className="font-display mt-1 text-xl font-semibold">
                  Conte um pouco sobre você
                </h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Assim conseguimos retornar pelo canal certo.
                </p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Nome completo"
                    name="nome"
                    value={dados.nome}
                    onChange={(e) => atualizar("nome", e.target.value)}
                    required
                  />
                  <Field
                    label="E-mail"
                    name="email"
                    type="email"
                    value={dados.email}
                    onChange={(e) => atualizar("email", e.target.value)}
                    required
                  />
                  <Field
                    label="Telefone"
                    name="telefone"
                    type="tel"
                    inputMode="tel"
                    value={dados.telefone}
                    onChange={(e) => atualizar("telefone", e.target.value)}
                    placeholder="(86) 99999-9999"
                    required
                  />
                  <Field
                    label="WhatsApp"
                    name="whatsapp"
                    type="tel"
                    inputMode="tel"
                    value={dados.whatsapp}
                    onChange={(e) => atualizar("whatsapp", e.target.value)}
                    placeholder="(86) 99999-9999"
                    required
                  />
                </div>
                <div className="bg-surface mt-5 rounded-xl p-4 ring-1 ring-black/5">
                  <p className="text-sm font-semibold">Crie sua senha de acesso</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Com o seu e-mail e esta senha você acompanha orçamento, pagamentos e documentos
                    no portal.
                  </p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="senha" className="mb-1.5 block">
                        Senha
                      </Label>
                      <InputSenha
                        id="senha"
                        name="senha"
                        autoComplete="new-password"
                        minLength={4}
                        required
                        value={dados.senha}
                        onChange={(e) => atualizar("senha", e.target.value)}
                        placeholder="Mínimo de 4 caracteres"
                      />
                    </div>
                    <div>
                      <Label htmlFor="confirmarSenha" className="mb-1.5 block">
                        Confirme a senha
                      </Label>
                      <InputSenha
                        id="confirmarSenha"
                        name="confirmarSenha"
                        autoComplete="new-password"
                        minLength={4}
                        required
                        aria-invalid={senhasDiferentes}
                        aria-describedby={senhasDiferentes ? "aviso-senhas" : undefined}
                        value={dados.confirmarSenha}
                        onChange={(e) => atualizar("confirmarSenha", e.target.value)}
                      />
                      {senhasDiferentes ? (
                        <p id="aviso-senhas" className="text-destructive mt-1.5 text-xs">
                          As senhas não são iguais.
                        </p>
                      ) : dados.confirmarSenha && dados.senha === dados.confirmarSenha ? (
                        <p className="text-success mt-1.5 flex items-center gap-1 text-xs">
                          <Check className="size-3" /> As senhas conferem.
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-border border-t pt-7">
                <p className="text-primary text-xs font-semibold uppercase tracking-wider">
                  O evento
                </p>
                <h2 className="font-display mt-1 text-xl font-semibold">
                  O que você está planejando?
                </h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <SelectField
                    label="Qual é a celebração?"
                    name="tipoEvento"
                    value={dados.tipoEvento}
                    onChange={(e) => atualizar("tipoEvento", e.target.value)}
                    required
                  >
                    <option value="" disabled>
                      Selecione o tipo de evento
                    </option>
                    {TIPOS_EVENTO.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {tipo}
                      </option>
                    ))}
                  </SelectField>
                  <SelectField
                    label="Qual formato deseja servir?"
                    name="formatoServico"
                    value={dados.formatoServico}
                    onChange={(e) => atualizar("formatoServico", e.target.value)}
                    required
                  >
                    <option value="" disabled>
                      Selecione o formato
                    </option>
                    {FORMATOS_SERVICO.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </SelectField>
                  {dados.tipoEvento === "Outros" ? (
                    <Field
                      label="Qual é o tipo do evento?"
                      name="tipoEventoOutro"
                      value={dados.tipoEventoOutro}
                      onChange={(e) => atualizar("tipoEventoOutro", e.target.value)}
                      required
                    />
                  ) : null}
                  <Field
                    label="Data do evento"
                    name="dataEvento"
                    type="date"
                    min={obterDataMinimaEvento()}
                    value={dados.dataEvento}
                    onChange={(e) => atualizar("dataEvento", e.target.value)}
                    required
                  />
                  <Field
                    label="Número de convidados"
                    name="quantidadeConvidados"
                    type="number"
                    min="1"
                    value={dados.quantidadeConvidados}
                    onChange={(e) => atualizar("quantidadeConvidados", e.target.value)}
                    required
                  />
                  <Field
                    label="Local ou espaço"
                    name="localNome"
                    value={dados.localNome}
                    onChange={(e) => atualizar("localNome", e.target.value)}
                    placeholder="Se já estiver definido"
                  />
                  <Field
                    label="Cidade"
                    name="cidade"
                    value={dados.cidade}
                    onChange={(e) => atualizar("cidade", e.target.value)}
                  />
                </div>
                <p className="text-muted-foreground mt-3 flex items-center gap-2 text-xs">
                  <CalendarDays className="size-4" /> Você pode escolher qualquer data a partir de
                  hoje.
                </p>
              </div>

              <div className="border-border border-t pt-7">
                <h3 className="font-display font-semibold">
                  Você também precisa de algum destes serviços?
                </h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {SERVICOS_ADICIONAIS.map((item) => (
                    <label
                      key={item}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-xl p-4 ring-1 transition",
                        adicionais.includes(item)
                          ? "bg-primary/5 ring-primary"
                          : "bg-surface ring-black/5 hover:ring-primary/30",
                      )}
                    >
                      <Checkbox
                        checked={adicionais.includes(item)}
                        onCheckedChange={(checked) =>
                          setAdicionais((atuais) =>
                            checked === true
                              ? [...atuais, item]
                              : atuais.filter((atual) => atual !== item),
                          )
                        }
                      />
                      <span className="text-sm font-medium leading-5">{item}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-5">
                  <Label htmlFor="observacoes" className="mb-1.5 block">
                    Algum detalhe importante?
                  </Label>
                  <Textarea
                    id="observacoes"
                    name="observacoes"
                    rows={4}
                    value={dados.observacoes}
                    onChange={(e) => atualizar("observacoes", e.target.value)}
                    placeholder="Restrições alimentares, estilo desejado, horário ou outras informações…"
                  />
                </div>
              </div>

              <Button type="button" className="h-12" onClick={avancarParaCardapio}>
                Ver o cardápio ideal para mim <ArrowRight className="size-4" />
              </Button>
            </section>

            <section className={etapa === 2 ? "grid gap-5" : "hidden"}>
              <div className="panel p-6 sm:p-8">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <p className="text-primary text-xs font-semibold uppercase tracking-wider">
                      Seleção personalizada
                    </p>
                    <h2 className="font-display mt-1 flex items-center gap-2 text-xl font-semibold">
                      <Utensils className="size-5" /> Escolha seus pratos
                    </h2>
                    <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
                      Mostramos primeiro os cardápios indicados para {formato || "seu evento"}. Os
                      itens que você marcar continuam escolhidos mesmo ao trocar de cardápio ou de
                      categoria.
                    </p>
                  </div>
                  <div className="bg-primary/10 text-primary shrink-0 rounded-xl px-4 py-3 text-center">
                    <strong className="font-display block text-xl">
                      {servicosSelecionados.length}
                    </strong>
                    <span className="text-xs">itens escolhidos</span>
                  </div>
                </div>

                <p className="bg-surface text-muted-foreground mt-5 flex gap-2 rounded-xl p-3 text-xs ring-1 ring-black/5">
                  <Info className="text-primary size-4 shrink-0" />
                  Os valores são personalizados para o seu evento e aparecem na proposta que
                  enviaremos.
                </p>

                {sugestoesChef.length ? (
                  <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-amber-950 ring-1 ring-amber-200">
                    <div className="flex gap-3">
                      <WandSparkles className="mt-0.5 size-5 shrink-0 text-amber-600" />
                      <div>
                        <p className="text-sm font-semibold">Sugestão do Chefe</p>
                        <p className="mt-0.5 text-xs text-amber-800">
                          Opções especiais preparadas para este tipo de evento.
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {sugestoesChef.map((sugestao) => (
                        <CartaoItem
                          key={sugestao.id}
                          servico={sugestao}
                          selecionado={servicosSelecionados.includes(sugestao.id)}
                          opcoes={opcoesDe(sugestao)}
                          escolha={escolhas[sugestao.id]}
                          onAlternar={(marcado) => alternarServico(sugestao.id, marcado)}
                          onEscolher={(opcaoId) =>
                            setEscolhas((atuais) => ({ ...atuais, [sugestao.id]: opcaoId }))
                          }
                        />
                      ))}
                    </div>
                  </div>
                ) : null}

                <div
                  className="mt-6 flex flex-wrap gap-2"
                  role="tablist"
                  aria-label="Cardápios disponíveis"
                >
                  {cardapiosDisponiveis.map((item) => (
                    <button
                      key={item}
                      type="button"
                      role="tab"
                      aria-selected={cardapioAtivo === item}
                      onClick={() => {
                        setCardapioAtivo(item);
                        setBusca("");
                      }}
                      className={cn(
                        "rounded-full px-4 py-2 text-xs font-semibold transition",
                        cardapioAtivo === item
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {item}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setMostrarTodos((atual) => !atual)}
                    className="text-primary rounded-full px-3 py-2 text-xs font-semibold hover:bg-primary/5"
                  >
                    {mostrarTodos ? "Mostrar só recomendados" : "Explorar outros cardápios"}
                  </button>
                </div>

                <div className="relative mt-5">
                  <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <Input
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Buscar prato, ingrediente ou categoria"
                    className="h-11 pl-10"
                  />
                </div>

                {categorias.length > 1 ? (
                  <nav className="mt-4 flex flex-wrap gap-2" aria-label="Categorias do cardápio">
                    {categorias.map((categoria) => {
                      const escolhidos = selecionados.filter(
                        (servico) => servico.categoria === categoria,
                      ).length;
                      return (
                        <button
                          key={categoria}
                          type="button"
                          onClick={() => abrirCategoria(categoria)}
                          className="bg-surface hover:ring-primary/40 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-black/5"
                        >
                          {categoria}
                          {escolhidos ? (
                            <span className="bg-primary text-primary-foreground grid min-w-5 place-items-center rounded-full px-1 text-[10px]">
                              {escolhidos}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </nav>
                ) : null}
              </div>

              <div className="grid gap-4">
                {categorias.length ? (
                  categorias.map((categoria) => {
                    const itens = servicosFiltrados.filter(
                      (servico) => servico.categoria === categoria,
                    );
                    const escolhidosNaCategoria = itens.filter((servico) =>
                      servicosSelecionados.includes(servico.id),
                    ).length;
                    const aberta = Boolean(termo) || categoriaAberta === categoria;
                    return (
                      <section
                        key={`${cardapioAtivo}-${categoria}`}
                        id={idCategoria(categoria)}
                        className="panel scroll-mt-4 p-5"
                      >
                        <h3>
                          <button
                            type="button"
                            onClick={() => alternarCategoria(categoria)}
                            aria-expanded={aberta}
                            aria-controls={`${idCategoria(categoria)}-itens`}
                            className="flex w-full items-center gap-3 text-left"
                          >
                            <ChevronRight
                              className={cn(
                                "text-primary size-5 shrink-0 transition-transform",
                                aberta && "rotate-90",
                              )}
                            />
                            <span className="font-display flex-1 text-lg font-semibold">
                              {categoria}
                            </span>
                            <span className="text-muted-foreground text-xs font-normal">
                              {itens.length} opções
                              {escolhidosNaCategoria
                                ? ` · ${escolhidosNaCategoria} escolhida(s)`
                                : ""}
                            </span>
                          </button>
                        </h3>
                        <div
                          id={`${idCategoria(categoria)}-itens`}
                          className={aberta ? "mt-4 grid gap-3 sm:grid-cols-2" : "hidden"}
                        >
                          {itens.map((servico) => (
                            <CartaoItem
                              key={servico.id}
                              servico={servico}
                              selecionado={servicosSelecionados.includes(servico.id)}
                              opcoes={opcoesDe(servico)}
                              escolha={escolhas[servico.id]}
                              onAlternar={(marcado) => alternarServico(servico.id, marcado)}
                              onEscolher={(opcaoId) =>
                                setEscolhas((atuais) => ({ ...atuais, [servico.id]: opcaoId }))
                              }
                            />
                          ))}
                        </div>
                      </section>
                    );
                  })
                ) : (
                  <div className="panel text-muted-foreground p-8 text-center text-sm">
                    Nenhuma opção encontrada para esta busca.
                  </div>
                )}
              </div>

              <div className="panel sticky bottom-2 z-10 grid gap-3 p-3 shadow-xl sm:bottom-3 sm:p-4">
                {verEscolhidos ? (
                  <div className="max-h-64 overflow-y-auto">
                    {selecionados.length ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {categoriasSelecionadas.map((categoria) => (
                          <div key={categoria}>
                            <p className="text-primary text-[11px] font-semibold uppercase tracking-wide">
                              {categoria}
                            </p>
                            <ul className="mt-1 grid gap-1">
                              {selecionados
                                .filter((servico) => servico.categoria === categoria)
                                .map((servico) => (
                                  <li key={servico.id} className="flex items-center gap-2 text-sm">
                                    <span className="min-w-0 flex-1">
                                      {nomeComEscolha(servico)}
                                      {semEscolha.includes(servico) ? (
                                        <span className="text-destructive block text-xs">
                                          Falta escolher o{" "}
                                          {(servico.opcoesRotulo || "opção").toLowerCase()}
                                        </span>
                                      ) : null}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => alternarServico(servico.id, false)}
                                      aria-label={`Remover ${servico.nome}`}
                                      className="text-muted-foreground hover:text-destructive rounded p-1"
                                    >
                                      <X className="size-4" />
                                    </button>
                                  </li>
                                ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">Nenhum item escolhido ainda.</p>
                    )}
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setVerEscolhidos((atual) => !atual)}
                    className="flex items-center gap-2 text-left"
                    aria-expanded={verEscolhidos}
                  >
                    <ListChecks className="text-primary size-5 shrink-0" />
                    <span>
                      <span className="block text-sm font-semibold">
                        {servicosSelecionados.length} itens no seu cardápio
                      </span>
                      <span className="text-primary block text-xs">
                        {verEscolhidos ? "Ocultar escolhidos" : "Ver escolhidos"}
                      </span>
                    </span>
                  </button>
                  <div className="flex shrink-0 gap-1.5 sm:gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="px-2 sm:px-3"
                      aria-label="Voltar aos dados do evento"
                      onClick={() => setEtapa(1)}
                    >
                      <ArrowLeft className="size-4" />{" "}
                      <span className="hidden sm:inline">Voltar</span>
                    </Button>
                    <Button type="button" size="sm" onClick={avancarParaRevisao}>
                      <span className="sm:hidden">Revisar</span>
                      <span className="hidden sm:inline">Revisar escolhas</span>
                      <ArrowRight className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            <section className={etapa === 3 ? "grid gap-5" : "hidden"}>
              <div className="panel p-6 sm:p-8">
                <p className="text-primary text-xs font-semibold uppercase tracking-wider">
                  Quase pronto
                </p>
                <h2 className="font-display mt-1 flex items-center gap-2 text-xl font-semibold">
                  <ClipboardCheck className="size-5" /> Revise sua solicitação
                </h2>
                <p className="text-muted-foreground mt-2 text-sm">
                  Confira os dados. O envio não fecha o pedido nem gera cobrança.
                </p>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <ResumoCard titulo="Contato" onEditar={() => setEtapa(1)}>
                    <p className="font-medium">{dados.nome}</p>
                    <p>{dados.email}</p>
                    <p>{dados.whatsapp}</p>
                  </ResumoCard>
                  <ResumoCard titulo="Evento" onEditar={() => setEtapa(1)}>
                    <p className="font-medium">
                      {dados.tipoEvento === "Outros" ? dados.tipoEventoOutro : dados.tipoEvento}
                    </p>
                    <p>
                      {dados.formatoServico} · {dados.quantidadeConvidados} convidados
                    </p>
                    <p>
                      {dados.dataEvento
                        ? new Date(`${dados.dataEvento}T12:00:00`).toLocaleDateString("pt-BR")
                        : ""}
                      {dados.cidade ? ` · ${dados.cidade}` : ""}
                    </p>
                  </ResumoCard>
                </div>

                {adicionais.length ? (
                  <div className="bg-surface mt-4 rounded-xl p-4 ring-1 ring-black/5">
                    <p className="text-xs font-semibold uppercase tracking-wide">
                      Serviços adicionais
                    </p>
                    <ul className="text-muted-foreground mt-2 grid gap-1 text-sm sm:grid-cols-2">
                      {adicionais.map((item) => (
                        <li key={item} className="flex gap-2">
                          <Check className="text-primary mt-0.5 size-4 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="mt-6 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-display font-semibold">Seu cardápio</h3>
                    <p className="text-muted-foreground text-xs">
                      {selecionados.length} itens selecionados
                    </p>
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={() => setEtapa(2)}>
                    Editar cardápio
                  </Button>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {categoriasSelecionadas.map((categoria) => (
                    <div key={categoria} className="bg-surface rounded-xl p-4 ring-1 ring-black/5">
                      <p className="text-primary text-xs font-semibold uppercase tracking-wide">
                        {categoria}
                      </p>
                      <ul className="mt-2 grid gap-1.5 text-sm">
                        {selecionados
                          .filter((item) => item.categoria === categoria)
                          .map((item) => (
                            <li key={item.id} className="flex gap-2">
                              <Check className="text-primary mt-0.5 size-4 shrink-0" />
                              <span>{nomeComEscolha(item)}</span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-muted-foreground flex max-w-xl gap-2 text-xs leading-5">
                  <Sparkles className="text-primary mt-0.5 size-4 shrink-0" />
                  Após o envio, a nossa equipe analisa as combinações, quantidades e disponibilidade
                  antes de apresentar o orçamento final.
                </p>
                <div className="flex shrink-0 gap-2">
                  <Button type="button" variant="outline" onClick={() => setEtapa(2)}>
                    <ArrowLeft className="size-4" /> Voltar
                  </Button>
                  <Button type="submit" disabled={enviando} className="h-11 min-w-44">
                    {enviando ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="size-4" />
                    )}
                    {enviando ? "Enviando…" : "Enviar solicitação"}
                  </Button>
                </div>
              </div>
            </section>

            <div className="hidden" aria-hidden="true">
              <Label htmlFor="website">Website</Label>
              <Input id="website" name="website" tabIndex={-1} autoComplete="off" />
            </div>
          </form>
        )}
      </div>
    </main>
  );
}

/** Cartão de um item do cardápio; quando escolhido e com opções, pede a escolha (ex.: recheio). */
function CartaoItem({
  servico,
  selecionado,
  opcoes,
  escolha,
  onAlternar,
  onEscolher,
}: {
  servico: ServicoPublico;
  selecionado: boolean;
  opcoes: ServicoPublico[];
  escolha: string | undefined;
  onAlternar: (marcado: boolean) => void;
  onEscolher: (opcaoId: string) => void;
}) {
  const preco = Number(servico.precoBase);
  const rotulo = servico.opcoesRotulo || "Opção";
  const idCampo = `escolha-${servico.id}`;
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl p-4 ring-1 transition",
        selecionado
          ? "bg-primary/5 ring-primary shadow-sm"
          : "bg-surface ring-black/5 hover:ring-primary/30",
      )}
    >
      <label className="flex cursor-pointer gap-3">
        {servico.imagemUrl ? (
          <img src={servico.imagemUrl} alt="" className="size-16 rounded-lg object-cover" />
        ) : null}
        <Checkbox
          checked={selecionado}
          onCheckedChange={(checked) => onAlternar(checked === true)}
          aria-label={`Selecionar ${servico.nome}`}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold leading-5">{servico.nome}</span>
          {servico.descricao ? (
            <span className="text-muted-foreground mt-1 block text-xs leading-5">
              {servico.descricao}
            </span>
          ) : null}
          {servico.precoVisivel && preco > 0 ? (
            <span className="text-primary mt-2 block text-xs font-semibold">
              {formatBRL(preco)} · {servico.unidade}
            </span>
          ) : null}
          {opcoes.length && !selecionado ? (
            <span className="text-muted-foreground mt-1 block text-xs">
              Você escolhe o {rotulo.toLowerCase()} ao marcar.
            </span>
          ) : null}
        </span>
      </label>
      {selecionado && opcoes.length ? (
        <div>
          <Label htmlFor={idCampo} className="mb-1 block text-xs">
            {rotulo} para {servico.nome}
          </Label>
          <select
            id={idCampo}
            value={escolha ?? ""}
            onChange={(event) => onEscolher(event.target.value)}
            aria-invalid={!escolha}
            className={cn(
              "border-input bg-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 text-sm focus-visible:ring-1 focus-visible:outline-none",
              !escolha && "border-destructive",
            )}
          >
            <option value="" disabled>
              Escolha o {rotulo.toLowerCase()}
            </option>
            {opcoes.map((opcao) => (
              <option key={opcao.id} value={opcao.id}>
                {opcao.nome}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}
