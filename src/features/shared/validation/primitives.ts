import { z } from "zod";

export const onlyDigits = (value: string): string => value.replace(/\D/g, "");
export const normalizeWhitespace = (value: string): string => value.trim().replace(/\s+/g, " ");
export const emptyStringToUndefined = (value: unknown): unknown =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const hasRepeatedDigits = (value: string) => /^(\d)\1+$/.test(value);

export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || hasRepeatedDigits(cpf)) return false;

  for (let position = 9; position <= 10; position += 1) {
    let sum = 0;
    for (let index = 0; index < position; index += 1) {
      sum += Number(cpf[index]) * (position + 1 - index);
    }
    const remainder = (sum * 10) % 11;
    const digit = remainder === 10 ? 0 : remainder;
    if (digit !== Number(cpf[position])) return false;
  }
  return true;
}

export function isValidCnpj(value: string): boolean {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14 || hasRepeatedDigits(cnpj)) return false;

  const calculateDigit = (length: number): number => {
    let weight = length - 7;
    let sum = 0;
    for (let index = 0; index < length; index += 1) {
      sum += Number(cnpj[index]) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  return calculateDigit(12) === Number(cnpj[12]) && calculateDigit(13) === Number(cnpj[13]);
}

export const cpfSchema = z.string().transform(onlyDigits).refine(isValidCpf, "CPF inválido");

export const cnpjSchema = z.string().transform(onlyDigits).refine(isValidCnpj, "CNPJ inválido");

export const cpfCnpjSchema = z
  .string()
  .transform(onlyDigits)
  .refine((value) => isValidCpf(value) || isValidCnpj(value), "CPF ou CNPJ inválido");

export const cepSchema = z
  .string()
  .transform(onlyDigits)
  .refine((value) => /^\d{8}$/.test(value), "CEP inválido");

export const UF_VALUES = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
] as const;

export const ufSchema = z
  .string()
  .transform((value) => value.trim().toUpperCase())
  .pipe(
    z.enum(UF_VALUES, {
      errorMap: () => ({ message: "UF inválida" }),
    }),
  );

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Email inválido")
  .max(254, "Email muito longo");

export function normalizeBrazilianPhone(value: string): string {
  let digits = onlyDigits(value);
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("55") && digits.length >= 12) digits = digits.slice(2);
  return `+55${digits}`;
}

export const phoneSchema = z
  .string()
  .transform(normalizeBrazilianPhone)
  .refine((value) => /^\+55[1-9]{2}[2-9]\d{7,8}$/.test(value), {
    message: "Telefone brasileiro inválido",
  });

export const whatsappSchema = phoneSchema;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidIsoDate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

export const dateSchema = z.string().trim().refine(isValidIsoDate, "Data inválida; use AAAA-MM-DD");

export const dateTimeSchema = z
  .union([z.date(), z.string().datetime({ offset: true })])
  .transform((value) => (value instanceof Date ? value : new Date(value)))
  .refine((value) => !Number.isNaN(value.getTime()), "Data e hora inválidas");

export const timeSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/, "Hora inválida")
  .transform((value) => (value.length === 5 ? `${value}:00` : value));

export const positiveIntegerSchema = z.coerce
  .number()
  .int("Informe um número inteiro")
  .positive("Informe um inteiro positivo")
  .safe("Inteiro fora do intervalo seguro");

export const nonNegativeIntegerSchema = z.coerce
  .number()
  .int("Informe um número inteiro")
  .nonnegative("O valor não pode ser negativo")
  .safe("Inteiro fora do intervalo seguro");

export const positiveBigIntSchema = z
  .union([
    z.bigint(),
    z
      .string()
      .trim()
      .regex(/^[1-9]\d*$/),
  ])
  .transform((value) => BigInt(value))
  .refine((value) => value > 0n, "Informe um inteiro positivo");

function decimalSchema(scale: number, positive: boolean) {
  return z
    .string({
      required_error: "Informe o valor como texto decimal",
      invalid_type_error: "Use texto decimal para evitar perda de precisão",
    })
    .trim()
    .refine((value) => {
      const pattern = positive
        ? new RegExp(`^(?=.*[1-9])\\d+(?:[.,]\\d{1,${scale}})?$`)
        : new RegExp(`^\\d+(?:[.,]\\d{1,${scale}})?$`);
      return pattern.test(value);
    }, `Decimal inválido; use até ${scale} casas`)
    .transform((value) => {
      const [integer = "0", fraction = ""] = value.replace(",", ".").split(".");
      const normalizedInteger = integer.replace(/^0+(?=\d)/, "");
      return fraction ? `${normalizedInteger}.${fraction}` : normalizedInteger;
    });
}

export const moneySchema = decimalSchema(2, false);
export const positiveMoneySchema = decimalSchema(2, true);
export const quantityDecimalSchema = decimalSchema(3, true);

export function decimalToScaledBigInt(value: string, scale = 2): bigint {
  const normalized = value.replace(",", ".");
  const [integer = "0", fraction = ""] = normalized.split(".");
  return (
    BigInt(integer) * 10n ** BigInt(scale) + BigInt(fraction.padEnd(scale, "0").slice(0, scale))
  );
}

export const uuidSchema = z.string().uuid("UUID inválido");

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationInput = z.input<typeof paginationSchema>;
export type Pagination = z.output<typeof paginationSchema>;
