/**
 * Limite simples de tentativas por chave (ex.: IP) em janela de tempo, guardado em memória.
 * Serve para uma instância do servidor; com várias instâncias, use um armazenamento
 * compartilhado (ex.: Redis) no lugar do Map.
 */
type Janela = { inicio: number; contagem: number };

export function criarLimitador(maximo: number, janelaMs: number) {
  const janelas = new Map<string, Janela>();

  return function permitir(chave: string, agora = Date.now()): boolean {
    // Limpeza periódica para o Map não crescer sem limite.
    if (janelas.size > 10_000) {
      for (const [k, janela] of janelas) {
        if (agora - janela.inicio >= janelaMs) janelas.delete(k);
      }
    }
    const atual = janelas.get(chave);
    if (!atual || agora - atual.inicio >= janelaMs) {
      janelas.set(chave, { inicio: agora, contagem: 1 });
      return true;
    }
    atual.contagem += 1;
    return atual.contagem <= maximo;
  };
}
