"use client";

import { Network, Plus, Search, GitBranch, Database, Waves } from "lucide-react";
import { useEffect } from "react";
import { cn } from "./cn";
import { ThemeToggle } from "./ThemeToggle";

export type AppTab = "tree" | "lineages" | "directory";

export const APP_TABS: { id: AppTab; label: string; icon: typeof Network }[] = [
  { id: "tree", label: "Árvore Interativa", icon: Network },
  { id: "lineages", label: "Explorador de Linhagens", icon: GitBranch },
  { id: "directory", label: "Diretório de Alunos", icon: Database },
];

interface HeaderProps {
  activeTab?: AppTab;
  onTabChange?: (tab: AppTab) => void;
  /** Opens the global command search (Aegis' CommandSearch). Also bound to ⌘K / Ctrl+K. */
  onOpenSearch?: () => void;
  /** Opens the "Novo Apadrinhamento" modal (Aegis' AddSponsorshipModal). */
  onNewSponsorship?: () => void;
  className?: string;
}

export function Header({
  activeTab = "tree",
  onTabChange,
  onOpenSearch,
  onNewSponsorship,
  className,
}: HeaderProps) {
  useEffect(() => {
    if (!onOpenSearch) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenSearch();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onOpenSearch]);

  return (
    <header className={cn("glass-header sticky top-0 z-40 w-full", className)}>
      <div className="mx-auto flex h-14 max-w-[1800px] items-center gap-2 px-3 sm:h-16 sm:gap-3 sm:px-6">
        {/* Brand */}
        <a href="/" className="group flex shrink-0 items-center gap-2.5" aria-label="Família CDIA — início">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 via-cyan-400 to-indigo-500 text-white shadow-lg shadow-sky-500/25 transition-transform group-hover:scale-105">
            <Waves className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-display text-[15px] font-bold tracking-tight">Família CDIA</span>
            <span className="text-[11px] font-medium text-muted-foreground">CI • UFPB</span>
          </span>
        </a>

        {/* Navigation */}
        <nav aria-label="Modos de visualização" className="ml-4 hidden items-center gap-1 lg:flex">
          {APP_TABS.map(({ id, label, icon: Icon }) => {
            const active = id === activeTab;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onTabChange?.(id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
                  active
                    ? "bg-sky-500/15 text-sky-600 dark:text-sky-300"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {/* Command search trigger */}
          <button
            type="button"
            onClick={onOpenSearch}
            className="hidden h-9 w-64 items-center gap-2 rounded-lg border border-border-subtle bg-surface px-3 text-left text-[13px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground md:flex xl:w-80"
            aria-label="Buscar aluno ou matrícula"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="flex-1 truncate">Buscar aluno ou matrícula...</span>
            <kbd className="rounded border border-border-subtle bg-muted/50 px-1.5 py-0.5 font-sans text-[10px] font-semibold">
              ⌘K
            </kbd>
          </button>
          <button
            type="button"
            onClick={onOpenSearch}
            aria-label="Buscar"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border-subtle bg-surface text-muted-foreground hover:text-foreground md:hidden"
          >
            <Search className="h-4 w-4" />
          </button>

          <a
            href="https://github.com/adiells/familia-cdia"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Repositório no GitHub"
            title="Ver código no GitHub"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border-subtle bg-surface text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
          >
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
              className="h-4 w-4"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z"
              />
            </svg>
          </a>

          <ThemeToggle className="h-10 w-10" />

          <button
            type="button"
            onClick={onNewSponsorship}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 px-3 text-[13px] font-semibold text-white shadow-md shadow-sky-500/25 transition hover:brightness-110 active:scale-[0.98] sm:px-3.5"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo Apadrinhamento</span>
            <span className="sm:hidden">Novo</span>
          </button>
        </div>
      </div>

      {/* Mobile / tablet tab strip */}
      <nav
        aria-label="Modos de visualização"
        className="flex gap-1 overflow-x-auto overscroll-x-contain border-t border-border-subtle px-2 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:hidden"
      >
        {APP_TABS.map(({ id, label, icon: Icon }) => {
          const active = id === activeTab;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange?.(id)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3",
                active
                  ? "bg-sky-500/15 text-sky-600 dark:text-sky-300"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
