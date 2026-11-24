import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardCheck,
  ListChecks,
  Loader2,
  LogIn,
  MessageCircle,
  Minus,
  RotateCcw,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Utensils,
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
  CLASSE_ROTULO,
  ResumoCard,
  SelecaoFormulario as SelectField,
} from "@/features/orcamentos/formulario-publico-components";
import {
  DADOS_INICIAIS_FORMULARIO,
  descreverEscolhas,
  ETAPAS_FORMULARIO,
  intervaloHorarioValido,
  normalizarBusca,
  obterDataMinimaEvento,
  textoHorarioEvento,
  type DadosFormularioOrcamento,
} from "@/features/orcamentos/formulario-publico";
import {
  dataEstaBloqueada,
  MENSAGEM_DATA_BLOQUEADA,
  resumoDatasBloqueadas,
} from "@/features/eventos/datas-bloqueadas";
import {
  obterClienteConectado,
  obterFormularioOrcamento,
  obterPedidoParaRefazer,
  enviarSolicitacaoOrcamento,
} from "@/features/orcamentos/solicitacao-publica";
import { CampoDataEvento } from "@/features/orcamentos/campo-data-evento";
import {
  centosValidos,
  ehVendidoPorCento,
  MAXIMO_PORCOES,
  quantidadeDeCentos,
  textoCentos,
  totalEmCentos,
  type QuantidadeCento,
  type TamanhoPorcao,
} from "@/features/orcamentos/quantidade-cento";
import { login, logout } from "@/features/auth/server-functions";
import { desvincularPushAoSair, sincronizarPush } from "@/features/notificacoes/push-cliente";
import {
  agruparOpcoes,
  gruposSemEscolha,
  listaDeEscolhas,
} from "@/features/servicos/grupos-opcoes";
import { SERVICOS_ADICIONAIS, TIPOS_EVENTO, type ServicoAdicional } from "@/lib/catalogo";
import { formatBRL } from "@/lib/format";
import { aplicarCor } from "@/lib/theme-accent";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/solicitar-orcamento/$token")({
  loader: async ({ params }) => obterFormularioOrcamento({ data: { token: params.token } }),
  head: ({ loaderData }) => {
    const titulo = `Monte seu cardápio — ${loaderData?.nomeFantasia ?? "Buffet"}`;
    const descricao =
      "Conte sobre seu evento, escolha o cardápio e receba uma proposta personalizada.";
    const imagem = loaderData?.logoOrcamentoUrl ?? loaderData?.logoUrl;

    return {
      meta: [
        { title: titulo },
        { name: "description", content: descricao },
        { property: "og:title", content: titulo },
        { property: "og:description", content: descricao },
        ...(loaderData?.urlPublica ? [{ property: "og:url", content: loaderData.urlPublica }] : []),
        ...(imagem ? [{ property: "og:image", content: imagem }] : []),
      ],
      links: loaderData?.urlPublica ? [{ rel: "canonical", href: loaderData.urlPublica }] : [],
    };
  },
  component: SolicitarOrcamentoRota,
});

export type EmpresaFormularioOrcamento = Awaited<ReturnType<typeof obterFormularioOrcamento>>;
type ServicoPublico = EmpresaFormularioOrcamento["servicos"][number];
type Acesso =
  "CRIADO" | "JA_EXISTE" | "INDISPONIVEL" | "CONECTADO" | "CONFIRMAR_EMAIL" | "WHATSAPP";
type ClienteConectado = { nome: string; email: string; telefone: string; whatsapp: string };

const idCategoria = (categoria: string) =>
  `categoria-${normalizarBusca(categoria).replace(/[^a-z0-9]+/g, "-")}`;

function SolicitarOrcamentoRota() {
  const empresa = Route.useLoaderData();
  const { token } = Route.useParams();

  return <FormularioOrcamento empresa={empresa} token={token} />;
}

export function FormularioOrcamento({
  empresa,
  token,
  refazer,
}: {
  empresa: EmpresaFormularioOrcamento;
  token: string;
  /** Orçamento antigo do cliente para abrir com o mesmo cardápio ("Refazer pedido"). */
  refazer?: string;
}) {
  const buscarPedidoAntigo = useServerFn(obterPedidoParaRefazer);
  const [refazendo, setRefazendo] = useState<{ numero: string; itens: number } | null>(null);
  const logo = empresa.logoOrcamentoUrl ?? empresa.logoUrl;
  const enviar = useServerFn(enviarSolicitacaoOrcamento);
  const buscarConectado = useServerFn(obterClienteConectado);
  const entrarComoCliente = useServerFn(login);
  const sairDaConta = useServerFn(logout);
  const [dados, setDados] = useState<DadosFormularioOrcamento>(DADOS_INICIAIS_FORMULARIO);
  // "Já sou cliente": entra com e-mail e senha e pula os dados pessoais.
  const [modo, setModo] = useState<"novo" | "cliente">("novo");
  const [conectado, setConectado] = useState<ClienteConectado | null>(null);
  const [acessoCliente, setAcessoCliente] = useState({ email: "", senha: "" });
  const [entrando, setEntrando] = useState(false);
  const [etapa, setEtapa] = useState<1 | 2 | 3 | 4>(1);
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState<null | {
    acesso: Acesso;
    logado: boolean;
    linkEnviado: boolean;
    whatsappUrl: string | null;
  }>(null);
  // Pedido pelo WhatsApp (Configurações): sem login, sem senha e sem portal do cliente; no fim, o
  // pedido abre no WhatsApp da empresa.
  const pedidoWhatsapp = empresa.pedidoPeloWhatsapp;
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const [cardapioAtivo, setCardapioAtivo] = useState("");
  // A seleção vale para o pedido inteiro: trocar de cardápio ou categoria nunca a apaga.
  const [servicosSelecionados, setServicosSelecionados] = useState<string[]>([]);
  // Por item, a opção escolhida em cada grupo: { [servicoId]: { Recheio: id, Molho: id } }.
  const [escolhas, setEscolhas] = useState<Record<string, Record<string, string>>>({});
  // Itens vendidos por cento: quantas porções e de que tamanho (cento ou meio cento).
  const [quantidades, setQuantidades] = useState<Record<string, QuantidadeCento>>({});
  const [verEscolhidos, setVerEscolhidos] = useState(false);
  // Uma categoria aberta por vez (começam recolhidas); a busca abre as que têm resultado.
  const [categoriaAberta, setCategoriaAberta] = useState<string | null>(null);
  const [adicionais, setAdicionais] = useState<ServicoAdicional[]>([]);

  const formato = dados.formatoServico;
  // Datas que a equipe bloqueou (só as datas; o motivo é interno).
  const datasBloqueadas = empresa.datasBloqueadas;
  const dataIndisponivel = dataEstaBloqueada(dados.dataEvento, datasBloqueadas);
  // Aviso de data vazia só depois de tentar seguir para a revisão.
  const [tentouRevisar, setTentouRevisar] = useState(false);
  const semData = tentouRevisar && !dados.dataEvento;
  const todosCardapios = useMemo(
    () => empresa.cardapiosPublicos.map((cardapio) => cardapio.nome),
    [empresa.cardapiosPublicos],
  );
  // Cada formato abre os cardápios escolhidos pela equipe (na ordem dos cardápios);
  // formato sem cardápios definidos mostra todos.
  const cardapiosRecomendados = useMemo(() => {
    const doFormato = empresa.formatosServico.find((item) => item.nome === formato);
    if (!doFormato) return [];
    const indicados = todosCardapios.filter((nome) => doFormato.cardapios.includes(nome));
    return indicados.length ? indicados : todosCardapios;
  }, [empresa.formatosServico, formato, todosCardapios]);
  const cardapiosDisponiveis = mostrarTodos ? todosCardapios : cardapiosRecomendados;

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
  // Escolhas do item em grupos (ex.: Recheio e Molho), só com as opções que estão no cardápio.
  const gruposDe = (servico: ServicoPublico) =>
    agruparOpcoes(servico.opcoes)
      .map((grupo) => ({
        nome: grupo.nome,
        opcoes: grupo.ids
          .map((id) => porId.get(id))
          .filter((opcao): opcao is ServicoPublico => Boolean(opcao)),
      }))
      .filter((grupo) => grupo.opcoes.length);
  const faltamEm = (servico: ServicoPublico) =>
    gruposSemEscolha(
      gruposDe(servico).map((grupo) => ({
        nome: grupo.nome,
        ids: grupo.opcoes.map((opcao) => opcao.id),
      })),
      escolhas[servico.id],
    );

  const tipoEventoSelecionado = dados.tipoEvento || "";
  const aplicavelAoEvento = (tiposEvento: string[]) =>
    tiposEvento.length === 0 || tiposEvento.includes(tipoEventoSelecionado);
  const servicosDoCardapio = empresa.servicos.filter(
    (servico) =>
      !idsDeOpcoes.has(servico.id) &&
      aplicavelAoEvento(servico.tiposEvento) &&
      (cardapioAtivo ? servico.cardapios.includes(cardapioAtivo) : false),
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
  const semEscolha = selecionados.filter((servico) => faltamEm(servico).length > 0);
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
      setQuantidades((atuais) => {
        const { [id]: _removida, ...resto } = atuais;
        return resto;
      });
    }
  }

  /** Quantidade de um item por cento; sem escolha ainda, vale 1 cento. */
  const quantidadeDe = (id: string): QuantidadeCento =>
    quantidades[id] ?? { porcoes: 1, tamanho: "cento" };

  function nomeComEscolha(servico: ServicoPublico) {
    const partes = gruposDe(servico).flatMap((grupo) => {
      const escolhida = porId.get(escolhas[servico.id]?.[grupo.nome] ?? "");
      return escolhida ? [{ rotulo: grupo.nome, opcao: escolhida.nome }] : [];
    });
    const nome = descreverEscolhas(servico.nome, partes);
    // Na revisão, o salgado já mostra quanto foi pedido ("Bolinho de bacalhau · 1½ cento").
    return ehVendidoPorCento(servico.unidade)
      ? `${nome} · ${textoCentos(totalEmCentos(quantidadeDe(servico.id)))}`
      : nome;
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

  function usarClienteConectado(cliente: ClienteConectado) {
    setConectado(cliente);
    setDados((atuais) => ({
      ...atuais,
      nome: cliente.nome,
      email: cliente.email,
      telefone: cliente.telefone,
      whatsapp: cliente.whatsapp,
      senha: "",
      confirmarSenha: "",
    }));
  }

  // "Refazer pedido" do portal: abre com o cardápio de um orçamento antigo do cliente já marcado.
  useEffect(() => {
    if (!refazer) return;
    void buscarPedidoAntigo({ data: { orcamentoId: refazer } })
      .then((pedido) => {
        if (!pedido) return;
        const ids = pedido.servicosIds.filter((id) => porId.has(id));
        setServicosSelecionados(ids);
        setEscolhas(
          Object.fromEntries(
            Object.entries(pedido.escolhas)
              .filter(([id]) => ids.includes(id))
              .map(([id, porGrupo]) => [
                id,
                Object.fromEntries(
                  Object.entries(porGrupo).filter(([, opcao]) => porId.has(opcao)),
                ),
              ]),
          ),
        );
        setQuantidades(
          Object.fromEntries(
            Object.entries(pedido.quantidades)
              .filter(([id, centos]) => ids.includes(id) && centosValidos(centos))
              .map(([id, centos]) => [id, quantidadeDeCentos(centos)]),
          ),
        );
        setAdicionais(
          pedido.adicionais.filter((item): item is ServicoAdicional =>
            (SERVICOS_ADICIONAIS as readonly string[]).includes(item),
          ),
        );
        setDados((atuais) => ({
          ...atuais,
          tipoEvento: pedido.tipoEvento,
          tipoEventoOutro: pedido.tipoEventoOutro,
          formatoServico: pedido.formatoServico,
          quantidadeConvidados: pedido.quantidadeConvidados,
          localNome: pedido.localNome,
          cidade: pedido.cidade,
        }));
        setRefazendo({ numero: pedido.numero, itens: ids.length });
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refazer]);

  // Quem já está conectado neste aparelho é reconhecido ao abrir o formulário.
  useEffect(() => {
    if (pedidoWhatsapp) return;
    void buscarConectado({ data: { token } })
      .then((cliente) => {
        if (cliente) usarClienteConectado(cliente);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function entrar() {
    if (!acessoCliente.email.trim() || !acessoCliente.senha) {
      setErro("Informe seu e-mail e sua senha para entrar.");
      return;
    }
    setEntrando(true);
    setErro(null);
    try {
      await entrarComoCliente({
        data: { email: acessoCliente.email.trim(), senha: acessoCliente.senha },
      });
      const cliente = await buscarConectado({ data: { token } });
      if (!cliente) {
        await sairDaConta();
        setErro("Este acesso não é de um cliente deste buffet.");
        return;
      }
      await sincronizarPush().catch(() => {});
      usarClienteConectado(cliente);
      setAcessoCliente({ email: "", senha: "" });
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível entrar.");
    } finally {
      setEntrando(false);
    }
  }

  async function sair() {
    await desvincularPushAoSair().catch(() => {});
    await sairDaConta().catch(() => {});
    setConectado(null);
    setModo("cliente");
    setDados((atuais) => ({ ...atuais, nome: "", email: "", telefone: "", whatsapp: "" }));
  }

  /**
   * Valida só os campos de uma etapa: as outras etapas ficam escondidas e o navegador não
   * consegue apontar um campo escondido.
   */
  function etapaValida(id: string) {
    const campos = document
      .getElementById(id)
      ?.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
        "input, select, textarea",
      );
    for (const campo of campos ?? []) {
      if (!campo.checkValidity()) {
        campo.reportValidity();
        return false;
      }
    }
    return true;
  }

  function irPara(proxima: 1 | 2 | 3 | 4) {
    setErro(null);
    setEtapa(proxima);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /** Etapa 1 → 2: com o tipo e o formato escolhidos, o cardápio certo aparece. */
  function avancarParaCardapio() {
    if (!etapaValida("etapa-formato")) return;
    irPara(2);
  }

  /** Etapa 2 → 3: pelo menos um prato e todas as escolhas (recheio, molho...). */
  function avancarParaDados() {
    if (!servicosSelecionados.length) {
      setErro("Escolha pelo menos um item para montar sua proposta.");
      return;
    }
    if (semEscolha.length) {
      setErro(
        `Escolha ${semEscolha
          .map((servico) => `${listaDeEscolhas(faltamEm(servico))} de ${servico.nome}`)
          .join("; ")}.`,
      );
      setVerEscolhidos(true);
      return;
    }
    irPara(3);
  }

  /** Etapa 3 → 4: contato, data livre e horários coerentes. */
  function avancarParaRevisao() {
    setTentouRevisar(true);
    // A data vem do calendário próprio (um botão), que o navegador não valida sozinho.
    if (!dados.dataEvento) {
      document.getElementById("dataEvento")?.focus();
      return;
    }
    if (dataIndisponivel) {
      // O aviso já está junto do campo; aqui só impede avançar e leva a pessoa até ele.
      document.getElementById("dataEvento")?.focus();
      return;
    }
    if (!pedidoWhatsapp && !conectado && modo === "cliente") {
      setErro("Entre com seu e-mail e senha ou escolha “É meu primeiro pedido”.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (!pedidoWhatsapp && !conectado && dados.senha !== dados.confirmarSenha) {
      setErro("As senhas informadas são diferentes.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (!intervaloHorarioValido(dados.horaInicio, dados.horaFim)) {
      setErro("O horário de término deve ser posterior ao início do evento.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (!etapaValida("etapa-dados")) return;
    irPara(4);
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
          // No pedido pelo WhatsApp só o WhatsApp é pedido; ele vale também como telefone.
          email: pedidoWhatsapp ? "" : dados.email,
          telefone: pedidoWhatsapp ? dados.whatsapp : dados.telefone,
          whatsapp: dados.whatsapp,
          tipoEvento: dados.tipoEvento === "Outros" ? dados.tipoEventoOutro : dados.tipoEvento,
          formatoServico: formato,
          servicosAdicionais: adicionais,
          dataEvento: new Date(`${dados.dataEvento}T12:00:00`),
          horaInicio: dados.horaInicio,
          horaFim: dados.horaFim || null,
          quantidadeConvidados: Number(dados.quantidadeConvidados),
          localNome: dados.localNome || null,
          cidade: dados.cidade || null,
          observacoes: dados.observacoes || null,
          servicosIds: servicosSelecionados,
          // Centos de cada item vendido por cento (ex.: 3 × meio cento = 1,5).
          quantidades: Object.fromEntries(
            selecionados
              .filter((servico) => ehVendidoPorCento(servico.unidade))
              .map((servico) => [servico.id, totalEmCentos(quantidadeDe(servico.id))]),
          ),
          escolhas: Object.fromEntries(
            Object.entries(escolhas).filter(([id]) => servicosSelecionados.includes(id)),
          ),
          senha: pedidoWhatsapp || conectado ? "" : dados.senha,
          website,
        },
      });
      setConcluido({
        acesso: resposta.acesso,
        logado: resposta.logado,
        linkEnviado: resposta.linkEnviado,
        whatsappUrl: resposta.whatsappUrl,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
      // Mesma aba (não window.open): depois do envio, o celular bloquearia uma janela nova. No
      // celular abre o app do WhatsApp; a tela de concluído fica com o botão para abrir de novo.
      if (resposta.whatsappUrl) window.location.assign(resposta.whatsappUrl);
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
          <p className="text-muted-foreground mt-4 text-xs font-semibold uppercase tracking-wider">
            {empresa.nomeFantasia}
          </p>
          <h1 className="font-display mt-1.5 text-[1.75rem] leading-tight font-bold tracking-tight sm:text-4xl">
            Vamos montar seu evento?
          </h1>
          <p className="text-muted-foreground mx-auto mt-2 max-w-2xl text-[13px] leading-5 sm:text-base">
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
              {concluido.whatsappUrl ? "Pedido pronto!" : "Solicitação enviada com sucesso!"}
            </h2>
            <p className="text-muted-foreground mt-3 text-sm leading-6">
              {concluido.whatsappUrl
                ? "Abrimos o WhatsApp com o seu pedido escrito. É só tocar em enviar na conversa."
                : "Vamos analisar o seu pedido e, em breve, entraremos em contato para apresentar o orçamento completo."}
            </p>
            {concluido.whatsappUrl ? (
              <Button asChild className="mt-6 h-12 w-full sm:w-auto">
                <a href={concluido.whatsappUrl}>
                  <MessageCircle className="size-4" /> Abrir o WhatsApp de novo
                </a>
              </Button>
            ) : concluido.acesso === "WHATSAPP" ? null : concluido.acesso === "CONECTADO" ? (
              <>
                <p className="text-muted-foreground mt-3 text-sm leading-6">
                  O pedido foi registrado na sua conta. Você acompanha tudo pelo portal.
                </p>
                <Button asChild className="mt-6">
                  <Link to="/cliente">Acompanhar meu pedido</Link>
                </Button>
              </>
            ) : concluido.acesso === "CRIADO" ? (
              <>
                <p className="text-muted-foreground mt-3 text-sm leading-6">
                  Sua conta foi criada{concluido.logado ? " e você já está conectado" : ""}. Nas
                  próximas vezes, entre com o e-mail{" "}
                  <strong className="break-all">{dados.email}</strong> e a senha que você cadastrou.
                </p>
                <Button asChild className="mt-6">
                  <Link to={concluido.logado ? "/cliente" : "/"}>Acompanhar meu pedido</Link>
                </Button>
              </>
            ) : concluido.acesso === "CONFIRMAR_EMAIL" ? (
              <p className="text-muted-foreground mt-3 text-sm leading-6">
                Este e-mail já está no nosso cadastro.{" "}
                {concluido.linkEnviado ? (
                  <>
                    Para proteger seus dados, enviamos para{" "}
                    <strong className="break-all">{dados.email}</strong> um link para você criar sua
                    senha e acompanhar o pedido.
                  </>
                ) : (
                  "Para proteger seus dados, nossa equipe vai enviar um link para você criar sua senha e acompanhar o pedido."
                )}
              </p>
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
          <form className="grid grid-cols-1 gap-5" onSubmit={submit}>
            <nav
              className="panel grid grid-cols-4 gap-1.5 p-2 sm:gap-2"
              aria-label="Etapas do formulário"
            >
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
                    <span className={cn("font-medium", !ativa && "max-sm:sr-only")}>
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </nav>

            {erro ? (
              <p role="alert" className="bg-destructive/10 text-destructive rounded-xl p-4 text-sm">
                {erro}
              </p>
            ) : null}

            {refazendo ? (
              <p
                role="status"
                className="bg-primary/5 ring-primary/20 flex items-start gap-2 rounded-xl p-4 text-sm ring-1"
              >
                <RotateCcw className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
                <span>
                  <strong>Refazendo o pedido #{refazendo.numero}.</strong> O cardápio já veio
                  marcado ({refazendo.itens} {refazendo.itens === 1 ? "item" : "itens"}). Escolha a
                  nova data e confira os dados antes de enviar.
                </span>
              </p>
            ) : null}

            {/* Etapa 1: o formato (com o tipo de celebração) define os cardápios. */}
            <section
              id="etapa-formato"
              className={etapa === 1 ? "panel grid gap-8 p-5 sm:p-8" : "hidden"}
            >
              {/* Celebração num select; os formatos, logo abaixo, ficam à vista para tocar. */}
              <div className="grid gap-4">
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
                {dados.tipoEvento === "Outros" ? (
                  <Field
                    label="Qual é o tipo do evento?"
                    name="tipoEventoOutro"
                    value={dados.tipoEventoOutro}
                    onChange={(e) => atualizar("tipoEventoOutro", e.target.value)}
                    required
                  />
                ) : null}
              </div>

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
                {empresa.formatosServico.map((item) => (
                  <option key={item.nome} value={item.nome}>
                    {item.nome}
                  </option>
                ))}
              </SelectField>

              <Button type="button" className="h-12" onClick={avancarParaCardapio}>
                Ver cardápio
              </Button>
            </section>

            {/* Etapa 3: contato e detalhes do evento, depois de escolher os pratos. */}
            <section
              id="etapa-dados"
              className={etapa === 3 ? "panel grid gap-8 p-6 sm:p-8" : "hidden"}
            >
              <div>
                <p className="text-primary text-xs font-semibold uppercase tracking-wider">
                  Primeiro contato
                </p>
                <h2 className="font-display mt-1 text-xl font-semibold">
                  {conectado
                    ? `Olá, ${conectado.nome.trim().split(/\s+/)[0]}!`
                    : "Conte um pouco sobre você"}
                </h2>
                <p className="text-muted-foreground mt-1 text-[13px]">
                  {conectado
                    ? "Seus dados já estão salvos. Siga para os detalhes do evento."
                    : pedidoWhatsapp
                      ? "Respondemos o seu pedido por este WhatsApp."
                      : "Assim conseguimos retornar pelo canal certo."}
                </p>
                {pedidoWhatsapp ? (
                  // Sem conta: só o nome e o WhatsApp, que vão no topo da mensagem do pedido.
                  <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field
                      label="Nome"
                      name="nome"
                      autoComplete="name"
                      minLength={2}
                      value={dados.nome}
                      onChange={(e) => atualizar("nome", e.target.value)}
                      required
                    />
                    <Field
                      label="WhatsApp"
                      name="whatsapp"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={dados.whatsapp}
                      onChange={(e) => atualizar("whatsapp", e.target.value)}
                      placeholder="(86) 99999-9999"
                      required
                    />
                  </div>
                ) : conectado ? (
                  <div className="bg-surface mt-5 grid gap-3 rounded-xl p-4 ring-1 ring-black/5">
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      <CheckCircle2 className="text-success size-4" /> Você está conectado
                    </p>
                    <div className="text-muted-foreground grid gap-1 text-sm sm:grid-cols-2">
                      <p className="text-foreground font-medium">{conectado.nome}</p>
                      <p className="break-all">{conectado.email}</p>
                      {conectado.telefone ? <p>Telefone: {conectado.telefone}</p> : null}
                      {conectado.whatsapp ? <p>WhatsApp: {conectado.whatsapp}</p> : null}
                    </div>
                    {!conectado.telefone || !conectado.whatsapp ? (
                      <div className="grid gap-4 sm:grid-cols-2">
                        {!conectado.telefone ? (
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
                        ) : null}
                        {!conectado.whatsapp ? (
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
                        ) : null}
                      </div>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void sair()}
                      className="text-primary justify-self-start text-xs font-medium hover:underline"
                    >
                      Não é você? Sair
                    </button>
                  </div>
                ) : (
                  <>
                    <div
                      className="mt-5 grid grid-cols-2 gap-2"
                      role="radiogroup"
                      aria-label="Você já é nosso cliente?"
                    >
                      {(
                        [
                          ["novo", "É meu primeiro pedido"],
                          ["cliente", "Já sou cliente"],
                        ] as const
                      ).map(([valor, rotulo]) => (
                        <button
                          key={valor}
                          type="button"
                          role="radio"
                          aria-checked={modo === valor}
                          onClick={() => {
                            setModo(valor);
                            setErro(null);
                          }}
                          className={cn(
                            "rounded-xl px-3 py-3 text-sm font-medium ring-1 transition-colors",
                            modo === valor
                              ? "bg-primary text-primary-foreground ring-primary"
                              : "bg-surface ring-black/5 hover:bg-secondary",
                          )}
                        >
                          {rotulo}
                        </button>
                      ))}
                    </div>
                    {modo === "cliente" ? (
                      <div className="bg-surface mt-5 grid gap-4 rounded-xl p-4 ring-1 ring-black/5 sm:grid-cols-2">
                        <p className="text-muted-foreground text-xs sm:col-span-2">
                          Use o e-mail e a senha criados no seu primeiro pedido.
                        </p>
                        <Field
                          label="E-mail"
                          name="acessoEmail"
                          type="email"
                          autoComplete="email"
                          value={acessoCliente.email}
                          onChange={(e) =>
                            setAcessoCliente((atual) => ({ ...atual, email: e.target.value }))
                          }
                        />
                        <div>
                          <Label htmlFor="acessoSenha" className={CLASSE_ROTULO}>
                            Senha
                          </Label>
                          <InputSenha
                            id="acessoSenha"
                            className="h-11 text-base md:text-sm"
                            name="acessoSenha"
                            autoComplete="current-password"
                            value={acessoCliente.senha}
                            onChange={(e) =>
                              setAcessoCliente((atual) => ({ ...atual, senha: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              // Enter entra na conta em vez de enviar o formulário inteiro.
                              if (e.key === "Enter") {
                                e.preventDefault();
                                void entrar();
                              }
                            }}
                          />
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
                          <Link
                            to="/recuperar-senha"
                            search={{ email: acessoCliente.email.trim() }}
                            className="text-primary text-xs font-medium hover:underline"
                          >
                            Esqueci minha senha
                          </Link>
                          <Button type="button" onClick={() => void entrar()} disabled={entrando}>
                            {entrando ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <LogIn className="size-4" />
                            )}
                            Entrar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
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
                            Com o seu e-mail e esta senha você acompanha orçamento, pagamentos e
                            documentos no portal.
                          </p>
                          <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <div>
                              <Label htmlFor="senha" className={CLASSE_ROTULO}>
                                Senha
                              </Label>
                              <InputSenha
                                id="senha"
                                className="h-11 text-base md:text-sm"
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
                              <Label htmlFor="confirmarSenha" className={CLASSE_ROTULO}>
                                Confirme a senha
                              </Label>
                              <InputSenha
                                id="confirmarSenha"
                                className="h-11 text-base md:text-sm"
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
                      </>
                    )}
                  </>
                )}
              </div>

              <div className="border-border border-t pt-7">
                <p className="text-primary text-xs font-semibold uppercase tracking-wider">
                  O evento
                </p>
                <h2 className="font-display mt-1 text-xl font-semibold">Quando e onde vai ser?</h2>
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* min-w-0: um texto longo no campo da data não alarga a coluna além da tela. */}
                  <div className="grid min-w-0 content-start gap-1.5">
                    {/* Calendário próprio: as datas bloqueadas aparecem em vermelho e riscadas. */}
                    <CampoDataEvento
                      valor={dados.dataEvento}
                      onChange={(data) => atualizar("dataEvento", data)}
                      bloqueadas={datasBloqueadas}
                      minima={obterDataMinimaEvento()}
                      invalido={dataIndisponivel || semData}
                      descricaoId={
                        dataIndisponivel
                          ? "dataEvento-indisponivel"
                          : semData
                            ? "dataEvento-vazia"
                            : datasBloqueadas.length
                              ? "dataEvento-bloqueadas"
                              : undefined
                      }
                    />
                    {dataIndisponivel ? (
                      <p
                        id="dataEvento-indisponivel"
                        role="alert"
                        className="text-destructive text-sm"
                      >
                        {MENSAGEM_DATA_BLOQUEADA}
                      </p>
                    ) : semData ? (
                      <p id="dataEvento-vazia" role="alert" className="text-destructive text-sm">
                        Escolha a data do evento.
                      </p>
                    ) : datasBloqueadas.length ? (
                      <p id="dataEvento-bloqueadas" className="text-muted-foreground text-xs">
                        Datas indisponíveis: {resumoDatasBloqueadas(datasBloqueadas)}.
                      </p>
                    ) : null}
                  </div>
                  <Field
                    label="Horário de início"
                    name="horaInicio"
                    type="time"
                    step="900"
                    value={dados.horaInicio}
                    onChange={(e) => atualizar("horaInicio", e.target.value)}
                    required
                  />
                  <Field
                    label="Horário de término (opcional)"
                    name="horaFim"
                    type="time"
                    step="900"
                    min={dados.horaInicio || undefined}
                    value={dados.horaFim}
                    onChange={(e) => atualizar("horaFim", e.target.value)}
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
                    label="Endereço do evento"
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
                <h3 className="font-display font-semibold">Adicionais de interesse</h3>
                <p className="text-muted-foreground mt-1 text-[13px]">
                  Marque o que gostaria de incluir ou conversar com a nossa equipe.
                </p>
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
                  <Label htmlFor="observacoes" className={CLASSE_ROTULO}>
                    Algum detalhe importante?
                  </Label>
                  <Textarea
                    id="observacoes"
                    name="observacoes"
                    rows={4}
                    value={dados.observacoes}
                    onChange={(e) => atualizar("observacoes", e.target.value)}
                    placeholder="Restrições alimentares, estilo desejado ou outras informações…"
                  />
                </div>
              </div>

              <div className="grid grid-cols-[auto_1fr] gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-12"
                  onClick={() => irPara(2)}
                  aria-label="Voltar ao cardápio"
                >
                  <ArrowLeft className="size-4" />
                  <span className="hidden sm:inline">Voltar</span>
                </Button>
                <Button type="button" className="h-12" onClick={avancarParaRevisao}>
                  Revisar pedido <ArrowRight className="size-4" />
                </Button>
              </div>
            </section>

            <section className={etapa === 2 ? "grid gap-5" : "hidden"}>
              <div className="panel p-6 sm:p-8">
                {/* Só o essencial: o título e para qual formato é o cardápio. A contagem de itens
                    fica na barra de baixo, e o aviso dos valores vai para a revisão. */}
                <h2 className="font-display text-xl font-semibold">Escolha seus pratos</h2>
                {formato ? (
                  <p className="text-muted-foreground mt-1 text-[13px]">Cardápio para {formato}</p>
                ) : null}

                <div
                  className="mt-5 flex flex-wrap gap-2"
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

                {/* Texto curto que cabe no celular; a busca também acha ingrediente e categoria. */}
                <div className="relative mt-5">
                  <Search
                    className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
                    aria-hidden
                  />
                  <Input
                    type="search"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Buscar no cardápio"
                    aria-label="Buscar prato, ingrediente ou categoria"
                    enterKeyHint="search"
                    className="h-11 pr-11 pl-10 text-base [&::-webkit-search-cancel-button]:hidden"
                  />
                  {busca ? (
                    <button
                      type="button"
                      onClick={() => setBusca("")}
                      aria-label="Limpar busca"
                      className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1 grid size-9 -translate-y-1/2 place-items-center rounded-md"
                    >
                      <X className="size-4" />
                    </button>
                  ) : null}
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
                            <span className="font-display flex-1 text-base font-semibold">
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
                              grupos={gruposDe(servico)}
                              escolhas={escolhas[servico.id]}
                              quantidade={quantidadeDe(servico.id)}
                              onQuantidade={(quantidade) =>
                                setQuantidades((atuais) => ({
                                  ...atuais,
                                  [servico.id]: quantidade,
                                }))
                              }
                              onAlternar={(marcado) => alternarServico(servico.id, marcado)}
                              onEscolher={(grupo, opcaoId) =>
                                setEscolhas((atuais) => ({
                                  ...atuais,
                                  [servico.id]: { ...atuais[servico.id], [grupo]: opcaoId },
                                }))
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
                                          Falta escolher {listaDeEscolhas(faltamEm(servico))}
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
                      aria-label="Voltar ao formato"
                      onClick={() => irPara(1)}
                    >
                      <ArrowLeft className="size-4" />{" "}
                      <span className="hidden sm:inline">Voltar</span>
                    </Button>
                    <Button type="button" size="sm" onClick={avancarParaDados}>
                      Continuar
                      <ArrowRight className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            <section className={etapa === 4 ? "grid gap-5" : "hidden"}>
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

                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <ResumoCard titulo="Contato" onEditar={() => setEtapa(3)}>
                    <p className="font-medium">{dados.nome}</p>
                    {pedidoWhatsapp ? null : <p className="break-all">{dados.email}</p>}
                    <p>{dados.whatsapp}</p>
                  </ResumoCard>
                  <ResumoCard titulo="Evento" onEditar={() => setEtapa(3)}>
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
                      {dados.horaInicio
                        ? ` · ${textoHorarioEvento(dados.horaInicio, dados.horaFim)}`
                        : ""}
                      {dados.cidade ? ` · ${dados.cidade}` : ""}
                    </p>
                    {dados.observacoes ? (
                      <p className="whitespace-pre-wrap">Observações: {dados.observacoes}</p>
                    ) : null}
                  </ResumoCard>
                </div>

                {adicionais.length ? (
                  <div className="border-border mt-4 flex items-start justify-between gap-3 border-t pt-4">
                    <div>
                      <p className="text-sm font-medium">Adicionais de interesse</p>
                      <p className="text-muted-foreground mt-0.5 text-sm leading-5">
                        {adicionais.join(" · ")}
                      </p>
                    </div>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setEtapa(3)}>
                      Editar
                    </Button>
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
                  {pedidoWhatsapp
                    ? "Ao enviar, o WhatsApp abre com o seu pedido escrito. É só tocar em enviar na conversa."
                    : "Depois do envio, a equipe confere o cardápio e a data e manda o orçamento com os valores do seu evento."}
                </p>
                <div className="grid shrink-0 grid-cols-[auto_1fr] gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 sm:h-11"
                    onClick={() => setEtapa(3)}
                    aria-label="Voltar aos dados"
                  >
                    <ArrowLeft className="size-4" />
                    <span className="hidden sm:inline">Voltar</span>
                  </Button>
                  <Button type="submit" disabled={enviando} className="h-12 sm:h-11 sm:min-w-44">
                    {enviando ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : pedidoWhatsapp ? (
                      <MessageCircle className="size-4" />
                    ) : (
                      <CheckCircle2 className="size-4" />
                    )}
                    {enviando
                      ? "Enviando…"
                      : pedidoWhatsapp
                        ? "Enviar pelo WhatsApp"
                        : "Enviar solicitação"}
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

/**
 * Cartão de um item do cardápio. Itens por pessoa usam a caixa de marcar; itens vendidos por
 * cento (salgadinhos) usam "+ Adicionar", que vira o seletor de quantidade com o tamanho da
 * porção (cento ou meio cento), como nos apps de delivery. Escolhido e com opções, pede uma
 * escolha de cada grupo (ex.: o recheio e o molho da massa).
 */
function CartaoItem({
  servico,
  selecionado,
  grupos,
  escolhas,
  quantidade,
  onQuantidade,
  onAlternar,
  onEscolher,
}: {
  servico: ServicoPublico;
  selecionado: boolean;
  grupos: { nome: string; opcoes: ServicoPublico[] }[];
  escolhas: Record<string, string> | undefined;
  quantidade: QuantidadeCento;
  onQuantidade: (quantidade: QuantidadeCento) => void;
  onAlternar: (marcado: boolean) => void;
  onEscolher: (grupo: string, opcaoId: string) => void;
}) {
  const preco = Number(servico.precoBase);
  const porCento = ehVendidoPorCento(servico.unidade);
  const textos = (
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
      {grupos.length && !selecionado ? (
        <span className="text-muted-foreground mt-1 block text-xs">
          Você escolhe {listaDeEscolhas(grupos.map((grupo) => grupo.nome))} ao marcar.
        </span>
      ) : null}
    </span>
  );
  const foto = servico.imagemUrl ? (
    <img src={servico.imagemUrl} alt="" className="size-16 rounded-lg object-cover" />
  ) : null;
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl p-4 ring-1 transition",
        selecionado
          ? "bg-primary/5 ring-primary shadow-sm"
          : "bg-surface ring-black/5 hover:ring-primary/30",
      )}
    >
      {porCento ? (
        <div className="flex gap-3">
          {foto}
          {textos}
          {selecionado ? null : (
            <button
              type="button"
              onClick={() => onAlternar(true)}
              aria-label={`Adicionar ${servico.nome}`}
              className="text-primary ring-primary/40 hover:bg-primary/5 flex h-10 shrink-0 items-center gap-1 self-start rounded-full px-3 text-sm font-semibold ring-1"
            >
              <Plus className="size-4" aria-hidden /> Adicionar
            </button>
          )}
        </div>
      ) : (
        <label className="flex cursor-pointer gap-3">
          {foto}
          <Checkbox
            checked={selecionado}
            onCheckedChange={(checked) => onAlternar(checked === true)}
            aria-label={`Selecionar ${servico.nome}`}
          />
          {textos}
        </label>
      )}
      {porCento && selecionado ? (
        <ControleCentos
          nome={servico.nome}
          quantidade={quantidade}
          onMudar={onQuantidade}
          onRemover={() => onAlternar(false)}
        />
      ) : null}
      {selecionado
        ? grupos.map((grupo, indice) => {
            const idCampo = `escolha-${servico.id}-${indice}`;
            const escolha = escolhas?.[grupo.nome];
            return (
              <div key={grupo.nome}>
                <Label htmlFor={idCampo} className="mb-1 block text-xs">
                  {grupo.nome} para {servico.nome}
                </Label>
                <select
                  id={idCampo}
                  value={escolha ?? ""}
                  onChange={(event) => onEscolher(grupo.nome, event.target.value)}
                  aria-invalid={!escolha}
                  className={cn(
                    "border-input bg-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 text-sm focus-visible:ring-1 focus-visible:outline-none",
                    !escolha && "border-destructive",
                  )}
                >
                  <option value="" disabled>
                    Escolha {listaDeEscolhas([grupo.nome])}
                  </option>
                  {grupo.opcoes.map((opcao) => (
                    <option key={opcao.id} value={opcao.id}>
                      {opcao.nome}
                    </option>
                  ))}
                </select>
              </div>
            );
          })
        : null}
    </div>
  );
}

/**
 * Quantidade de um salgado: tamanho da porção (Cento | Meio cento) e quantas porções [– n +].
 * No 1, o "–" vira lixeira e tira o item; embaixo, o total em centos e em unidades.
 */
function ControleCentos({
  nome,
  quantidade,
  onMudar,
  onRemover,
}: {
  nome: string;
  quantidade: QuantidadeCento;
  onMudar: (quantidade: QuantidadeCento) => void;
  onRemover: () => void;
}) {
  const { porcoes, tamanho } = quantidade;
  const centos = totalEmCentos(quantidade);
  const tamanhos: { valor: TamanhoPorcao; rotulo: string }[] = [
    { valor: "cento", rotulo: "Cento" },
    { valor: "meio", rotulo: "Meio cento" },
  ];
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          role="radiogroup"
          aria-label={`Tamanho da porção de ${nome}`}
          className="bg-muted inline-flex rounded-full p-1"
        >
          {tamanhos.map((item) => (
            <button
              key={item.valor}
              type="button"
              role="radio"
              aria-checked={tamanho === item.valor}
              onClick={() => onMudar({ porcoes, tamanho: item.valor })}
              className={cn(
                "h-9 rounded-full px-3 text-sm font-medium transition-colors",
                tamanho === item.valor
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.rotulo}
            </button>
          ))}
        </div>
        <div className="ring-primary/40 inline-flex items-center rounded-full ring-1">
          <button
            type="button"
            onClick={() =>
              porcoes <= 1 ? onRemover() : onMudar({ porcoes: porcoes - 1, tamanho })
            }
            aria-label={porcoes <= 1 ? `Remover ${nome}` : `Diminuir ${nome}`}
            className="text-primary hover:bg-primary/5 grid size-10 place-items-center rounded-full"
          >
            {porcoes <= 1 ? (
              <Trash2 className="size-4" aria-hidden />
            ) : (
              <Minus className="size-4" aria-hidden />
            )}
          </button>
          <span
            className="min-w-8 text-center text-base font-semibold tabular-nums"
            aria-live="polite"
          >
            {porcoes}
          </span>
          <button
            type="button"
            onClick={() => onMudar({ porcoes: porcoes + 1, tamanho })}
            disabled={porcoes >= MAXIMO_PORCOES}
            aria-label={`Aumentar ${nome}`}
            className="text-primary hover:bg-primary/5 grid size-10 place-items-center rounded-full disabled:opacity-40"
          >
            <Plus className="size-4" aria-hidden />
          </button>
        </div>
      </div>
      <p className="text-muted-foreground text-xs">
        {tamanho === "meio" ? `${porcoes} × meio cento = ` : ""}
        <span className="text-foreground font-medium">{textoCentos(centos)}</span> · {centos * 100}{" "}
        unidades
      </p>
    </div>
  );
}
