import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { criarConvite } from "@/features/clientes/convites.server";
import { dataEventoEhFutura } from "@/features/eventos/data-evento";
import { chaveDaData, MENSAGEM_DATA_BLOQUEADA } from "@/features/eventos/datas-bloqueadas";
import {
  descreverEscolha,
  montarPedidoParaRefazer,
  type PedidoParaRefazer,
} from "@/features/orcamentos/formulario-publico";
import { phoneSchema, whatsappSchema } from "@/features/shared/validation/primitives";
import { SERVICOS_ADICIONAIS, TIPOS_EVENTO } from "@/lib/catalogo";
import { serialize } from "@/lib/domain.server";
import { enviarEmailConvite } from "@/lib/email.server";
import { notificarNovaSolicitacaoEmpresa } from "@/lib/empresa-notification.server";
import { urlFormularioPublico } from "@/lib/formulario-publico-url.server";
import { hashPassword } from "@/lib/password.server";
import { exigirDentroDoLimite } from "@/lib/limite-taxa.server";
import { quantidadePadrao, unidadeNoOrcamento } from "@/features/orcamentos/unidade-item";
import { getPrisma } from "@/lib/prisma.server";
import { enviarPush } from "@/lib/push.server";
import { getAuthContext, issueSession, requirePermission } from "@/lib/session.server";
import { telefoneDe } from "@/lib/empresa-cabecalho";
import { mesmoTelefone } from "@/lib/telefone";

const tokenSchema = z.object({ token: z.string().uuid() });
const horarioSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido.");

const solicitacaoSchema = tokenSchema
  .extend({
    nome: z.string().trim().min(2).max(160),
    email: z.string().trim().email().toLowerCase(),
    telefone: phoneSchema,
    whatsapp: whatsappSchema,
    tipoEvento: z.string().trim().min(2).max(100),
    formatoServico: z.string().trim().min(2).max(100),
    servicosAdicionais: z
      .array(z.enum(SERVICOS_ADICIONAIS))
      .max(SERVICOS_ADICIONAIS.length)
      .default([]),
    dataEvento: z.coerce.date(),
    horaInicio: horarioSchema,
    horaFim: horarioSchema.nullable().optional(),
    quantidadeConvidados: z.coerce.number().int().positive().max(100000),
    localNome: z.string().trim().max(160).nullable().optional(),
    cidade: z.string().trim().max(120).nullable().optional(),
    observacoes: z.string().trim().max(4000).nullable().optional(),
    servicosIds: z.array(z.string().uuid()).min(1).max(300),
    // Opção escolhida para cada item que pede uma escolha (ex.: { massaId: recheioId }).
    escolhas: z.record(z.string().uuid(), z.string().uuid()).default({}),
    // Senha curta (a partir de 4 dígitos) é aceita porque o login bloqueia tentativas repetidas.
    // Cliente já conectado não envia senha: o pedido vai para a conta da sessão.
    senha: z.string().max(200).default(""),
    website: z.string().max(0).optional(),
  })
  .superRefine((dados, contexto) => {
    if (!dataEventoEhFutura(dados.dataEvento.toISOString().slice(0, 10))) {
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dataEvento"],
        message: "A data do evento deve ser a partir de amanhã.",
      });
    }
    if (dados.horaFim && dados.horaFim <= dados.horaInicio) {
      contexto.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["horaFim"],
        message: "O horário de término deve ser posterior ao início do evento.",
      });
    }
  });

function validarSolicitacao(value: unknown) {
  const resultado = solicitacaoSchema.safeParse(value);
  if (resultado.success) return resultado.data;

  const camposInvalidos = new Set(resultado.error.issues.map((issue) => issue.path[0]));
  if (camposInvalidos.has("senha")) {
    throw new Error("Crie uma senha com pelo menos 4 caracteres.");
  }
  if (camposInvalidos.has("telefone") || camposInvalidos.has("whatsapp")) {
    throw new Error("Informe um telefone e WhatsApp válidos, incluindo o DDD.");
  }
  if (camposInvalidos.has("dataEvento")) {
    throw new Error("A data do evento deve ser a partir de amanhã.");
  }
  if (camposInvalidos.has("horaInicio") || camposInvalidos.has("horaFim")) {
    throw new Error(
      resultado.error.issues.find((issue) =>
        ["horaInicio", "horaFim"].includes(String(issue.path[0])),
      )?.message ?? "Informe um horário válido para o evento.",
    );
  }

  throw new Error("Revise os campos do formulário e tente novamente.");
}

const paraHorario = (horario: string | null | undefined) =>
  horario ? new Date(`1970-01-01T${horario}:00.000Z`) : null;

async function carregarFormularioOrcamento(token?: string) {
  const empresa = await getPrisma().empresa.findFirst({
    where: token ? { linkOrcamentoToken: token } : undefined,
    // Cada instalação possui uma empresa; a ordem mantém o resultado determinístico caso existam
    // dados legados adicionais.
    orderBy: { createdAt: "asc" },
    select: {
      linkOrcamentoToken: true,
      nomeFantasia: true,
      logoUrl: true,
      logoOrcamentoUrl: true,
      corTema: true,
      servicos: {
        where: { ativo: true },
        select: {
          id: true,
          nome: true,
          categoria: true,
          tiposEvento: true,
          cardapios: true,
          descricao: true,
          imagemUrl: true,
          unidade: true,
          precoBase: true,
          precoVisivel: true,
          ordem: true,
          opcoesRotulo: true,
          opcoes: { select: { opcaoId: true } },
        },
        orderBy: [{ ordem: "asc" }, { categoria: "asc" }, { nome: "asc" }],
      },
      categoriasCardapio: {
        select: { nome: true, ordem: true },
        orderBy: [{ ordem: "asc" }, { nome: "asc" }],
      },
      cardapiosPublicos: {
        select: { nome: true },
        orderBy: [{ ordem: "asc" }, { nome: "asc" }],
      },
      formatosServico: {
        select: { nome: true, cardapios: true },
        orderBy: [{ ordem: "asc" }, { nome: "asc" }],
      },
      // Só a data: o motivo do bloqueio é interno e nunca vai para o formulário público.
      datasBloqueadas: {
        where: { data: { gte: new Date(`${chaveDaData(new Date())}T00:00:00.000Z`) } },
        select: { data: true },
        orderBy: { data: "asc" },
      },
    },
  });
  if (!empresa) throw new Error("Link de orçamento inválido ou desativado.");

  const { linkOrcamentoToken, datasBloqueadas, ...formulario } = empresa;
  return {
    token: linkOrcamentoToken,
    formulario: serialize({
      ...formulario,
      datasBloqueadas: datasBloqueadas.map((bloqueio) => chaveDaData(bloqueio.data)),
      urlPublica: urlFormularioPublico(),
    }),
  };
}

export const obterFormularioOrcamento = createServerFn({ method: "GET" })
  .validator((value: unknown) => tokenSchema.parse(value))
  .handler(async ({ data }) => (await carregarFormularioOrcamento(data.token)).formulario);

/** Formulário da empresa desta instalação para a URL pública curta `/orcamento`. */
export const obterFormularioOrcamentoCurto = createServerFn({ method: "GET" }).handler(async () =>
  carregarFormularioOrcamento(),
);

/** Entre dois pedidos seguidos com o mesmo e-mail, não envia outro link de ativação. */
const INTERVALO_CONVITE_MS = 15 * 60 * 1000;

/**
 * O formulário não prova quem digitou o e-mail. Para um cliente que já existe e não tem conta,
 * o acesso só é liberado pelo link enviado ao e-mail do cadastro. Falha no envio não perde o pedido.
 */
async function enviarLinkDeAtivacao(
  cliente: { id: string; nome: string; email: string },
  nomeEmpresa: string,
) {
  try {
    const recente = await getPrisma().conviteCliente.count({
      where: {
        clienteId: cliente.id,
        createdAt: { gte: new Date(Date.now() - INTERVALO_CONVITE_MS) },
      },
    });
    if (recente) return true;
    const { token } = await criarConvite(getPrisma(), cliente.id);
    await enviarEmailConvite({
      destinatario: cliente.email,
      nome: cliente.nome,
      nomeEmpresa,
      token,
    });
    return true;
  } catch (error) {
    console.error(
      "Falha ao enviar link de ativação:",
      error instanceof Error ? error.message : "erro desconhecido",
    );
    return false;
  }
}

/**
 * Cliente deste buffet já conectado neste navegador: o formulário mostra os dados dele e
 * pula a parte de contato. A identidade vem só da sessão, nunca do que foi digitado.
 */
export const obterClienteConectado = createServerFn({ method: "GET" })
  .validator((value: unknown) => tokenSchema.parse(value))
  .handler(async ({ data }) => {
    const auth = await getAuthContext();
    if (!auth || auth.role !== "CLIENT" || !auth.clienteId) return null;
    const cliente = await getPrisma().cliente.findFirst({
      where: { id: auth.clienteId, empresa: { linkOrcamentoToken: data.token } },
      select: { nome: true, email: true, telefone: true, whatsapp: true },
    });
    if (!cliente) return null;
    return {
      nome: cliente.nome,
      email: cliente.email ?? auth.email,
      telefone: telefoneDe(cliente.telefone) ?? "",
      whatsapp: telefoneDe(cliente.whatsapp) ?? "",
    };
  });

export const obterLinkFormularioOrcamento = createServerFn({ method: "GET" }).handler(async () => {
  const auth = await requirePermission("orcamentos");
  const empresa = await getPrisma().empresa.findUnique({
    where: { id: auth.empresaId },
    select: { linkOrcamentoToken: true },
  });
  if (!empresa) throw new Error("Empresa não encontrada.");
  return {
    token: empresa.linkOrcamentoToken,
    url: urlFormularioPublico(),
  };
});

export const enviarSolicitacaoOrcamento = createServerFn({ method: "POST" })
  .validator(validarSolicitacao)
  .handler(async ({ data }) => {
    if (data.website) throw new Error("Solicitação inválida.");
    exigirDentroDoLimite("pedidoOrcamento");
    const inicioDeHoje = new Date();
    inicioDeHoje.setHours(0, 0, 0, 0);
    if (data.dataEvento < inicioDeHoje) {
      throw new Error("Escolha uma data a partir de hoje.");
    }
    const empresa = await getPrisma().empresa.findUnique({
      where: { linkOrcamentoToken: data.token },
      select: { id: true, nomeFantasia: true, email: true, whatsapp: true },
    });
    if (!empresa) throw new Error("Link de orçamento inválido ou desativado.");
    // A tela já avisa, mas o servidor também recusa: ninguém contorna o bloqueio pelo navegador.
    const dataBloqueada = await getPrisma().dataBloqueada.count({
      where: {
        empresaId: empresa.id,
        data: new Date(`${chaveDaData(data.dataEvento)}T00:00:00.000Z`),
      },
    });
    if (dataBloqueada) throw new Error(MENSAGEM_DATA_BLOQUEADA);
    const formatoExiste = await getPrisma().formatoServico.count({
      where: { empresaId: empresa.id, nome: data.formatoServico },
    });
    if (!formatoExiste) {
      throw new Error(
        "Este formato não está mais disponível. Recarregue a página e escolha outro.",
      );
    }
    // Cliente conectado (sessão deste buffet): o pedido entra direto na conta dele.
    const sessao = await getAuthContext();
    const clienteConectadoId =
      sessao?.role === "CLIENT" && sessao.empresaId === empresa.id ? sessao.clienteId : null;
    if (!clienteConectadoId && data.senha.length < 4) {
      throw new Error("Crie uma senha com pelo menos 4 caracteres.");
    }
    const senhaHash = clienteConectadoId ? null : await hashPassword(data.senha);

    const resultado = await getPrisma().$transaction(async (tx) => {
      const servicosIds = [...new Set(data.servicosIds)];
      const servicos = await tx.servico.findMany({
        where: { empresaId: empresa.id, ativo: true, id: { in: servicosIds } },
        include: {
          opcoes: { include: { opcao: { select: { id: true, nome: true, ativo: true } } } },
        },
        orderBy: [{ categoria: "asc" }, { nome: "asc" }],
      });
      if (servicos.length !== servicosIds.length) {
        throw new Error("Um ou mais itens do cardápio não estão disponíveis.");
      }
      // Itens com opções (ex.: massa recheada) exigem uma opção válida daquele item.
      const descricoes = new Map<string, string>();
      for (const servico of servicos) {
        const opcoes = servico.opcoes.map((item) => item.opcao).filter((opcao) => opcao.ativo);
        if (!opcoes.length) {
          descricoes.set(servico.id, servico.nome);
          continue;
        }
        const rotulo = servico.opcoesRotulo || "Opção";
        const escolhida = opcoes.find((opcao) => opcao.id === data.escolhas[servico.id]);
        if (!escolhida) {
          throw new Error(`Escolha o ${rotulo.toLowerCase()} de ${servico.nome}.`);
        }
        descricoes.set(servico.id, descreverEscolha(servico.nome, rotulo, escolhida.nome));
      }

      // O cliente é identificado só pelo e-mail: telefone/WhatsApp pode ser compartilhado
      // (família, empresa), e casar por ele juntava pedidos de pessoas diferentes.
      const clienteConectado = clienteConectadoId
        ? await tx.cliente.findFirst({ where: { id: clienteConectadoId, empresaId: empresa.id } })
        : null;
      if (clienteConectadoId && !clienteConectado)
        throw new Error("Sessão inválida. Entre novamente.");
      const clienteExistente =
        clienteConectado ??
        (await tx.cliente.findFirst({
          where: { empresaId: empresa.id, email: { equals: data.email, mode: "insensitive" } },
          orderBy: { updatedAt: "desc" },
        }));
      // Formulário público não autentica quem envia: nunca altera os dados de um cliente
      // existente (nem campos vazios, pois a equipe usa esse telefone para enviar o convite de
      // acesso). O que veio diferente fica registrado no evento para a equipe conferir.
      const divergencias =
        clienteExistente && !clienteConectado
          ? [
              clienteExistente.nome !== data.nome ? `nome "${data.nome}"` : null,
              clienteExistente.email && clienteExistente.email !== data.email
                ? `e-mail "${data.email}"`
                : null,
              mesmoTelefone(clienteExistente.telefone, data.telefone)
                ? null
                : `telefone "${data.telefone}"`,
              mesmoTelefone(clienteExistente.whatsapp, data.whatsapp)
                ? null
                : `WhatsApp "${data.whatsapp}"`,
            ].filter((item) => item !== null)
          : [];
      const cliente = clienteConectado
        ? // Conectado, a identidade vem da sessão: completa o que estiver faltando na própria conta.
          await tx.cliente.update({
            where: { id: clienteConectado.id },
            data: {
              email: clienteConectado.email ?? data.email,
              telefone: clienteConectado.telefone ?? data.telefone,
              whatsapp: clienteConectado.whatsapp ?? data.whatsapp,
            },
          })
        : (clienteExistente ??
          (await tx.cliente.create({
            data: {
              empresaId: empresa.id,
              nome: data.nome,
              tipoPessoa: "FISICA",
              email: data.email,
              telefone: data.telefone,
              whatsapp: data.whatsapp,
              observacoes: "Cadastro realizado pelo formulário público de orçamento.",
            },
          })));

      // Só um e-mail que ninguém usa cria conta na hora. E-mail de cliente já cadastrado recebe
      // um link: sem isso, quem soubesse o e-mail abriria a conta e veria os eventos do cliente.
      let acesso: "CRIADO" | "JA_EXISTE" | "INDISPONIVEL" | "CONECTADO" | "CONFIRMAR_EMAIL";
      let usuarioCriado: { id: string; sessaoVersao: number } | null = null;
      if (clienteConectado) {
        acesso = "CONECTADO";
      } else if (clienteExistente?.usuarioId) {
        acesso = "JA_EXISTE";
      } else {
        const emailEmUso = await tx.usuario.count({
          where: { empresaId: empresa.id, email: data.email },
        });
        if (emailEmUso) {
          acesso = "INDISPONIVEL";
        } else if (clienteExistente) {
          acesso = "CONFIRMAR_EMAIL";
        } else {
          if (!senhaHash) throw new Error("Crie uma senha com pelo menos 4 caracteres.");
          const usuario = await tx.usuario.create({
            data: {
              empresaId: empresa.id,
              nome: cliente.nome,
              email: data.email,
              senhaHash,
              role: "CLIENT",
              // A conta já sai conectada: este é o primeiro acesso do cliente.
              ultimoLogin: new Date(),
            },
          });
          await tx.cliente.update({ where: { id: cliente.id }, data: { usuarioId: usuario.id } });
          usuarioCriado = { id: usuario.id, sessaoVersao: usuario.sessaoVersao };
          acesso = "CRIADO";
        }
      }

      const evento = await tx.evento.create({
        data: {
          empresaId: empresa.id,
          clienteId: cliente.id,
          nome: clienteConectado ? cliente.nome : data.nome,
          tipo: data.tipoEvento,
          formatoServico: data.formatoServico,
          servicosAdicionais: data.servicosAdicionais,
          dataEvento: data.dataEvento,
          horaInicio: paraHorario(data.horaInicio),
          horaFim: paraHorario(data.horaFim),
          quantidadeConvidados: data.quantidadeConvidados,
          localNome: data.localNome,
          cidade: data.cidade,
          status: "ORCAMENTO",
          // Este campo aparece como a observação do cliente. Avisos internos ficam no orçamento.
          observacoes: data.observacoes || null,
        },
      });

      const ultimoOrcamento = await tx.orcamento.findFirst({
        where: { empresaId: empresa.id },
        orderBy: { numero: "desc" },
        select: { numero: true },
      });
      const itens = servicos.map((servico) => {
        const unidade = unidadeNoOrcamento(servico.unidade);
        const quantidade = quantidadePadrao(unidade, data.quantidadeConvidados);
        const valorUnitario = Number(servico.precoBase);
        return { servico, unidade, quantidade, valorUnitario, total: quantidade * valorUnitario };
      });
      const subtotal = itens.reduce((total, item) => total + item.total, 0);
      const orcamento = await tx.orcamento.create({
        data: {
          empresaId: empresa.id,
          eventoId: evento.id,
          numero: (ultimoOrcamento?.numero ?? 0n) + 1n,
          subtotal: subtotal.toFixed(2),
          desconto: "0.00",
          total: subtotal.toFixed(2),
          observacoes: [
            `Formato solicitado: ${data.formatoServico}.`,
            "Cardápio selecionado pelo cliente no formulário público. Valores sob consulta serão definidos pela equipe.",
            divergencias.length
              ? `Atenção: o formulário informou dados diferentes do cadastro do cliente (${divergencias.join(", ")}). Confirme antes de atualizar o cadastro.`
              : null,
          ]
            .filter(Boolean)
            .join("\n"),
          itens: {
            create: itens.map(({ servico, unidade, quantidade, valorUnitario, total }) => ({
              servicoId: servico.id,
              descricao: descricoes.get(servico.id) ?? servico.nome,
              quantidade: quantidade.toString(),
              unidade,
              valorUnitario: valorUnitario.toFixed(2),
              desconto: "0.00",
              valorTotal: total.toFixed(2),
            })),
          },
        },
      });
      const administradores = await tx.usuario.findMany({
        where: {
          empresaId: empresa.id,
          role: "ADMIN",
          ativo: true,
          administradorInstalacao: false,
        },
        select: { id: true },
      });
      if (administradores.length) {
        await tx.notificacao.createMany({
          data: administradores.map((usuario) => ({
            usuarioId: usuario.id,
            tipo: "SOLICITACAO_ORCAMENTO_RECEBIDA",
            titulo: "Nova solicitação de orçamento",
            mensagem: `${cliente.nome} enviou uma solicitação para ${data.tipoEvento}.`,
          })),
        });
      }
      return {
        eventoId: evento.id,
        orcamentoId: orcamento.id,
        nomeCliente: cliente.nome,
        clienteId: cliente.id,
        emailCliente: cliente.email,
        acesso,
        usuarioCriado,
        administradoresIds: administradores.map((usuario) => usuario.id),
      };
    });

    await enviarPush(resultado.administradoresIds, {
      titulo: "Nova solicitação de orçamento",
      mensagem: `${resultado.nomeCliente} enviou uma solicitação para ${data.tipoEvento}.`,
      url: `/admin/eventos/${resultado.eventoId}`,
    });

    const linkEnviado =
      resultado.acesso === "CONFIRMAR_EMAIL" && resultado.emailCliente
        ? await enviarLinkDeAtivacao(
            {
              id: resultado.clienteId,
              nome: resultado.nomeCliente,
              email: resultado.emailCliente,
            },
            empresa.nomeFantasia,
          )
        : false;

    const notificacoes = await notificarNovaSolicitacaoEmpresa({
      email: empresa.email,
      whatsapp: empresa.whatsapp,
      nomeEmpresa: empresa.nomeFantasia,
      nomeCliente: resultado.nomeCliente,
      tipoEvento: data.tipoEvento,
      dataEvento: data.dataEvento,
      orcamentoId: resultado.orcamentoId,
    });
    // Conta recém-criada já sai logada: o cliente acompanha o pedido sem digitar a senha de novo.
    if (resultado.usuarioCriado) {
      issueSession(resultado.usuarioCriado.id, resultado.usuarioCriado.sessaoVersao);
    }
    return serialize({
      eventoId: resultado.eventoId,
      orcamentoId: resultado.orcamentoId,
      nomeCliente: resultado.nomeCliente,
      acesso: resultado.acesso,
      linkEnviado,
      logado: Boolean(resultado.usuarioCriado) || resultado.acesso === "CONECTADO",
      notificacoes,
    });
  });

/**
 * "Refazer pedido" do portal: devolve o cardápio de um orçamento do próprio cliente para o
 * formulário abrir já preenchido. Outro cliente ou visitante sem conta recebe null.
 */
export const obterPedidoParaRefazer = createServerFn({ method: "GET" })
  .validator((value: unknown) => z.object({ orcamentoId: z.string().uuid() }).parse(value))
  .handler(async ({ data }): Promise<PedidoParaRefazer | null> => {
    const auth = await getAuthContext();
    if (!auth || auth.role !== "CLIENT" || !auth.clienteId) return null;
    const orcamento = await getPrisma().orcamento.findFirst({
      where: {
        id: data.orcamentoId,
        empresaId: auth.empresaId,
        evento: { clienteId: auth.clienteId },
      },
      select: {
        numero: true,
        evento: {
          select: {
            tipo: true,
            formatoServico: true,
            quantidadeConvidados: true,
            localNome: true,
            cidade: true,
            servicosAdicionais: true,
          },
        },
        itens: {
          // Só itens que ainda estão ativos no cardápio.
          where: { servico: { ativo: true } },
          select: {
            servicoId: true,
            descricao: true,
            servico: {
              select: { opcoes: { select: { opcao: { select: { id: true, nome: true } } } } },
            },
          },
        },
      },
    });
    if (!orcamento) return null;
    return montarPedidoParaRefazer({
      numero: orcamento.numero.toString(),
      tipo: orcamento.evento.tipo,
      tiposConhecidos: TIPOS_EVENTO,
      formatoServico: orcamento.evento.formatoServico,
      quantidadeConvidados: orcamento.evento.quantidadeConvidados,
      localNome: orcamento.evento.localNome,
      cidade: orcamento.evento.cidade,
      servicosAdicionais: orcamento.evento.servicosAdicionais,
      itens: orcamento.itens.map((item) => ({
        servicoId: item.servicoId,
        descricao: item.descricao,
        opcoes: item.servico?.opcoes.map((entrada) => entrada.opcao) ?? [],
      })),
    });
  });
