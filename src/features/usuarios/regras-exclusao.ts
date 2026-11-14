/** Dados do usuário que decidem se ele pode ser excluído de verdade. */
export type AlvoExclusao = {
  id: string;
  nome: string;
  role: "ADMIN" | "CLIENT";
  /** Conta criada na instalação: entra no sistema, mas a equipe do buffet não a vê nem altera. */
  administradorInstalacao: boolean;
  /** Documentos enviados por este usuário (o banco não deixa apagá-lo enquanto houver). */
  documentos: number;
};

/** Devolve o motivo da recusa, ou null quando a exclusão pode seguir. */
export function motivoParaNaoExcluir(alvo: AlvoExclusao | null, autorId: string): string | null {
  // A conta da instalação responde como inexistente: para a equipe, ela não existe.
  if (!alvo || alvo.administradorInstalacao) return "Usuário não encontrado.";
  if (alvo.id === autorId) return "Você não pode excluir o seu próprio usuário.";
  if (alvo.role !== "ADMIN") return "O acesso de clientes é removido pela lista de clientes.";
  if (alvo.documentos > 0) {
    return `${alvo.nome} enviou documentos ao sistema. Para manter o histórico, deixe o usuário como Inativo.`;
  }
  return null;
}
