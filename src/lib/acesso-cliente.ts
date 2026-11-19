export type StatusAcessoCliente = "ATIVO" | "SEM_ACESSO";

/** Ativo: o cliente já entrou no sistema. Até lá (mesmo com conta criada), fica "Sem acesso". */
export function statusAcessoCliente(cliente: {
  usuario?: { ultimoLogin: Date | string | null; ativo: boolean } | null;
}): StatusAcessoCliente {
  return cliente.usuario?.ativo && cliente.usuario.ultimoLogin ? "ATIVO" : "SEM_ACESSO";
}

/** Caminho da página em que o cliente convidado cria o acesso. */
export function caminhoDoConvite(token: string): string {
  return `/ativar-acesso?token=${encodeURIComponent(token)}`;
}

/** Validade do link de convite: curta, porque o link cria a senha do cliente. Uso único. */
export const VALIDADE_CONVITE_HORAS = 6;
export const VALIDADE_CONVITE_TEXTO = `${VALIDADE_CONVITE_HORAS} horas`;

/**
 * Página para onde o login leva depois de entrar. Só aceita caminhos da área do cliente, para o
 * link não servir de redirecionamento para outro site.
 */
export function destinoDoClienteSeguro(caminho: unknown): string | undefined {
  if (typeof caminho !== "string") return undefined;
  return /^\/cliente(\/[A-Za-z0-9_-]+)*\/?$/.test(caminho) ? caminho : undefined;
}

/** Link de login que, depois de entrar, abre o orçamento; o e-mail já vem preenchido. */
export function caminhoDoLoginDoOrcamento(orcamentoId: string, email?: string | null): string {
  const busca = new URLSearchParams({ proximo: `/cliente/orcamentos/${orcamentoId}` });
  if (email?.trim()) busca.set("email", email.trim());
  return `/?${busca.toString()}`;
}
