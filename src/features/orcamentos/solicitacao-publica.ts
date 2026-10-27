import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { descreverEscolha } from "@/features/orcamentos/formulario-publico";
import { phoneSchema, whatsappSchema } from "@/features/shared/validation/primitives";
import { FORMATOS_SERVICO, SERVICOS_ADICIONAIS } from "@/lib/catalogo";
import { serialize } from "@/lib/domain.server";
import { notificarNovaSolicitacaoEmpresa } from "@/lib/empresa-notification.server";
import { hashPassword } from "@/lib/password.server";
import { exigirDentroDoLimite } from "@/lib/limite-taxa.server";
import { getPrisma } from "@/lib/prisma.server";
import { issueSession, requirePermission } from "@/lib/session.server";

const tokenSchema = z.object({ token: z.string().uuid() });

const solicitacaoSchema = tokenSchema.extend({
  nome: z.string().trim().min(2).max(160),
  email: z.string().trim().email().toLowerCase(),
  telefone: phoneSchema,
  whatsapp: whatsappSchema,
  tipoEvento: z.string().trim().min(2).max(100),
  formatoServico: z.enum(FORMATOS_SERVICO),
  servicosAdicionais: z
    .array(z.enum(SERVICOS_ADICIONAIS))
    .max(SERVICOS_ADICIONAIS.length)
    .default([]),
  dataEvento: z.coerce.date(),
  quantidadeConvidados: z.coerce.number().int().positive().max(100000),
  localNome: z.string().trim().max(160).nullable().optional(),
  cidade: z.string().trim().max(120).nullable().optional(),
  observacoes: z.string().trim().max(4000).nullable().optional(),
  servicosIds: z.array(z.string().uuid()).min(1).max(300),
  // Opção escolhida para cada item que pede uma escolha (ex.: { massaId: recheioId }).
  escolhas: z.record(z.string().uuid(), z.string().uuid()).default({}),
  // Senha curta (a partir de 4 dígitos) é aceita porque o login bloqueia tentativas repetidas.
  senha: z.string().min(4).max(200),
  website: z.string().max(0).optional(),
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

  throw new Error("Revise os campos do formulário e tente novamente.");
}

export const obterFormularioOrcamento = createServerFn({ method: "GET" })
  .validator((value: unknown) => tokenSchema.parse(value))
  .handler(async ({ data }) => {
    const empresa = await getPrisma().empresa.findUnique({
      where: { linkOrcamentoToken: data.token },
      select: {
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
            sugestaoChef: true,
            opcoesRotulo: true,
            opcoes: { select: { opcaoId: true } },
          },
          orderBy: [
            { sugestaoChef: "asc" },
            { ordem: "asc" },
            { categoria: "asc" },
            { nome: "asc" },
          ],
        },
        categoriasCardapio: {
          select: { nome: true, ordem: true },
          orderBy: [{ ordem: "asc" }, { nome: "asc" }],
        },
      },
    });
    if (!empresa) throw new Error("Link de orçamento inválido ou desativado.");
    return serialize(empresa);
  });

export const obterLinkFormularioOrcamento = createServerFn({ method: "GET" }).handler(async () => {
  const auth = await requirePermission("orcamentos");
  const empresa = await getPrisma().empresa.findUnique({
    where: { id: auth.empresaId },
    select: { linkOrcamentoToken: true },
  });
  if (!empresa) throw new Error("Empresa não encontrada.");
  return { token: empresa.linkOrcamentoToken };
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
    const senhaHash = await hashPassword(data.senha);
    const empresa = await getPrisma().empresa.findUnique({
      where: { linkOrcamentoToken: data.token },
      select: { id: true, nomeFantasia: true, email: true, whatsapp: true },
    });
    if (!empresa) throw new Error("Link de orçamento inválido ou desativado.");

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
      const clienteExistente = await tx.cliente.findFirst({
        where: { empresaId: empresa.id, email: { equals: data.email, mode: "insensitive" } },
        orderBy: { updatedAt: "desc" },
      });
      // Formulário público não autentica quem envia: nunca sobrescreve dados de um cliente
      // existente, apenas completa campos vazios e registra divergências para a equipe.
      const divergencias = clienteExistente
        ? [
            clienteExistente.nome !== data.nome ? `nome "${data.nome}"` : null,
            clienteExistente.email && clienteExistente.email !== data.email
              ? `e-mail "${data.email}"`
              : null,
            clienteExistente.telefone && clienteExistente.telefone !== data.telefone
              ? `telefone "${data.telefone}"`
              : null,
            clienteExistente.whatsapp && clienteExistente.whatsapp !== data.whatsapp
              ? `WhatsApp "${data.whatsapp}"`
              : null,
          ].filter((item) => item !== null)
        : [];
      const cliente = clienteExistente
        ? await tx.cliente.update({
            where: { id: clienteExistente.id },
            data: {
              email: clienteExistente.email ?? data.email,
              telefone: clienteExistente.telefone ?? data.telefone,
              whatsapp: clienteExistente.whatsapp ?? data.whatsapp,
            },
          })
        : await tx.cliente.create({
            data: {
              empresaId: empresa.id,
              nome: data.nome,
              tipoPessoa: "FISICA",
              email: data.email,
              telefone: data.telefone,
              whatsapp: data.whatsapp,
              observacoes: "Cadastro realizado pelo formulário público de orçamento.",
            },
          });

      // Cria a conta do cliente (novo ou já cadastrado com este e-mail) quando ele ainda não tem
      // acesso. Só fica indisponível se o e-mail já pertence a outro usuário (ex.: da equipe).
      let acesso: "CRIADO" | "JA_EXISTE" | "INDISPONIVEL";
      let usuarioCriado: { id: string; sessaoVersao: number } | null = null;
      if (clienteExistente?.usuarioId) {
        acesso = "JA_EXISTE";
      } else {
        const emailEmUso = await tx.usuario.count({
          where: { empresaId: empresa.id, email: data.email },
        });
        if (emailEmUso) {
          acesso = "INDISPONIVEL";
        } else {
          const usuario = await tx.usuario.create({
            data: {
              empresaId: empresa.id,
              nome: cliente.nome,
              email: data.email,
              senhaHash,
              role: "CLIENT",
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
          nome: data.nome,
          tipo: data.tipoEvento,
          formatoServico: data.formatoServico,
          servicosAdicionais: data.servicosAdicionais,
          dataEvento: data.dataEvento,
          quantidadeConvidados: data.quantidadeConvidados,
          localNome: data.localNome,
          cidade: data.cidade,
          status: "ORCAMENTO",
          observacoes:
            [
              data.observacoes,
              divergencias.length
                ? `Atenção: o formulário informou dados diferentes do cadastro do cliente (${divergencias.join(", ")}). Confirme antes de atualizar o cadastro.`
                : null,
            ]
              .filter(Boolean)
              .join("\n\n") || null,
        },
      });

      const ultimoOrcamento = await tx.orcamento.findFirst({
        where: { empresaId: empresa.id },
        orderBy: { numero: "desc" },
        select: { numero: true },
      });
      const itens = servicos.map((servico) => {
        const quantidade = servico.unidade.toLowerCase().includes("pessoa")
          ? data.quantidadeConvidados
          : 1;
        const valorUnitario = Number(servico.precoBase);
        return { servico, quantidade, valorUnitario, total: quantidade * valorUnitario };
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
            data.servicosAdicionais.length
              ? `Adicionais de interesse: ${data.servicosAdicionais.join(", ")}.`
              : "Sem serviços adicionais selecionados.",
            "Cardápio selecionado pelo cliente no formulário público. Valores sob consulta serão definidos pela equipe.",
          ].join("\n"),
          itens: {
            create: itens.map(({ servico, quantidade, valorUnitario, total }) => ({
              servicoId: servico.id,
              descricao: descricoes.get(servico.id) ?? servico.nome,
              quantidade: quantidade.toString(),
              unidade: servico.unidade,
              valorUnitario: valorUnitario.toFixed(2),
              desconto: "0.00",
              valorTotal: total.toFixed(2),
            })),
          },
        },
      });
      const administradores = await tx.usuario.findMany({
        where: { empresaId: empresa.id, role: "ADMIN", ativo: true },
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
        acesso,
        usuarioCriado,
      };
    });

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
      logado: Boolean(resultado.usuarioCriado),
      notificacoes,
    });
  });
