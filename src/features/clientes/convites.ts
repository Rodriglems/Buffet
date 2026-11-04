import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { criarConvite, hashDoConvite } from "@/features/clientes/convites.server";
import { Prisma } from "@/generated/prisma/client";
import { enviarEmailConvite } from "@/lib/email.server";
import { exigirDentroDoLimite } from "@/lib/limite-taxa.server";
import { hashPassword } from "@/lib/password.server";
import { getPrisma } from "@/lib/prisma.server";
import { problemaNaSenha } from "@/lib/regras-senha";
import { issueSession, requireAnyPermission } from "@/lib/session.server";

const tokenSchema = z
  .string()
  .trim()
  .regex(/^[a-f0-9]{64}$/i, "Link inválido ou expirado.");

const LINK_INVALIDO = "Este link expirou ou já foi usado. Peça um novo ao buffet.";

const PERMISSOES_CONVITE = ["contatos", "eventos", "orcamentos"] as const;

async function clienteSemConta(empresaId: string, clienteId: string) {
  const cliente = await getPrisma().cliente.findFirst({
    where: { id: clienteId, empresaId },
    select: { id: true, nome: true, email: true, usuarioId: true },
  });
  if (!cliente) throw new Error("Cliente não encontrado.");
  if (cliente.usuarioId) throw new Error("Este cliente já tem uma conta de acesso.");
  return cliente;
}

/** Gera o link que a equipe envia ao cliente por WhatsApp ou e-mail. */
export const gerarConviteCliente = createServerFn({ method: "POST" })
  .validator((value: unknown) => z.object({ clienteId: z.string().uuid() }).parse(value))
  .handler(async ({ data }) => {
    const auth = await requireAnyPermission([...PERMISSOES_CONVITE]);
    const cliente = await clienteSemConta(auth.empresaId, data.clienteId);
    const { token, expiraEm } = await criarConvite(getPrisma(), cliente.id);
    return { token, expiraEm: expiraEm.toISOString() };
  });

/** Envia por e-mail o link já gerado, sem criar outro. */
export const enviarConvitePorEmail = createServerFn({ method: "POST" })
  .validator((value: unknown) =>
    z.object({ clienteId: z.string().uuid(), token: tokenSchema }).parse(value),
  )
  .handler(async ({ data }) => {
    const auth = await requireAnyPermission([...PERMISSOES_CONVITE]);
    const cliente = await clienteSemConta(auth.empresaId, data.clienteId);
    if (!cliente.email) throw new Error("Este cliente não tem e-mail cadastrado.");
    const convite = await getPrisma().conviteCliente.count({
      where: {
        clienteId: cliente.id,
        tokenHash: hashDoConvite(data.token),
        usadoEm: null,
        expiraEm: { gt: new Date() },
      },
    });
    if (!convite) throw new Error("Este convite não é mais válido. Gere um novo.");
    const empresa = await getPrisma().empresa.findUnique({
      where: { id: auth.empresaId },
      select: { nomeFantasia: true },
    });
    try {
      await enviarEmailConvite({
        destinatario: cliente.email,
        nome: cliente.nome,
        nomeEmpresa: empresa?.nomeFantasia ?? "Buffet",
        token: data.token,
      });
    } catch (error) {
      console.error(
        "Falha ao enviar convite por e-mail:",
        error instanceof Error ? error.message : "erro desconhecido",
      );
      throw new Error("Não foi possível enviar o e-mail. Copie o link e envie por outro canal.");
    }
    return { ok: true, email: cliente.email };
  });

function conviteValido(token: string) {
  return getPrisma().conviteCliente.findFirst({
    where: { tokenHash: hashDoConvite(token), usadoEm: null, expiraEm: { gt: new Date() } },
    select: {
      id: true,
      cliente: {
        select: {
          id: true,
          nome: true,
          email: true,
          usuarioId: true,
          empresaId: true,
          empresa: { select: { nomeFantasia: true } },
        },
      },
    },
  });
}

/** Página pública do convite: mostra só o primeiro nome e o e-mail já cadastrado. */
export const validarConvite = createServerFn({ method: "GET" })
  .validator((value: unknown) => z.object({ token: z.string().max(200) }).parse(value))
  .handler(async ({ data }) => {
    const token = tokenSchema.safeParse(data.token);
    if (!token.success) return { valido: false as const };
    const convite = await conviteValido(token.data);
    if (!convite || convite.cliente.usuarioId) return { valido: false as const };
    return {
      valido: true as const,
      primeiroNome: convite.cliente.nome.trim().split(/\s+/)[0] ?? "",
      email: convite.cliente.email ?? "",
      nomeEmpresa: convite.cliente.empresa.nomeFantasia,
    };
  });

/** O cliente confirma o e-mail e cria a senha; a conta nasce ligada ao cadastro e já conectada. */
export const ativarConvite = createServerFn({ method: "POST" })
  .validator((value: unknown) =>
    z
      .object({
        token: tokenSchema,
        email: z.string().trim().email("Informe um e-mail válido.").max(254).toLowerCase(),
        senha: z.string().max(200),
      })
      .parse(value),
  )
  .handler(async ({ data }) => {
    exigirDentroDoLimite("ativacaoConvite");
    const problema = problemaNaSenha("CLIENT", data.senha);
    if (problema) throw new Error(problema);
    const convite = await conviteValido(data.token);
    if (!convite || convite.cliente.usuarioId) throw new Error(LINK_INVALIDO);
    const { cliente } = convite;
    const senhaHash = await hashPassword(data.senha);

    let usuario: { id: string; sessaoVersao: number };
    try {
      usuario = await getPrisma().$transaction(async (tx) => {
        const consumido = await tx.conviteCliente.updateMany({
          where: { id: convite.id, usadoEm: null, expiraEm: { gt: new Date() } },
          data: { usadoEm: new Date() },
        });
        if (consumido.count !== 1) throw new Error(LINK_INVALIDO);
        const emailEmUso = await tx.usuario.count({
          where: { empresaId: cliente.empresaId, email: data.email },
        });
        if (emailEmUso) {
          throw new Error(
            "Este e-mail já tem uma conta. Use outro e-mail ou fale com o buffet para juntar os cadastros.",
          );
        }
        const criado = await tx.usuario.create({
          data: {
            empresaId: cliente.empresaId,
            nome: cliente.nome,
            email: data.email,
            senhaHash,
            role: "CLIENT",
            ultimoLogin: new Date(),
          },
          select: { id: true, sessaoVersao: true },
        });
        await tx.cliente.update({
          where: { id: cliente.id },
          data: { usuarioId: criado.id, email: data.email },
        });
        await tx.conviteCliente.updateMany({
          where: { clienteId: cliente.id, usadoEm: null },
          data: { usadoEm: new Date() },
        });
        return criado;
      });
    } catch (error) {
      // Dois envios ao mesmo tempo: o segundo esbarra na conta criada pelo primeiro.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new Error(LINK_INVALIDO);
      }
      throw error;
    }
    issueSession(usuario.id, usuario.sessaoVersao);
    return { ok: true };
  });
