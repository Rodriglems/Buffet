import type { Prisma } from "@/generated/prisma/client";
import { statusAcessoCliente } from "@/lib/acesso-cliente";
import { chaveDoTelefone, mesmoTelefone } from "@/lib/telefone";

export type DadosParaComparar = {
  nome?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
};

/**
 * Clientes que parecem ser a mesma pessoa: mesmo telefone, e-mail ou nome exato. Serve só para
 * avisar a equipe, nunca para bloquear: uma família pode dividir o telefone, e nomes se repetem.
 */
export async function buscarClientesParecidos(
  tx: Pick<Prisma.TransactionClient, "cliente">,
  empresaId: string,
  dados: DadosParaComparar,
) {
  const chaves = [
    ...new Set([chaveDoTelefone(dados.telefone), chaveDoTelefone(dados.whatsapp)]),
  ].filter(Boolean);
  const email = dados.email?.trim();
  const nome = dados.nome?.trim();
  const condicoes: Prisma.ClienteWhereInput[] = [
    ...chaves.flatMap((chave) => [
      { telefone: { endsWith: chave } },
      { whatsapp: { endsWith: chave } },
    ]),
    ...(email ? [{ email: { equals: email, mode: "insensitive" as const } }] : []),
    ...(nome && nome.length >= 3 ? [{ nome: { equals: nome, mode: "insensitive" as const } }] : []),
  ];
  if (!condicoes.length) return [];

  const encontrados = await tx.cliente.findMany({
    where: { empresaId, OR: condicoes },
    select: {
      id: true,
      nome: true,
      telefone: true,
      whatsapp: true,
      email: true,
      usuario: { select: { ultimoLogin: true, ativo: true } },
    },
    orderBy: { nome: "asc" },
    take: 5,
  });
  return encontrados.map(({ usuario, ...cliente }) => {
    const mesmoNumero = [dados.telefone, dados.whatsapp].some(
      (numero) =>
        mesmoTelefone(numero, cliente.telefone) || mesmoTelefone(numero, cliente.whatsapp),
    );
    const mesmoEmail = Boolean(email && cliente.email?.toLowerCase() === email.toLowerCase());
    return {
      ...cliente,
      acesso: statusAcessoCliente({ usuario }),
      motivo: mesmoNumero ? "telefone" : mesmoEmail ? "e-mail" : "nome",
    };
  });
}
