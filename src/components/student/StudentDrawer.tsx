"use client";

import { GitBranch, Crosshair, IdCard, Users, X } from "lucide-react";
import { useEffect } from "react";
import type { StudentNodeData } from "@/data/types";
import { CohortBadge } from "./CohortBadge";

interface StudentDrawerProps {
  /** Selected student; the drawer is hidden when null. */
  student: StudentNodeData | null;
  /** All godparents (padrinhos / madrinhas), shown uniformly. */
  godparents?: StudentNodeData[];
  /** Direct godchildren (afilhados diretos). */
  godchildren?: StudentNodeData[];
  /** Total number of descendants in this student's lineage (all generations). */
  totalDescendants?: number;
  onClose: () => void;
  /** Navigate to another student's profile (e.g. clicking a godparent / godchild). */
  onSelectStudent?: (id: string) => void;
  /** "Focar na Linhagem": highlight this student's ancestors/descendants in the tree. */
  onFocusLineage?: (id: string) => void;
}

function PersonLink({
  person,
  onSelect,
}: {
  person: StudentNodeData;
  onSelect?: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(person.id)}
      className="group flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-border-subtle bg-muted/30 px-3 py-2.5 text-left transition hover:border-sky-500/40 hover:bg-muted/60"
    >
      <span className="min-w-0 truncate text-[13px] font-semibold">{person.canonicalName}</span>
      <CohortBadge cohort={person.cohort} />
    </button>
  );
}

function Section({
  icon: Icon,
  title,
  count,
  children,
}: {
  icon: typeof Users;
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {title}
        {count !== undefined && (
          <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums text-foreground">
            {count}
          </span>
        )}
      </h3>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex min-h-11 items-center rounded-lg border border-dashed border-border-subtle px-3 py-2 text-[12px] text-muted-foreground">
      {children}
    </p>
  );
}

export function StudentDrawer({
  student,
  godparents = [],
  godchildren = [],
  totalDescendants = 0,
  onClose,
  onSelectStudent,
  onFocusLineage,
}: StudentDrawerProps) {
  useEffect(() => {
    if (!student) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [student, onClose]);

  if (!student) return null;

  return (
    <>
      <div
        className="animate-fade-in fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px] lg:hidden"
        onClick={onClose}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Perfil de ${student.canonicalName}`}
        className="animate-drawer-in glass-card fixed inset-x-0 inset-y-0 z-50 flex h-[100dvh] w-full flex-col border-x-0 border-y-0 bg-surface-strong/95 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] sm:left-auto sm:right-0 sm:max-w-md sm:rounded-l-2xl sm:border-y-0 sm:border-r-0"
      >
        {/* Header */}
        <div className="relative border-b border-border-subtle bg-gradient-to-b from-sky-500/10 to-transparent px-4 pb-4 pt-4 sm:px-5 sm:pt-5">
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar perfil"
            className="absolute right-3 top-3 inline-flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>

          <CohortBadge cohort={student.cohort} showLabel />

          <h2 className="mt-3 pr-8 font-display text-xl font-bold leading-snug tracking-tight">
            {student.canonicalName}
          </h2>

          {student.matricula && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <IdCard className="h-3.5 w-3.5" />
              Matrícula
              <span className="font-mono text-[13px] font-semibold tabular-nums text-foreground">
                {student.matricula}
              </span>
            </p>
          )}
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-y-contain px-4 py-4 sm:px-5">
          <Section icon={GitBranch} title="Padrinhos / Madrinhas" count={godparents.length}>
            {godparents.length > 0 ? (
              <ul className="space-y-1.5">
                {godparents.map((g) => (
                  <li key={g.id}>
                    <PersonLink person={g} onSelect={onSelectStudent} />
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>Nenhum padrinho ou madrinha registrado.</Empty>
            )}
          </Section>

          <Section icon={Users} title="Afilhados diretos" count={godchildren.length}>
            {godchildren.length > 0 ? (
              <ul className="space-y-1.5">
                {godchildren.map((g) => (
                  <li key={g.id}>
                    <PersonLink person={g} onSelect={onSelectStudent} />
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>Nenhum afilhado direto.</Empty>
            )}
          </Section>

          <Section icon={GitBranch} title="Linhagem">
            <div className="glass-card flex items-center justify-between px-4 py-3">
              <div>
                <div className="font-display text-2xl font-bold tabular-nums">{totalDescendants}</div>
                <div className="text-[11px] font-medium text-muted-foreground">
                  {totalDescendants === 1 ? "descendente" : "descendentes"} na linhagem
                </div>
              </div>
              <div className="text-right text-[11px] text-muted-foreground">
                Afilhados, afilhados
                <br />
                dos afilhados, etc.
              </div>
            </div>
          </Section>
        </div>

        {/* Footer */}
        <div className="border-t border-border-subtle p-4">
          <button
            type="button"
            onClick={() => onFocusLineage?.(student.id)}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-500/25 transition hover:brightness-110 active:scale-[0.99]"
          >
            <Crosshair className="h-4 w-4" />
            Focar na Linhagem
          </button>
        </div>
      </aside>
    </>
  );
}
