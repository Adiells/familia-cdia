import { cn } from "@/components/layout/cn";

export const COHORTS = [
  "2020.1",
  "2020.2",
  "2021.1",
  "2021.2",
  "2022.1",
  "2022.2",
  "2023.1",
  "2023.2",
  "2024.1",
  "2024.2",
  "2025.1",
  "2025.2",
  "2026.1",
  "2026.2",
] as const;

const COHORT_CLASS: Record<string, string> = {
  "2020.1": "cohort-2020-1",
  "2020.2": "cohort-2020-2",
  "2021.1": "cohort-2021-1",
  "2021.2": "cohort-2021-2",
  "2022.1": "cohort-2022-1",
  "2022.2": "cohort-2022-2",
  "2023.1": "cohort-2023-1",
  "2023.2": "cohort-2023-2",
  "2024.1": "cohort-2024-1",
  "2024.2": "cohort-2024-2",
  "2025.1": "cohort-2025-1",
  "2025.2": "cohort-2025-2",
  "2026.1": "cohort-2026-1",
  "2026.2": "cohort-2026-2",
};

export const COHORT_LABEL: Record<string, string> = {
  "2020.1": "Turma 2020.1",
  "2020.2": "Turma 2020.2",
  "2021.1": "Turma 2021.1",
  "2021.2": "Turma 2021.2",
  "2022.1": "Turma 2022.1",
  "2022.2": "Turma 2022.2",
  "2023.1": "Turma 2023.1",
  "2023.2": "Turma 2023.2",
  "2024.1": "Turma 2024.1",
  "2024.2": "Turma 2024.2",
  "2025.1": "Turma 2025.1",
  "2025.2": "Turma 2025.2",
  "2026.1": "Turma 2026.1",
  "2026.2": "Turma 2026.2",
};

export function cohortLabel(cohort: string) {
  return COHORT_LABEL[cohort] ?? `Turma ${cohort}`;
}

export function cohortClass(cohort: string) {
  return COHORT_CLASS[cohort] ?? "cohort-other";
}

interface CohortBadgeProps {
  cohort: string;
  /** Show the uniform cohort label (e.g. "Turma 2026.1") instead of only the semester. */
  showLabel?: boolean;
  className?: string;
}

export function CohortBadge({ cohort, showLabel = false, className }: CohortBadgeProps) {
  const label = cohortLabel(cohort);

  return (
    <span
      className={cn("cohort-badge", cohortClass(cohort), className)}
      title={label}
    >
      {showLabel ? label : cohort}
    </span>
  );
}
