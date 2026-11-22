import type { ComponentProps, ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Hierarquia do formulário público: o rótulo é menor (13px) e o valor do campo é maior (16px no
 * celular, o que também evita o zoom automático do iPhone ao tocar no campo).
 */
export const CLASSE_ROTULO = "mb-1.5 block text-[13px] font-medium";
const CLASSE_CAMPO = "h-11 text-base md:text-sm";

type CampoProps = {
  label: string;
  name: string;
};

export function CampoFormulario({
  label,
  name,
  className,
  ...props
}: CampoProps & ComponentProps<typeof Input>) {
  return (
    <div>
      <Label htmlFor={name} className={CLASSE_ROTULO}>
        {label}
      </Label>
      <Input id={name} name={name} className={cn(CLASSE_CAMPO, className)} {...props} />
    </div>
  );
}

export function SelecaoFormulario({
  label,
  name,
  children,
  className,
  ...props
}: CampoProps & ComponentProps<"select">) {
  return (
    <div>
      <Label htmlFor={name} className={CLASSE_ROTULO}>
        {label}
      </Label>
      <select
        id={name}
        name={name}
        className={cn(
          "border-input bg-background ring-offset-background focus-visible:ring-ring flex w-full rounded-md border px-3 py-1 shadow-sm focus-visible:outline-none focus-visible:ring-1 [&_option]:text-foreground",
          CLASSE_CAMPO,
          // "Selecione…" fica em cinza, como um placeholder; a escolha feita fica em destaque.
          !props.value && "text-muted-foreground",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

type ResumoCardProps = {
  titulo: string;
  onEditar: () => void;
  children: ReactNode;
};

export function ResumoCard({ titulo, onEditar, children }: ResumoCardProps) {
  return (
    <div className="bg-surface rounded-xl p-4 ring-1 ring-black/5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide">{titulo}</p>
        <button type="button" onClick={onEditar} className="text-primary text-xs font-semibold">
          Editar
        </button>
      </div>
      {/* Endereço ou observação longa quebra a linha em vez de alargar o card no celular. */}
      <div className="text-muted-foreground mt-2 space-y-1 text-sm [overflow-wrap:anywhere]">
        {children}
      </div>
    </div>
  );
}
