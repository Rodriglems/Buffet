import { useState, type ReactNode } from "react";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Bell, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Search, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AmbientLight } from "@/components/ambient-light";
import { notificacoes } from "@/data/mock";
import { cn } from "@/lib/utils";
import type { NavGroup } from "./nav-config";

interface ShellProps {
  nav: NavGroup[];
  area: "admin" | "cliente";
  usuario: { nome: string; cargo: string; iniciais: string };
  trocarPara: { label: string; to: string };
}

function NavLinks({ nav, onNavigate }: { nav: NavGroup[]; onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="flex flex-col gap-1">
      {nav.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          <p className="px-3 pt-4 pb-1 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            {group.label}
          </p>
          {group.items.map((item) => {
            const active =
              item.to === "/admin" || item.to === "/cliente"
                ? pathname === item.to
                : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-brand/10 text-brand font-medium ring-1 ring-brand/15"
                    : "text-foreground/70 hover:bg-secondary",
                )}
              >
                <item.icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function saudacao() {
  const h = new Date().getHours();
  return h < 12 ? "Bom dia!" : h < 18 ? "Boa tarde!" : "Boa noite!";
}

function RailLink({ to, label, icon: Icon, active }: { to: string; label: string; icon: LucideIcon; active?: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to={to}
          aria-label={label}
          className={cn(
            "relative grid size-11 place-items-center rounded-xl transition-colors",
            active ? "bg-primary text-primary-foreground" : "text-foreground/60 hover:bg-secondary hover:text-foreground",
          )}
        >
          <Icon className="size-5" />
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function IconRail({ nav }: { nav: NavGroup[] }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const itens = nav.flatMap((g) => g.items).filter((i) => !/configuracoes|perfil/.test(i.to));
  return (
    <TooltipProvider delayDuration={100}>
      <nav className="mt-8 flex flex-col items-center gap-1.5 overflow-y-auto">
        {itens.map((item) => {
          const active =
            item.to === "/admin" || item.to === "/cliente" ? pathname === item.to : pathname.startsWith(item.to);
          return <RailLink key={item.to} to={item.to} label={item.label} icon={item.icon} active={active} />;
        })}
      </nav>
    </TooltipProvider>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <div className="bg-brand text-primary-foreground grid size-9 place-items-center rounded-xl ring-1 ring-black/5">
        <span className="font-display text-sm font-semibold">M</span>
      </div>
      <div className="leading-tight">
        <p className="font-display text-sm font-semibold">Mesa</p>
        <p className="text-muted-foreground text-[11px]">Buffet &amp; Eventos</p>
      </div>
    </div>
  );
}

function SidebarFooter({ area }: { area: "admin" | "cliente" }) {
  if (area === "cliente") {
    return (
      <div className="bg-surface mt-auto rounded-xl p-3 ring-1 ring-black/5">
        <p className="text-xs font-medium">Precisa de ajuda?</p>
        <p className="text-muted-foreground mt-1 text-[11px]">
          Fale com sua consultora pelo WhatsApp (11) 4002-8922.
        </p>
      </div>
    );
  }
  return (
    <div className="bg-surface mt-auto rounded-xl p-3 ring-1 ring-black/5">
      <p className="text-xs font-medium">Plano Profissional</p>
      <p className="text-muted-foreground mt-1 text-[11px]">12 de 20 eventos ativos</p>
      <div className="bg-muted mt-2 h-1.5 overflow-hidden rounded-full">
        <div className="bg-brand h-full w-3/5 rounded-full" />
      </div>
    </div>
  );
}

function Breadcrumbs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const partes = pathname.split("/").filter(Boolean);
  if (partes.length <= 1) return null;

  const rotulo = (p: string) =>
    decodeURIComponent(p).replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());

  return (
    <p className="text-muted-foreground mb-4 text-xs">
      {partes.map((p, i) => (
        <span key={`${p}-${i}`}>
          {i > 0 && <span className="px-1.5 opacity-50">/</span>}
          <span className={cn(i === partes.length - 1 && "text-foreground font-medium")}>
            {rotulo(p)}
          </span>
        </span>
      ))}
    </p>
  );
}

export function AppShell({ nav, area, usuario, trocarPara }: ShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  return (
    <div className="min-h-screen">
      <AmbientLight />

      {/* Sidebar desktop — trilho de ícones ou expandida */}
      <aside
        className={cn(
          "bg-surface fixed inset-y-0 left-0 z-20 hidden flex-col border-r border-border py-5 transition-[width] duration-200 lg:flex",
          collapsed ? "w-20 items-center" : "w-64 px-3",
        )}
      >
        {collapsed ? (
          <>
            <Link to={area === "admin" ? "/admin" : "/cliente"} aria-label="Início" className="bg-primary text-primary-foreground grid size-11 place-items-center rounded-full">
              <span className="font-display text-base font-bold">M</span>
            </Link>
            <IconRail nav={nav} />
            <TooltipProvider delayDuration={100}>
              <div className="mt-auto flex flex-col items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setCollapsed(false)}
                      aria-label="Expandir menu"
                      className="text-foreground/60 hover:bg-secondary hover:text-foreground grid size-11 place-items-center rounded-xl transition-colors"
                    >
                      <PanelLeftOpen className="size-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Expandir menu</TooltipContent>
                </Tooltip>
                <RailLink to={area === "admin" ? "/admin/configuracoes" : "/cliente/perfil"} label="Configurações" icon={Settings} />
                <RailLink to="/" label="Sair" icon={LogOut} />
              </div>
            </TooltipProvider>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <Brand />
              <button
                onClick={() => setCollapsed(true)}
                aria-label="Minimizar menu"
                className="text-foreground/60 hover:bg-secondary hover:text-foreground grid size-9 place-items-center rounded-lg transition-colors"
              >
                <PanelLeftClose className="size-4" />
              </button>
            </div>
            <div className="mt-4 flex-1 overflow-y-auto">
              <NavLinks nav={nav} />
            </div>
            <SidebarFooter area={area} />
          </>
        )}
      </aside>

      <div className={cn("transition-[padding] duration-200", collapsed ? "lg:pl-20" : "lg:pl-64")}>
        <header className="bg-background/80 sticky top-0 z-10 backdrop-blur-xl">
          <div className="flex items-center gap-3 px-4 py-4 lg:px-8">
            {/* Menu mobile */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menu">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 px-4 py-6">
                <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
                <div className="flex h-full flex-col">
                  <Brand />
                  <div className="mt-4 flex-1 overflow-y-auto">
                    <NavLinks nav={nav} onNavigate={() => setMobileOpen(false)} />
                  </div>
                  <SidebarFooter area={area} />
                </div>
              </SheetContent>
            </Sheet>

            <div className="hidden leading-tight md:block">
              <p className="font-display text-base font-semibold">{saudacao()}</p>
              <p className="text-muted-foreground text-xs">Mesa · Buffet &amp; Eventos</p>
            </div>

            <div className="relative mx-auto hidden w-full max-w-md sm:block">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                className="bg-surface h-10 rounded-xl border-0 pl-9 ring-1 ring-black/5"
                placeholder="Buscar cliente, evento ou proposta…"
              />
            </div>

            <div className="ml-auto flex items-center gap-2 sm:ml-0 sm:gap-3">
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="bg-surface relative rounded-full ring-1 ring-black/5"
              >
                <Link
                  to={area === "admin" ? "/admin/notificacoes" : "/cliente"}
                  aria-label="Notificações"
                >
                  <Bell className="size-4" />
                  {naoLidas > 0 && (
                    <span className="bg-destructive absolute top-1.5 right-1.5 size-2 rounded-full ring-2 ring-white" />
                  )}
                </Link>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="bg-surface flex items-center gap-2.5 rounded-lg py-1.5 pr-3 pl-1.5 ring-1 ring-black/5">
                    <span className="bg-primary text-primary-foreground font-display grid size-8 place-items-center rounded-full text-[11px] font-semibold">
                      {usuario.iniciais}
                    </span>
                    <span className="hidden leading-tight sm:block">
                      <span className="block text-xs font-medium">{usuario.nome}</span>
                      <span className="text-muted-foreground block text-[10px]">
                        {usuario.cargo}
                      </span>
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel>{usuario.nome}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to={area === "admin" ? "/admin/configuracoes" : "/cliente/perfil"}>
                      Meu perfil
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={trocarPara.to}>{trocarPara.label}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/">
                      <LogOut className="size-4" />
                      Sair
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 lg:px-8">
          <Breadcrumbs />
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function SectionGrid({ children }: { children: ReactNode }) {
  return <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-5">{children}</div>;
}
