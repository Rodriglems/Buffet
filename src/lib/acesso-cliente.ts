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
