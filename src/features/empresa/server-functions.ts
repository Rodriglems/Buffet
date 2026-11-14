import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { serialize } from "@/lib/domain.server";
import { comNovaTentativaBanco, getPrisma } from "@/lib/prisma.server";
import { requireAnyPermission, requirePermission } from "@/lib/session.server";
import { ehUrlDoArmazenamento, removerImagem } from "@/lib/storage.server";
import { COR_IDS } from "@/lib/theme-accent";

// URL do R2; logos antigas em base64 só são aceitas se não forem alteradas.
const logoOrcamento = z.string().max(1_500_000).nullable().optional();

const empresa = z.object({
  razaoSocial: z.string().trim().min(2).max(200),
  nomeFantasia: z.string().trim().min(2).max(200),
  cnpj: z.string().regex(/^\d{14}$/),
  email: z.string().email().toLowerCase(),
  telefone: z
    .string()
    .regex(/^\d{10,11}$/)
    .nullable()
    .optional(),
  whatsapp: z
    .string()
    .regex(/^\d{10,11}$/)
    .nullable()
    .optional(),
  telefonesContato: z.string().trim().max(200).nullable().optional(),
  cep: z
    .string()
    .regex(/^\d{8}$/)
    .nullable()
    .optional(),
  estado: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .nullable()
    .optional(),
  cidade: z.string().trim().max(120).nullable().optional(),
  bairro: z.string().trim().max(120).nullable().optional(),
  logradouro: z.string().trim().max(200).nullable().optional(),
  numero: z.string().trim().max(30).nullable().optional(),
  complemento: z.string().trim().max(120).nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
  logoOrcamentoUrl: logoOrcamento,
  corTema: z.enum(COR_IDS).optional(),
});

export const obterEmpresa = createServerFn({ method: "GET" }).handler(async () => {
  const auth = await requireAnyPermission(["configuracoes", "orcamentos"]);
  const result = await getPrisma().empresa.findUnique({ where: { id: auth.empresaId } });
  if (!result) throw new Error("Empresa nao encontrada.");
  return serialize(result);
});

/** Dados completos da tela de Configurações com uma única autenticação e transação. */
export const obterConfiguracoes = createServerFn({ method: "GET" }).handler(async () =>
  comNovaTentativaBanco(async () => {
    const auth = await requirePermission("configuracoes");
    const whereUsuarios = {
      empresaId: auth.empresaId,
      role: "ADMIN" as const,
      administradorInstalacao: false,
    };
    const [dadosEmpresa, usuarios] = await getPrisma().$transaction([
      getPrisma().empresa.findUnique({ where: { id: auth.empresaId } }),
      getPrisma().usuario.findMany({
        where: whereUsuarios,
        select: {
          id: true,
          nome: true,
          email: true,
          role: true,
          ativo: true,
          permissoes: true,
          ultimoLogin: true,
          createdAt: true,
          cliente: { select: { id: true, nome: true } },
        },
        orderBy: { nome: "asc" },
      }),
    ]);
    if (!dadosEmpresa) throw new Error("Empresa não encontrada.");
    return serialize({ empresa: dadosEmpresa, usuarios });
  }),
);

export const atualizarEmpresa = createServerFn({ method: "POST" })
  .validator((value: unknown) => empresa.partial().parse(value))
  .handler(async ({ data }) => {
    const auth = await requirePermission("configuracoes");
    const atual = await getPrisma().empresa.findUnique({
      where: { id: auth.empresaId },
      select: { logoOrcamentoUrl: true },
    });
    const logoAlterada =
      data.logoOrcamentoUrl !== undefined && data.logoOrcamentoUrl !== atual?.logoOrcamentoUrl;
    if (logoAlterada && data.logoOrcamentoUrl && !ehUrlDoArmazenamento(data.logoOrcamentoUrl)) {
      throw new Error("Envie a logo novamente para salvar.");
    }
    await getPrisma().empresa.update({ where: { id: auth.empresaId }, data });
    if (logoAlterada) await removerImagem(atual?.logoOrcamentoUrl);
    return { ok: true };
  });
