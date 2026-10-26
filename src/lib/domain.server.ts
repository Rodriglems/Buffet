import type { Prisma } from "@/generated/prisma/client";
type Transaction = Prisma.TransactionClient;

export async function notificar(
  tx: Transaction,
  usuarioId: string,
  input: { tipo: string; titulo: string; mensagem: string },
): Promise<void> {
  await tx.notificacao.create({ data: { usuarioId, ...input } });
}

export function pagination(page = 1, pageSize = 20): { skip: number; take: number } {
  const safePage = Math.max(1, Math.trunc(page));
  const safeSize = Math.min(100, Math.max(1, Math.trunc(pageSize)));
  return { skip: (safePage - 1) * safeSize, take: safeSize };
}

export type Serialized<T> = T extends Date
  ? string
  : T extends bigint
    ? string
    : T extends readonly (infer Item)[]
      ? Serialized<Item>[]
      : T extends object
        ? T extends { toFixed: (...args: never[]) => string }
          ? string
          : { [Key in keyof T]: Serialized<T[Key]> }
        : T;

export function serialize<T>(value: T): Serialized<T> {
  return JSON.parse(
    JSON.stringify(value, (_key, item: unknown) => {
      if (typeof item === "bigint") return item.toString();
      if (item && typeof item === "object" && "toFixed" in item) {
        const candidate = item as { toFixed?: unknown; constructor?: { name?: string } };
        if (candidate.constructor?.name === "Decimal" && typeof candidate.toFixed === "function") {
          return candidate.toFixed(2);
        }
      }
      return item;
    }),
  ) as Serialized<T>;
}
