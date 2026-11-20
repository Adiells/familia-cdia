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
    <div className="glass-card flex min-w-[9.5rem] flex-1 items-center gap-3 px-3.5 py-2.5">
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", tone)}>
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div className="leading-tight">
        <div className="font-display text-xl font-bold tabular-nums">{value.toLocaleString("pt-BR")}</div>
        <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
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
      <div className="mx-auto flex max-w-[1800px] flex-col gap-3 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap gap-3">
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
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por geração">
          <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Geração
          </span>
          <button
            type="button"
            onClick={() => onCohortChange?.(null)}
            aria-pressed={activeCohort === null}
            className={cn(
              "cohort-badge cursor-pointer transition",
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
                  "cohort-badge cursor-pointer transition",
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
