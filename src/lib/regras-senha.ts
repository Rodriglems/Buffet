/**
 * Tamanho mínimo da senha por perfil. Clientes podem usar 4 dígitos porque o login bloqueia
 * a conta após tentativas erradas seguidas.
 */
export const TAMANHO_MINIMO_SENHA = { ADMIN: 12, CLIENT: 4 } as const;

export type PerfilSenha = keyof typeof TAMANHO_MINIMO_SENHA;

/** Mensagem de erro quando a senha é curta demais para o perfil; null quando é válida. */
export function problemaNaSenha(perfil: PerfilSenha, senha: string): string | null {
  const minimo = TAMANHO_MINIMO_SENHA[perfil];
  return senha.length < minimo ? `A senha precisa ter pelo menos ${minimo} caracteres.` : null;
}

/** Sugestão de senha: 6 dígitos para clientes, 16 caracteres sem ambiguidades para a equipe. */
export function gerarSenha(perfil: PerfilSenha, aleatorio: (limite: number) => number): string {
  const alfabeto =
    perfil === "CLIENT" ? "0123456789" : "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const tamanho = perfil === "CLIENT" ? 6 : 16;
  return Array.from({ length: tamanho }, () => alfabeto[aleatorio(alfabeto.length)]).join("");
}
