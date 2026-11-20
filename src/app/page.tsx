"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Award,
  Crown,
  GitBranch,
  GitFork,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { Header, type AppTab } from "@/components/layout/Header";
import { StatsBar, type TreeStats } from "@/components/layout/StatsBar";
import { StudentDrawer } from "@/components/student/StudentDrawer";
import { CohortBadge } from "@/components/student/CohortBadge";
import { FamilyTreeCanvas } from "@/components/tree/FamilyTreeCanvas";
import { CommandSearch } from "@/components/search/CommandSearch";
import { AddSponsorshipModal } from "@/components/admin/AddSponsorshipModal";
import {
  calculateFamilyMetrics,
  getAncestors,
  getDescendants,
  getDirectRelations,
  type LayoutDirection,
  type LineageMode,
  type RoleFilter,
} from "@/lib/graph-layout";
import { normalizeSearchText } from "@/lib/search";
import type {
  CohortSemester,
  SigaaStudentRecord,
  SponsorshipEdgeData,
  StudentNodeData,
} from "@/data/types";

import initialStudentsJson from "@/data/students.json";
import initialSponsorshipsJson from "@/data/sponsorships.json";
import sigaaStudentsJson from "@/data/sigaa-students.json";

const initialStudents = initialStudentsJson as unknown as StudentNodeData[];
const initialSponsorships =
  initialSponsorshipsJson as unknown as SponsorshipEdgeData[];
const sigaaStudents = sigaaStudentsJson as unknown as SigaaStudentRecord[];

export default function Home() {
  const [activeTab, setActiveTab] = useState<AppTab>("tree");
  const [students, setStudents] = useState<StudentNodeData[]>(initialStudents);
  const [sponsorships, setSponsorships] =
    useState<SponsorshipEdgeData[]>(initialSponsorships);

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null
  );
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);

  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [cohortFilter, setCohortFilter] = useState<CohortSemester | "ALL">(
    "ALL"
  );
  const [direction, setDirection] = useState<LayoutDirection>("TB");
  const [lineageMode, setLineageMode] = useState<LineageMode>("HIGHLIGHT");

  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [addModalOpen, setAddModalOpen] = useState<boolean>(false);

  const [directoryQuery, setDirectoryQuery] = useState<string>("");

  const studentMap = useMemo(() => {
    const map = new Map<string, StudentNodeData>();
    for (const s of students) {
      map.set(s.id, s);
    }
    return map;
  }, [students]);

  const selectedStudent = useMemo(
    () => (selectedStudentId ? studentMap.get(selectedStudentId) ?? null : null),
    [selectedStudentId, studentMap]
  );

  const stats: TreeStats = useMemo(() => {
    const byCohort: Record<string, number> = {};
    for (const s of students) {
      byCohort[s.cohort] = (byCohort[s.cohort] ?? 0) + 1;
    }
    return {
      totalStudents: students.length,
      totalSponsorships: sponsorships.length,
      byCohort,
    };
  }, [students, sponsorships]);

  const familyMetrics = useMemo(
    () => calculateFamilyMetrics(students, sponsorships),
    [students, sponsorships]
  );

  // Selected student direct relations and total descendants for StudentDrawer
  const selectedRelations = useMemo(() => {
    if (!selectedStudentId) {
      return {
        godparents: [] as StudentNodeData[],
        godchildren: [] as StudentNodeData[],
        totalDescendants: 0,
      };
    }
    const direct = getDirectRelations(selectedStudentId, students, sponsorships);
    const descendants = getDescendants(selectedStudentId, sponsorships, "ALL");

    return {
      godparents: direct.allGodparents.map((g) => g.student),
      godchildren: direct.directGodchildren.map((g) => g.student),
      totalDescendants: descendants.size,
    };
  }, [selectedStudentId, students, sponsorships]);

  // Precomputed lineages list for the "Explorador de Linhagens" tab
  const lineageRankings = useMemo(() => {
    return students
      .map((student) => {
        const descendants = getDescendants(student.id, sponsorships, "ALL");
        const ancestors = getAncestors(student.id, sponsorships, "ALL");
        const direct = getDirectRelations(student.id, students, sponsorships);
        return {
          student,
          descendantsCount: descendants.size,
          ancestorsCount: ancestors.size,
          directGodchildrenCount: direct.directGodchildren.length,
          totalFamilySize: 1 + descendants.size + ancestors.size,
        };
      })
      .sort(
        (a, b) =>
          b.descendantsCount - a.descendantsCount ||
          b.directGodchildrenCount - a.directGodchildrenCount ||
          a.student.canonicalName.localeCompare(b.student.canonicalName, "pt-BR")
      );
  }, [students, sponsorships]);

  const handleSelectStudent = useCallback(
    (student: StudentNodeData | null) => {
      setSelectedStudentId(student?.id ?? null);
      setDrawerOpen(Boolean(student));
    },
    []
  );

  const handleSelectStudentById = useCallback(
    (id: string) => {
      const target = studentMap.get(id) ?? null;
      setSelectedStudentId(target?.id ?? null);
      setDrawerOpen(Boolean(target));
    },
    [studentMap]
  );

  const handleFocusLineage = useCallback((id: string) => {
    setSelectedStudentId(id);
    setLineageMode("ISOLATE");
    setActiveTab("tree");
  }, []);

  const filteredDirectory = useMemo(() => {
    const q = normalizeSearchText(directoryQuery);
    return students
      .filter((s) => {
        if (cohortFilter !== "ALL" && s.cohort !== cohortFilter) return false;
        if (!q) return true;
        const haystack = normalizeSearchText(
          [
            s.canonicalName,
            s.displayName,
            s.matricula ?? "",
            s.cohort,
            ...s.aliases,
          ].join(" ")
        );
        return haystack.includes(q);
      })
      .sort((a, b) =>
        a.canonicalName.localeCompare(b.canonicalName, "pt-BR")
      );
  }, [students, cohortFilter, directoryQuery]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenSearch={() => setSearchOpen(true)}
        onNewSponsorship={() => setAddModalOpen(true)}
      />

      <StatsBar
        stats={stats}
        activeCohort={cohortFilter === "ALL" ? null : cohortFilter}
        onCohortChange={(cohort) =>
          setCohortFilter((cohort as CohortSemester | null) ?? "ALL")
        }
      />

      <main className="mx-auto flex w-full max-w-[1800px] flex-1 flex-col px-4 pb-6 sm:px-6">
        {activeTab === "tree" && (
          <div className="relative flex h-[calc(100dvh-11.5rem)] min-h-[480px] w-full flex-1 sm:h-[calc(100vh-13.5rem)] sm:min-h-[600px]">
            <FamilyTreeCanvas
              students={students}
              sponsorships={sponsorships}
              selectedStudentId={selectedStudentId}
              onSelectStudent={handleSelectStudent}
              roleFilter={roleFilter}
              onRoleFilterChange={setRoleFilter}
              cohortFilter={cohortFilter}
              onCohortFilterChange={setCohortFilter}
              direction={direction}
              onDirectionChange={setDirection}
              lineageMode={lineageMode}
              onLineageModeChange={setLineageMode}
              className="h-full w-full"
            />
          </div>
        )}

        {activeTab === "lineages" && (
          <div className="space-y-6">
            {/* Highlight Banner */}
            <div className="glass-card flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
                  <Crown className="h-3.5 w-3.5" />
                  Ranking de Genealogia Acadêmica CDIA
                </div>
                <h2 className="font-display text-xl font-bold">
                  Explorador de Linhagens & Padrinhos
                </h2>
                <p className="text-xs text-muted-foreground">
                  Explore os patriarcas/matriarcas acadêmicos de Ciência de Dados e IA e veja quantas gerações de afilhados cada estudante originou.
                </p>
              </div>

              {familyMetrics.largestLineage.rootStudent && (
                <button
                  type="button"
                  onClick={() =>
                    handleFocusLineage(
                      familyMetrics.largestLineage.rootStudent!.id
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/15 px-4 py-2.5 text-xs font-semibold text-amber-200 transition hover:bg-amber-500/25"
                >
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  Isolar Maior Linhagem (
                  {familyMetrics.largestLineage.rootStudent.displayName} ·{" "}
                  {familyMetrics.largestLineage.descendantsCount} descendentes)
                </button>
              )}
            </div>

            {/* Lineage Cards Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {lineageRankings
                .filter(
                  (item) =>
                    cohortFilter === "ALL" ||
                    item.student.cohort === cohortFilter
                )
                .map((item, idx) => (
                  <div
                    key={item.student.id}
                    className="glass-card flex flex-col justify-between p-4 transition hover:border-sky-500/50"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <CohortBadge cohort={item.student.cohort} />
                        {idx < 3 && item.descendantsCount > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                            <Award className="h-3 w-3" /> Top #{idx + 1}
                          </span>
                        )}
                      </div>

                      <h3 className="mt-2.5 font-display text-base font-bold leading-snug">
                        {item.student.displayName}
                      </h3>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {item.student.canonicalName}
                      </p>

                      <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl border border-border-subtle bg-muted/30 p-2.5 text-center">
                        <div>
                          <div className="font-display text-base font-bold text-sky-400">
                            {item.descendantsCount}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            Descendentes
                          </div>
                        </div>
                        <div>
                          <div className="font-display text-base font-bold text-emerald-400">
                            {item.directGodchildrenCount}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            Afilhados
                          </div>
                        </div>
                        <div>
                          <div className="font-display text-base font-bold text-violet-400">
                            {item.ancestorsCount}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            Ancestrais
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSelectStudent(item.student)}
                        className="flex-1 rounded-lg border border-border-subtle bg-muted/40 px-3 py-1.5 text-xs font-medium transition hover:border-sky-500/40 hover:text-foreground"
                      >
                        Ver Perfil
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFocusLineage(item.student.id)}
                        className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-sky-500/20 border border-sky-500/40 px-3 py-1.5 text-xs font-semibold text-sky-300 transition hover:bg-sky-500/30"
                      >
                        <GitBranch className="h-3.5 w-3.5" />
                        Isolar Árvore
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {activeTab === "directory" && (
          <div className="glass-card flex flex-1 flex-col overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle p-3 sm:p-5">
              <div>
                <h2 className="font-display text-lg font-bold">
                  Diretório de Alunos ({filteredDirectory.length})
                </h2>
                <p className="text-xs text-muted-foreground">
                  Estudantes presentes na árvore de apadrinhamento.
                </p>
              </div>
              <div className="relative w-full sm:w-80">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  value={directoryQuery}
                  onChange={(e) => setDirectoryQuery(e.target.value)}
                  placeholder="Filtrar por nome, matrícula ou geração..."
                  className="w-full rounded-lg border border-border-subtle bg-surface py-2 pl-9 pr-3 text-xs outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <ul className="divide-y divide-border-subtle overflow-y-auto sm:hidden" aria-label="Lista de alunos">
              {filteredDirectory.map((student) => (
                <li key={student.id} className="p-3">
                  <div className="font-semibold leading-snug">{student.canonicalName}</div>
                  {student.notes && <div className="mt-0.5 text-[11px] text-amber-400">Nota: {student.notes}</div>}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono">{student.matricula ?? "Sem matrícula"}</span>
                    <CohortBadge cohort={student.cohort} />
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectStudent(student)}
                      className="min-h-11 rounded-lg border border-border-subtle px-3 text-xs font-medium hover:border-sky-500/40"
                    >
                      Perfil
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFocusLineage(student.id)}
                      className="min-h-11 rounded-lg bg-sky-500/15 px-3 text-xs font-semibold text-sky-400 hover:bg-sky-500/25"
                    >
                      Ver na Árvore
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[780px] text-left text-sm">
                <thead className="border-b border-border-subtle bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3">Nome</th>
                    <th className="px-4 py-3">Matrícula</th>
                    <th className="px-4 py-3">Geração</th>
                    <th className="px-5 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {filteredDirectory.map((student) => (
                    <tr
                      key={student.id}
                      className="transition hover:bg-muted/30"
                    >
                      <td className="px-5 py-3">
                        <div className="font-semibold">
                          {student.canonicalName}
                        </div>
                        {student.notes && (
                          <div className="text-[11px] text-amber-400">
                            Nota: {student.notes}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {student.matricula ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <CohortBadge cohort={student.cohort} />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSelectStudent(student)}
                            className="rounded-lg border border-border-subtle px-2.5 py-1 text-xs font-medium hover:border-sky-500/40"
                          >
                            Perfil
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFocusLineage(student.id)}
                            className="rounded-lg bg-sky-500/15 px-2.5 py-1 text-xs font-semibold text-sky-400 hover:bg-sky-500/25"
                          >
                            Ver na Árvore
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Student Profile Drawer */}
      <StudentDrawer
        student={ drawerOpen ? selectedStudent : null }
        godparents={selectedRelations.godparents}
        godchildren={selectedRelations.godchildren}
        totalDescendants={selectedRelations.totalDescendants}
        onClose={() => setDrawerOpen(false)}
        onSelectStudent={handleSelectStudentById}
        onFocusLineage={(id) => {
          handleFocusLineage(id);
          setDrawerOpen(false);
        }}
      />

      {/* Global Command Search Modal (Cmd+K) */}
      <CommandSearch
        students={students}
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelectStudent={(student) => {
          handleSelectStudent(student);
          setActiveTab("tree");
        }}
      />

      {/* Add Sponsorship Modal with Live SIGAA Autocomplete */}
      <AddSponsorshipModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        students={students}
        sponsorships={sponsorships}
        sigaaStudents={sigaaStudents}
        onDataChange={({ students: nextStudents, sponsorships: nextEdges }) => {
          setStudents(nextStudents);
          setSponsorships(nextEdges);
        }}
      />
    </div>
  );
}
