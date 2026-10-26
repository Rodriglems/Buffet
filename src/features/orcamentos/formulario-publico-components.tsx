import type { ComponentProps, ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CampoProps = {
  label: string;
  name: string;
};

export function CampoFormulario({
  label,
  name,
  ...props
}: CampoProps & ComponentProps<typeof Input>) {
  return (
    <div>
      <Label htmlFor={name} className="mb-1.5 block">
        {label}
      </Label>
      <Input id={name} name={name} {...props} />
    </div>
  );
}

export function SelecaoFormulario({
  label,
  name,
  children,
  ...props
}: CampoProps & ComponentProps<"select">) {
  return (
    <div>
      <Label htmlFor={name} className="mb-1.5 block">
        {label}
      </Label>
      <select
        id={name}
        name={name}
        className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1"
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
      <div className="text-muted-foreground mt-2 space-y-1 text-sm">{children}</div>
    </div>
  );
}
