import { ROTULOS_STATUS_EVENTO } from "@/lib/status-evento";

const ROTULOS: Record<string, string> = {
  ...ROTULOS_STATUS_EVENTO,
  // Orçamentos
  RASCUNHO: "Rascunho",
  ENVIADO: "Enviado",
  VISUALIZADO: "Visualizado",
  EM_NEGOCIACAO: "Em negociação",
  AGUARDANDO_APROVACAO: "Aguardando aprovação",
  REJEITADO: "Rejeitado",
  EXPIRADO: "Expirado",
  // Pagamentos
  PENDENTE: "Pendente",
  PAGO: "Pago",
  ATRASADO: "Atrasado",
  // Compromissos da agenda
  CONCLUIDO: "Concluído",
  // Clientes
  ATIVO: "Ativo",
  INATIVO: "Inativo",
};

export function chaveStatus(status: string) {
  return status
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .replace(/[\s-]+/g, "_")
    .toUpperCase();
}

/** Nome em português de qualquer status do sistema (evento, orçamento, pagamento ou cliente). */
export function rotuloStatus(status: string): string {
  return ROTULOS[chaveStatus(status)] ?? status;
}
