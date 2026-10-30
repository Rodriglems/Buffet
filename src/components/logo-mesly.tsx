import { cn } from "@/lib/utils";

/** Marca do Mesly (o mesmo desenho do ícone do app, em public/icons/icon.svg). */
export function LogoMesly({ className }: { className?: string }) {
  return (
    <img
      src="/icons/icon.svg"
      alt=""
      aria-hidden="true"
      draggable={false}
      className={cn("size-11 shrink-0 select-none", className)}
    />
  );
}
