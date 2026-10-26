import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { AmbientLight } from "@/components/ambient-light";

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
      <AmbientLight />
      <div className="relative w-full max-w-[420px]">
        <Link to="/" className="mb-8 flex w-fit items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-neutral-950 text-white shadow-md ring-1 ring-black/10">
            <span className="font-display text-lg leading-none font-semibold">M</span>
          </div>
          <div className="leading-tight">
            <p className="font-display text-lg font-semibold tracking-tight">Mesly</p>
            <p className="text-muted-foreground text-xs">Buffet &amp; Eventos</p>
          </div>
        </Link>

        <div className="panel p-7 shadow-xl shadow-black/[0.04] sm:p-8">
          <header>
            <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="text-muted-foreground mt-1.5 text-sm">{subtitle}</p>
          </header>
          {children}
        </div>
      </div>
    </main>
  );
}
