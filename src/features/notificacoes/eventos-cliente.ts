export const EVENTO_NOTIFICACOES_ATUALIZADAS = "mesly:notificacoes-atualizadas";

/** Atualiza o contador do sino sem acoplar a tela de notificações ao layout. */
export function avisarNotificacoesAtualizadas() {
  window.dispatchEvent(new Event(EVENTO_NOTIFICACOES_ATUALIZADAS));
}
