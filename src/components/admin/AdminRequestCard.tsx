"use client";

import { useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  Clock,
  GraduationCap,
  Loader2,
  MessageSquare,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { cn } from "@/components/layout/cn";
import { CohortBadge } from "@/components/student/CohortBadge";
import type { SponsorshipEdgeData, StudentNodeData } from "@/data/types";

export type AdminRequestStatus = "pending" | "approved" | "rejected";
export type AdminRequestType = "sponsorship" | "standalone" | string;

export interface AdminRequestPayload {
  students?: StudentNodeData[];
  sponsorships?: SponsorshipEdgeData[];
}

export interface AdminSponsorshipRequest {
  id: string;
  request_type: AdminRequestType;
  summary: string;
  status: AdminRequestStatus;
  created_at: string;
  reviewed_at?: string | null;
  reviewer_notes?: string | null;
  payload?: AdminRequestPayload | null;
}

interface AdminRequestCardProps {
  request: AdminSponsorshipRequest;
  onReview: (
    id: string,
    decision: "approved" | "rejected",
    reviewerNotes: string,
  ) => Promise<void>;
  isReviewing?: boolean;
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

function formatPtBrDate(iso?: string | null): string {
  if (!iso) return "—";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return dateFormatter.format(parsed);
}

const STATUS_META: Record<
  AdminRequestStatus,
  { label: string; className: string; icon: typeof Clock }
> = {
  pending: {
    label: "Pendente",
    className:
      "border-amber-500/40 bg-amber-500/15 text-amber-800 dark:border-amber-400/35 dark:bg-amber-500/15 dark:text-amber-300",
    icon: Clock,
  },
  approved: {
    label: "Aprovada",
    className:
      "border-emerald-500/40 bg-emerald-500/15 text-emerald-800 dark:border-emerald-400/35 dark:bg-emerald-500/15 dark:text-emerald-300",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Rejeitada",
    className:
      "border-rose-500/40 bg-rose-500/15 text-rose-800 dark:border-rose-400/35 dark:bg-rose-500/15 dark:text-rose-300",
    icon: XCircle,
  },
};

export function AdminRequestCard({
  request,
  onReview,
  isReviewing = false,
}: AdminRequestCardProps) {
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [activeDecision, setActiveDecision] = useState<"approved" | "rejected" | null>(null);

  const students = Array.isArray(request.payload?.students)
    ? request.payload.students
    : [];
  const sponsorships = Array.isArray(request.payload?.sponsorships)
    ? request.payload.sponsorships
    : [];

  const studentNameById = new Map<string, string>();
  for (const student of students) {
    studentNameById.set(
      student.id,
      student.canonicalName || student.displayName || student.id,
    );
  }

  const statusMeta = STATUS_META[request.status] ?? STATUS_META.pending;
  const StatusIcon = statusMeta.icon;
  const isStandalone = request.request_type === "standalone";
  const typeLabel = isStandalone ? "Sem afilhado" : "Apadrinhamento";

  const handleAction = async (decision: "approved" | "rejected") => {
    if (isReviewing) return;
    setActiveDecision(decision);
    try {
      await onReview(request.id, decision, reviewerNotes.trim());
    } finally {
      setActiveDecision(null);
    }
  };

  return (
    <article className="glass-card flex flex-col gap-4 p-4 sm:p-5">
      {/* Header: badges, timestamp, ID */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
              isStandalone
                ? "border-violet-500/35 bg-violet-500/15 text-violet-800 dark:border-violet-400/35 dark:text-violet-300"
                : "border-sky-500/35 bg-sky-500/15 text-sky-800 dark:border-sky-400/35 dark:text-sky-300",
            )}
          >
            {typeLabel}
          </span>

          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
              statusMeta.className,
            )}
          >
            <StatusIcon className="h-3 w-3" />
            {statusMeta.label}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <time dateTime={request.created_at} className="tabular-nums">
            {formatPtBrDate(request.created_at)}
          </time>
          <span
            title={request.id}
            className="rounded border border-border-subtle bg-muted/40 px-1.5 py-0.5 font-mono text-[10px]"
          >
            #{request.id.slice(0, 8)}
          </span>
        </div>
      </div>

      {/* Summary */}
      <h3 className="font-display text-sm font-bold leading-snug text-foreground sm:text-base">
        {request.summary || "Solicitação sem resumo"}
      </h3>

      {/* Payload preview */}
      <div className="grid gap-3 md:grid-cols-2">
        {/* Students */}
        <div className="rounded-xl border border-border-subtle bg-muted/25 p-3">
          <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Estudantes
            </span>
            <span className="tabular-nums">{students.length}</span>
          </div>

          {students.length > 0 ? (
            <ul className="space-y-1.5">
              {students.map((student) => (
                <li
                  key={student.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-subtle/70 bg-surface px-2.5 py-1.5 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-foreground" title={student.canonicalName}>
                      {student.canonicalName}
                    </div>
                    {student.matricula && (
                      <div className="font-mono text-[10px] text-muted-foreground">
                        {student.matricula}
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <CohortBadge cohort={student.cohort} />
                    {student.sigaaVerified ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/35 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300">
                        <BadgeCheck className="h-3 w-3" />
                        SIGAA
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-400/40 bg-slate-500/10 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-300">
                        <GraduationCap className="h-3 w-3" />
                        Formado
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">Nenhum estudante no payload.</p>
          )}
        </div>

        {/* Sponsorships */}
        <div className="rounded-xl border border-border-subtle bg-muted/25 p-3">
          <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Vínculos de apadrinhamento</span>
            <span className="tabular-nums">{sponsorships.length}</span>
          </div>

          {sponsorships.length > 0 ? (
            <ul className="space-y-1.5">
              {sponsorships.map((edge) => {
                const godparentName = studentNameById.get(edge.godparentId) ?? edge.godparentId;
                const godchildName = studentNameById.get(edge.godchildId) ?? edge.godchildId;
                return (
                  <li
                    key={edge.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-subtle/70 bg-surface px-2.5 py-1.5 text-xs"
                  >
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                      <span className="truncate font-medium text-foreground" title={godparentName}>
                        {godparentName}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-sky-500" />
                      <span className="truncate font-semibold text-foreground" title={godchildName}>
                        {godchildName}
                      </span>
                    </div>
                    <CohortBadge cohort={edge.semester} />
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">
              {isStandalone
                ? "Cadastro avulso sem vínculo de afilhado."
                : "Nenhum novo vínculo neste payload."}
            </p>
          )}
        </div>
      </div>

      {/* Review metadata for already reviewed items */}
      {request.status !== "pending" && (request.reviewed_at || request.reviewer_notes) && (
        <div className="flex flex-wrap items-start gap-2 rounded-xl border border-border-subtle bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div className="min-w-0 flex-1 space-y-0.5">
            {request.reviewed_at && (
              <div>
                Revisada em <span className="font-medium text-foreground">{formatPtBrDate(request.reviewed_at)}</span>
              </div>
            )}
            {request.reviewer_notes && (
              <p className="text-foreground">Observação: {request.reviewer_notes}</p>
            )}
          </div>
        </div>
      )}

      {/* Moderation controls for pending items */}
      {request.status === "pending" && (
        <div className="flex flex-col gap-2.5 border-t border-border-subtle pt-3 sm:flex-row sm:items-center">
          <input
            type="text"
            value={reviewerNotes}
            onChange={(event) => setReviewerNotes(event.target.value)}
            disabled={isReviewing}
            placeholder="Observação opcional da revisão..."
            aria-label={`Observação da revisão para solicitação ${request.id}`}
            className="min-h-10 min-w-0 flex-1 rounded-lg border border-border-subtle bg-surface px-3 py-2 text-xs text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary disabled:opacity-60"
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isReviewing}
              onClick={() => void handleAction("approved")}
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400 sm:flex-none"
            >
              {isReviewing && activeDecision === "approved" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Aprovar
            </button>

            <button
              type="button"
              disabled={isReviewing}
              onClick={() => void handleAction("rejected")}
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-rose-500 dark:text-white dark:hover:bg-rose-400 sm:flex-none"
            >
              {isReviewing && activeDecision === "rejected" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <X className="h-3.5 w-3.5" />
              )}
              Rejeitar
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

export default AdminRequestCard;
