import { type ZodError, type ZodIssue, type ZodType } from "zod";

export type ValidationErrors = Record<string, string[]>;

export function issuePath(issue: ZodIssue): string {
  return issue.path.length ? issue.path.join(".") : "_form";
}

export function formatZodError(error: ZodError): ValidationErrors {
  return error.issues.reduce<ValidationErrors>((errors, issue) => {
    const path = issuePath(issue);
    (errors[path] ??= []).push(issue.message);
    return errors;
  }, {});
}

export function firstZodError(error: ZodError): Record<string, string> {
  return Object.fromEntries(
    Object.entries(formatZodError(error)).map(([path, messages]) => [
      path,
      messages[0] ?? "Valor inválido",
    ]),
  );
}

export type ValidationResult<T> =
  { success: true; data: T } | { success: false; errors: ValidationErrors };

export function validate<TSchema extends ZodType>(
  schema: TSchema,
  input: unknown,
): ValidationResult<TSchema["_output"]> {
  const result = schema.safeParse(input);
  return result.success
    ? { success: true, data: result.data }
    : { success: false, errors: formatZodError(result.error) };
}
