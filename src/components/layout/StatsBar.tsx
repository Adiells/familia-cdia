"use client";

import { GitFork, Layers, Users } from "lucide-react";
import { COHORTS, cohortClass } from "@/components/student/CohortBadge";
import { cn } from "./cn";

export interface TreeStats {
  totalStudents: number;
  totalSponsorships: number;
  /** Counts of students keyed by cohort ("2024.1" ...). */
  byCohort: Record<string, number>;
}

interface StatsBarProps {
  stats: TreeStats;
  /** Active cohort filter; null/undefined = all. */
  activeCohort?: string | null;
  onCohortChange?: (cohort: string | null) => void;
  className?: string;
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="glass-card flex min-w-0 items-center gap-2 px-2 py-2 sm:min-w-[9.5rem] sm:flex-1 sm:gap-3 sm:px-3.5 sm:py-2.5">
      <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9", tone)}>
        <Icon className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
      </span>
      <div className="min-w-0 leading-tight">
        <div className="font-display text-lg font-bold tabular-nums sm:text-xl">{value.toLocaleString("pt-BR")}</div>
        <div className="text-[9px] font-medium leading-tight text-muted-foreground sm:text-[11px]">{label}</div>
      </div>
    </div>
  );
}

export function StatsBar({ stats, activeCohort = null, onCohortChange, className }: StatsBarProps) {
  const cohorts = [
    ...COHORTS,
    ...Object.keys(stats.byCohort).filter((c) => !(COHORTS as readonly string[]).includes(c)),
  ];

  return (
    <section aria-label="Estatísticas e filtros por geração" className={cn("w-full", className)}>
      <div className="mx-auto flex max-w-[1800px] flex-col gap-2 px-3 py-2 sm:gap-3 sm:px-6 sm:py-3">
        <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:gap-3">
          <Stat
            icon={Users}
            label="Estudantes na árvore"
            value={stats.totalStudents}
            tone="bg-sky-500/15 text-sky-500 dark:text-sky-300"
          />
          <Stat
            icon={GitFork}
            label="Apadrinhamentos"
            value={stats.totalSponsorships}
            tone="bg-violet-500/15 text-violet-600 dark:text-violet-300"
          />
          <Stat
            icon={Layers}
            label="Gerações"
            value={cohorts.filter((c) => (stats.byCohort[c] ?? 0) > 0).length}
            tone="bg-amber-500/15 text-amber-600 dark:text-amber-300"
          />
        </div>

        {/* Cohort quick filters */}
        <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:gap-2" role="group" aria-label="Filtrar por geração">
          <span className="mr-0.5 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:mr-1 sm:text-[11px]">
            Geração
          </span>
          <button
            type="button"
            onClick={() => onCohortChange?.(null)}
            aria-pressed={activeCohort === null}
            className={cn(
              "cohort-badge min-h-8 shrink-0 cursor-pointer px-2 py-1 text-[10px] transition sm:text-xs",
              activeCohort === null
                ? "border-sky-500/50 bg-sky-500/20 text-sky-700 dark:text-sky-200"
                : "border-border-subtle text-muted-foreground hover:text-foreground",
            )}
          >
            Todas
          </button>
          {cohorts.map((c) => {
            const active = activeCohort === c;
            const dimmed = activeCohort !== null && !active;
            return (
              <button
                key={c}
                type="button"
                onClick={() => onCohortChange?.(active ? null : c)}
                aria-pressed={active}
                className={cn(
                  "cohort-badge min-h-8 shrink-0 cursor-pointer px-2 py-1 text-[10px] transition sm:text-xs",
                  cohortClass(c),
                  dimmed && "opacity-40 hover:opacity-80",
                  active && "ring-2 ring-current/40",
                )}
              >
                {c}
                <span className="font-medium opacity-70 tabular-nums">{stats.byCohort[c] ?? 0}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
