import {
  PDFDocument,
  rgb,
  StandardFonts,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "pdf-lib";

import { formatarCnpj, formatarTelefone } from "@/lib/empresa-cabecalho";
import { detectarTipoImagem } from "@/lib/storage.server";

export type DadosPdfEvento = {
  empresa: {
    nome: string;
    cnpj: string;
    /** Endereço já dividido nas linhas do cabeçalho (ver linhasEnderecoEmpresa). */
    linhasEndereco: string[];
    /** Texto pronto dos telefones, ex.: "(11) 9 1234-5678 / 3333-0000". */
    telefones: string | null;
    logo: Uint8Array | null;
  };
  cliente: string;
  contato: string | null;
  convidados: number;
  /** Data do evento em UTC (coluna DATE do banco). */
  data: Date;
  /** Horário em UTC (coluna TIME do banco), quando informado. */
  horario: Date | null;
  endereco: string | null;
  itens: string[];
  subtotal: number;
  desconto: number;
  total: number;
};

const A4 = { largura: 595.28, altura: 841.89 };
const MARGEM = 56;
const COR_TEXTO = rgb(0.1, 0.1, 0.1);
const COR_LINHA = rgb(0.35, 0.35, 0.35);
// Caracteres fora da codificação WinAnsi das fontes padrão do PDF quebrariam a geração.
const WIN_ANSI_EXTRA = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");

function textoSeguro(texto: string): string {
  return [...texto.normalize("NFC")]
    .map((letra) => {
      const codigo = letra.codePointAt(0) ?? 0;
      if (letra === "\t") return " ";
      if ((codigo >= 0x20 && codigo <= 0x7e) || (codigo >= 0xa0 && codigo <= 0xff)) return letra;
      return WIN_ANSI_EXTRA.has(letra) ? letra : "";
    })
    .join("");
}

export function formatarDataEvento(data: Date): string {
  const opcoes = { timeZone: "UTC" } as const;
  const diaMes = data.toLocaleDateString("pt-BR", { ...opcoes, day: "2-digit", month: "2-digit" });
  const semana = data.toLocaleDateString("pt-BR", { ...opcoes, weekday: "long" });
  return `${diaMes} (${semana})`;
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function quebrarLinhas(texto: string, fonte: PDFFont, tamanho: number, largura: number): string[] {
  const linhas: string[] = [];
  let atual = "";
  for (const palavra of texto.split(/\s+/).filter(Boolean)) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra;
    if (fonte.widthOfTextAtSize(tentativa, tamanho) <= largura || !atual) {
      atual = tentativa;
    } else {
      linhas.push(atual);
      atual = palavra;
    }
  }
  if (atual) linhas.push(atual);
  return linhas.length ? linhas : [""];
}

async function incorporarLogo(
  pdf: PDFDocument,
  bytes: Uint8Array | null,
): Promise<PDFImage | null> {
  if (!bytes) return null;
  const tipo = detectarTipoImagem(bytes);
  try {
    if (tipo === "image/png") return await pdf.embedPng(bytes);
    if (tipo === "image/jpeg") return await pdf.embedJpg(bytes);
  } catch {
    return null;
  }
  // WebP não é suportado pelo formato PDF; o cabeçalho usa o nome da empresa.
  return null;
}

type Recursos = { pdf: PDFDocument; negrito: PDFFont; italico: PDFFont; logo: PDFImage | null };

/** Cria o documento com fontes e logo incorporadas uma única vez (reaproveitadas em todas as páginas). */
async function prepararDocumento(
  titulo: string,
  empresa: DadosPdfEvento["empresa"],
): Promise<Recursos> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(textoSeguro(titulo));
  pdf.setCreator(textoSeguro(empresa.nome));
  return {
    pdf,
    negrito: await pdf.embedFont(StandardFonts.TimesRomanBold),
    italico: await pdf.embedFont(StandardFonts.TimesRomanItalic),
    logo: await incorporarLogo(pdf, empresa.logo),
  };
}

export async function gerarPdfEvento(dados: DadosPdfEvento): Promise<Uint8Array> {
  const recursos = await prepararDocumento(`Evento — ${dados.cliente}`, dados.empresa);
  desenharEvento(recursos, dados);
  return recursos.pdf.save();
}

/**
 * Um único PDF com o cardápio de vários eventos, cada um começando em página nova,
 * para imprimir tudo de uma vez. Todos os eventos são da mesma empresa (mesma logo).
 */
export async function gerarPdfEventos(lista: DadosPdfEvento[]): Promise<Uint8Array> {
  const primeiro = lista[0];
  if (!primeiro) throw new Error("Selecione pelo menos um documento.");
  const recursos = await prepararDocumento("Cardápios dos eventos", primeiro.empresa);
  for (const dados of lista) desenharEvento(recursos, dados);
  return recursos.pdf.save();
}

/** Desenha o cardápio de um evento a partir de uma página nova do documento. */
function desenharEvento({ pdf, negrito, italico, logo }: Recursos, dados: DadosPdfEvento) {
  const larguraUtil = A4.largura - MARGEM * 2;
  const xTexto = MARGEM + 6;
  const larguraTexto = larguraUtil - 6;
  // Ajustados depois do cabeçalho para o cardápio caber em uma página (ver "Cabe em uma página").
  let tamanho = 13;
  let entrelinha = 22;

  let pagina: PDFPage = pdf.addPage([A4.largura, A4.altura]);
  let y = A4.altura - 40;
  let topoLinhaVertical = 0;

  function linhaVertical() {
    pagina.drawLine({
      start: { x: MARGEM, y: topoLinhaVertical },
      end: { x: MARGEM, y },
      thickness: 0.8,
      color: COR_LINHA,
    });
  }

  function garantirEspaco(altura: number) {
    if (y - altura >= 60) return;
    linhaVertical();
    pagina = pdf.addPage([A4.largura, A4.altura]);
    y = A4.altura - 60;
    topoLinhaVertical = y + 16;
  }

  function centralizado(texto: string, fonte: PDFFont, tamanhoFonte: number) {
    const seguro = textoSeguro(texto);
    const largura = fonte.widthOfTextAtSize(seguro, tamanhoFonte);
    pagina.drawText(seguro, {
      x: (A4.largura - largura) / 2,
      y,
      size: tamanhoFonte,
      font: fonte,
      color: COR_TEXTO,
    });
    y -= tamanhoFonte + 3;
  }

  function linha(esquerda: string, direita?: string) {
    const textoEsquerda = textoSeguro(esquerda);
    const textoDireita = direita ? textoSeguro(direita) : "";
    const larguraDireita = textoDireita ? italico.widthOfTextAtSize(textoDireita, tamanho) : 0;
    const espacoEsquerda = textoDireita ? larguraTexto - larguraDireita - 16 : larguraTexto;
    const linhas = quebrarLinhas(textoEsquerda, italico, tamanho, espacoEsquerda);
    garantirEspaco(linhas.length * entrelinha);
    linhas.forEach((conteudo, indice) => {
      pagina.drawText(conteudo, { x: xTexto, y, size: tamanho, font: italico, color: COR_TEXTO });
      if (indice === 0 && textoDireita) {
        pagina.drawText(textoDireita, {
          x: MARGEM + larguraUtil - larguraDireita,
          y,
          size: tamanho,
          font: italico,
          color: COR_TEXTO,
        });
      }
      y -= entrelinha;
    });
  }

  // Cabeçalho da empresa
  if (logo) {
    const medida = logo.scaleToFit(190, 70);
    y -= medida.height;
    pagina.drawImage(logo, {
      x: (A4.largura - medida.width) / 2,
      y,
      width: medida.width,
      height: medida.height,
    });
    y -= 12;
  } else {
    y -= 18;
    centralizado(dados.empresa.nome, negrito, 20);
    y -= 4;
  }
  centralizado(`CNPJ: ${formatarCnpj(dados.empresa.cnpj)}`, negrito, 9);
  for (const linhaEndereco of dados.empresa.linhasEndereco) {
    centralizado(linhaEndereco, negrito, 9);
  }
  if (dados.empresa.telefones) centralizado(`Fones: ${dados.empresa.telefones}`, negrito, 9);

  y -= 14;
  topoLinhaVertical = y + 16;

  // Cabe em uma página: cardápios longos ganham fonte e espaçamento menores para não deixar
  // só o total ou as linhas de fechamento sozinhos na página seguinte (desperdício na impressão).
  const linhasDoCorpo = 4 + 2 + dados.itens.length + 1 + (dados.desconto > 0 ? 3 : 1);
  // Espaço das linhas de fechamento (garantirEspaco(48) lá embaixo) com uma pequena folga.
  const alturaFechamento = 52;
  const espacoDisponivel = y - 60 - alturaFechamento;
  if (linhasDoCorpo * entrelinha > espacoDisponivel) {
    entrelinha = Math.max(13, espacoDisponivel / linhasDoCorpo);
    tamanho = Math.max(9, Math.min(13, entrelinha * 0.6));
  }

  // Dados do evento
  linha(
    `CLIENTE: ${dados.cliente}`,
    dados.contato ? `CONTATO: ${formatarTelefone(dados.contato)}` : undefined,
  );
  linha(
    `PRA: ${dados.convidados} convidado${dados.convidados === 1 ? "" : "s"}`,
    `DATA: ${formatarDataEvento(dados.data)}`,
  );
  linha(`ENDEREÇO DE ENTREGA: ${dados.endereco ?? "a definir"}`);
  if (dados.horario) {
    const hora = `${String(dados.horario.getUTCHours()).padStart(2, "0")}:${String(
      dados.horario.getUTCMinutes(),
    ).padStart(2, "0")}`;
    linha(`ENTREGAR: Às ${hora} horas`);
  } else {
    linha("ENTREGAR: horário a definir");
  }

  y -= entrelinha;
  linha("MENU");
  for (const item of dados.itens) linha(item);
  y -= entrelinha;

  if (dados.desconto > 0) {
    linha(`SUBTOTAL ${formatarMoeda(dados.subtotal)}`);
    linha(`DESCONTO ${formatarMoeda(dados.desconto)}`);
  }
  linha(`TOTAL ${formatarMoeda(dados.total)}`);

  // Linhas de fechamento do modelo
  garantirEspaco(48);
  y -= 6;
  for (const deslocamento of [0, 22]) {
    pagina.drawLine({
      start: { x: MARGEM, y: y - deslocamento },
      end: { x: MARGEM + larguraUtil, y: y - deslocamento },
      thickness: 0.8,
      color: COR_LINHA,
    });
  }
  y -= 22;
  linhaVertical();
}
