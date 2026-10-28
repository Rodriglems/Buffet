import { formatBRL, formatDate } from "@/lib/format";

export type SituacaoParcela = "ATRASADA" | "VENCE_HOJE" | "PROXIMOS_7_DIAS" | "A_VENCER";

export const ROTULOS_SITUACAO: Record<SituacaoParcela, string> = {
  ATRASADA: "Em atraso",
  VENCE_HOJE: "Vence hoje",
  PROXIMOS_7_DIAS: "Próximos 7 dias",
  A_VENCER: "A vencer",
};

type ParcelaAberta = {
  id: string;
  valor: string;
  numeroParcela: number;
  dataVencimento: string;
  evento: {
    nome: string;
    cliente: { id: string; nome: string; whatsapp: string | null; telefone: string | null };
  };
};

/** Data local de hoje no formato YYYY-MM-DD (as datas de vencimento não têm fuso). */
export function hojeIso(agora = new Date()): string {
  return [
    agora.getFullYear(),
    String(agora.getMonth() + 1).padStart(2, "0"),
    String(agora.getDate()).padStart(2, "0"),
  ].join("-");
}

/** Dias até o vencimento (negativo = em atraso) e a situação da parcela. */
export function situacaoDaParcela(vencimento: string, hoje: string) {
  const emDias = (iso: string) =>
    Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
  const dias = Math.round((emDias(vencimento) - emDias(hoje)) / 86_400_000);
  const situacao: SituacaoParcela =
    dias < 0 ? "ATRASADA" : dias === 0 ? "VENCE_HOJE" : dias <= 7 ? "PROXIMOS_7_DIAS" : "A_VENCER";
  return { dias, situacao };
}

export function descreverPrazo(dias: number): string {
  if (dias < 0) return `Atrasada há ${-dias} dia${dias === -1 ? "" : "s"}`;
  if (dias === 0) return "Vence hoje";
  return `Vence em ${dias} dia${dias === 1 ? "" : "s"}`;
}

/**
 * Agrupa as parcelas em aberto por cliente: quem tem atraso vem primeiro, depois quem
 * vence antes.
 */
export function agruparPorCliente<P extends ParcelaAberta>(parcelas: P[], hoje: string) {
  type Grupo = { cliente: P["evento"]["cliente"]; parcelas: P[]; total: number; emAtraso: number };
  const grupos = new Map<string, Grupo>();
  for (const parcela of parcelas) {
    const cliente = parcela.evento.cliente;
    const grupo: Grupo = grupos.get(cliente.id) ?? { cliente, parcelas: [], total: 0, emAtraso: 0 };
    grupo.parcelas.push(parcela);
    grupo.total += Number(parcela.valor);
    if (situacaoDaParcela(parcela.dataVencimento, hoje).situacao === "ATRASADA") {
      grupo.emAtraso += Number(parcela.valor);
    }
    grupos.set(cliente.id, grupo);
  }
  const lista = [...grupos.values()];
  for (const grupo of lista) {
    grupo.parcelas.sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento));
  }
  return lista.sort(
    (a, b) =>
      Number(b.emAtraso > 0) - Number(a.emAtraso > 0) ||
      a.parcelas[0]!.dataVencimento.localeCompare(b.parcelas[0]!.dataVencimento) ||
      a.cliente.nome.localeCompare(b.cliente.nome, "pt-BR"),
  );
}

/** Mensagem de lembrete para o WhatsApp do cliente, com as parcelas em aberto. */
export function mensagemCobranca(nomeCliente: string, parcelas: ParcelaAberta[], hoje: string) {
  const primeiroNome = nomeCliente.trim().split(/\s+/)[0] ?? nomeCliente;
  const linhas = parcelas.map((parcela) => {
    const { dias } = situacaoDaParcela(parcela.dataVencimento, hoje);
    const prazo = dias < 0 ? " (em atraso)" : dias === 0 ? " (vence hoje)" : "";
    return `• ${parcela.evento.nome} — parcela ${parcela.numeroParcela}: ${formatBRL(Number(parcela.valor))}, vencimento ${formatDate(parcela.dataVencimento)}${prazo}`;
  });
  const total = parcelas.reduce((soma, parcela) => soma + Number(parcela.valor), 0);
  return [
    `Olá, ${primeiroNome}! Passando para lembrar dos pagamentos em aberto do seu evento:`,
    linhas.join("\n"),
    `Total: ${formatBRL(total)}.`,
    "Se já fez o pagamento, pode desconsiderar e nos enviar o comprovante. Obrigado!",
  ].join("\n\n");
}
