export type CohortSemester = '2024.1' | '2024.2' | '2025.1' | '2025.2' | '2026.1' | string;

export type SponsorshipRole = 'P2' | 'VETERANO';

export type MatchConfidence = 'EXACT' | 'TOKEN_SUBSET' | 'FUZZY' | 'PDF_ONLY';

export interface SigaaStudentRecord {
  matricula: string;
  name: string;
  normalizedName: string;
  inferredCohort?: string;
}

export interface StudentNodeData {
  /** Deterministic unique slug (e.g., "adiel-emilson-...") */
  id: string;
  /** Official full name according to SIGAA (or fullest known name if inactive) */
  canonicalName: string;
  /** Short display name for tree cards (e.g., "Adiel Emilson") */
  displayName: string;
  /** Official SIGAA registration number when matched */
  matricula?: string | null;
  /** Entry semester inferred from SIGAA registration or sponsorship PDF */
  cohort: CohortSemester;
  /** Raw name variations encountered across the sponsorship PDFs */
  aliases: string[];
  /** True if confirmed in the active SIGAA student list (course id=14289031) */
  sigaaVerified: boolean;
  /** Matching tier used during entity resolution */
  matchConfidence: MatchConfidence;
  /** Optional disambiguation notes (e.g., "Cajazeiras") */
  notes?: string;
}

export interface SponsorshipEdgeData {
  id: string;
  /** Canonical ID of the godparent (Padrinho/Madrinha) */
  godparentId: string;
  /** Canonical ID of the godchild (Calouro/Afilhado) */
  godchildId: string;
  /** Sponsorship type: P2 (immediate second-period mentor) or VETERANO (senior mentor) */
  role: SponsorshipRole;
  /** Semester when the sponsorship took place (e.g., "2025.2" or "2026.1") */
  semester: CohortSemester;
  /** Source PDF document identifier */
  sourceDoc: string;
}

export interface ReconciliationAuditEntry {
  rawName: string;
  sourceDoc: string;
  resolvedStudentId: string;
  canonicalName: string;
  matricula?: string | null;
  matchConfidence: MatchConfidence;
  explanation: string;
}
