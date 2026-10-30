/** Dados da empresa usados no cabeçalho do PDF do evento (e na prévia em Configurações). */
export type DadosCabecalhoEmpresa = {
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  telefonesContato?: string | null;
};

export function formatarCnpj(cnpj: string): string {
  const digitos = cnpj.replace(/\D/g, "");
  if (digitos.length !== 14) return cnpj;
  return digitos.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

export function formatarTelefone(telefone: string): string {
  let digitos = telefone.replace(/\D/g, "");
  // Os telefones são gravados como +55DDDNÚMERO; na tela e no PDF o código do país não aparece.
  if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith("55")) {
    digitos = digitos.slice(2);
  }
  if (digitos.length === 11) return digitos.replace(/^(\d{2})(\d)(\d{4})(\d{4})$/, "($1) $2 $3-$4");
  if (digitos.length === 10) return digitos.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  return telefone;
}

/** Telefone pronto para exibir, sem o +55; null quando não há telefone. */
export function telefoneDe(telefone: string | null | undefined): string | null {
  return telefone?.trim() ? formatarTelefone(telefone) : null;
}

const juntar = (partes: (string | null | undefined)[], separador: string) =>
  partes
    .map((parte) => parte?.trim())
    .filter(Boolean)
    .join(separador);

/**
 * Endereço em até duas linhas, como no papel timbrado:
 * "Rua das Flores, 123, Sala 4"
 * "Centro – Sua Cidade/UF"
 */
export function linhasEnderecoEmpresa(dados: DadosCabecalhoEmpresa): string[] {
  const rua = juntar([dados.logradouro, dados.numero, dados.complemento], ", ");
  const cidade = juntar([dados.cidade, dados.estado], "/");
  const regiao = juntar([dados.bairro, cidade], " – ");
  return [rua, regiao].filter(Boolean);
}

/** Telefones como a empresa escreveu; sem esse texto, usa o telefone e o WhatsApp cadastrados. */
export function textoTelefonesEmpresa(dados: DadosCabecalhoEmpresa): string | null {
  if (dados.telefonesContato?.trim()) return dados.telefonesContato.trim();
  const numeros = [...new Set([dados.whatsapp, dados.telefone].filter((v): v is string => !!v))];
  return numeros.length ? numeros.map(formatarTelefone).join(" / ") : null;
}
