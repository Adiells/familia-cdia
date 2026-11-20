import { cn } from "@/components/layout/cn";

export const COHORTS = ["2021.2", "2022.1", "2024.1", "2024.2", "2025.1", "2025.2", "2026.1", "2026.2"] as const;

const COHORT_CLASS: Record<string, string> = {
  "2021.2": "cohort-2021-2",
  "2022.1": "cohort-2022-1",
  "2024.1": "cohort-2024-1",
  "2024.2": "cohort-2024-2",
  "2025.1": "cohort-2025-1",
  "2025.2": "cohort-2025-2",
  "2026.1": "cohort-2026-1",
  "2026.2": "cohort-2026-2",
};

export const COHORT_LABEL: Record<string, string> = {
  "2021.2": "Coorte histórica",
  "2022.1": "Coorte histórica",
  "2024.1": "Veteranos Fundadores",
  "2024.2": "Veteranos",
  "2025.1": "Geração P2",
  "2025.2": "Afilhados 25.2",
  "2026.1": "Calouros 26.1",
  "2026.2": "Calouros 26.2",
};

export function cohortClass(cohort: string) {
  return COHORT_CLASS[cohort] ?? "cohort-other";
}

interface CohortBadgeProps {
  cohort: string;
  /** Show the generation label (e.g. "Calouros 26.1") next to the semester. */
  showLabel?: boolean;
  className?: string;
}

export function CohortBadge({ cohort, showLabel = false, className }: CohortBadgeProps) {
  return (
    <span
      className={cn("cohort-badge", cohortClass(cohort), className)}
      title={COHORT_LABEL[cohort] ? `${cohort} • ${COHORT_LABEL[cohort]}` : cohort}
    >
      {cohort}
      {showLabel && COHORT_LABEL[cohort] ? (
        <span className="font-medium opacity-80">· {COHORT_LABEL[cohort]}</span>
      ) : null}
    </span>
  );
}
