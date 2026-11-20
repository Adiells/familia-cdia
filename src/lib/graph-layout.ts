import dagre from '@dagrejs/dagre';
import { Position, type Edge, type Node } from '@xyflow/react';
import type {
  CohortSemester,
  SponsorshipEdgeData,
  StudentNodeData,
} from '../data/types';

export const COHORT_ORDER: readonly CohortSemester[] = [
  '2021.2',
  '2022.1',
  '2024.1',
  '2024.2',
  '2025.1',
  '2025.2',
  '2026.1',
  '2026.2',
] as const;

export const NODE_WIDTH = 252;
export const NODE_HEIGHT = 138;
export const DEFAULT_NODE_SEP = 52;
export const DEFAULT_RANK_SEP = 180;

export type LayoutDirection = 'TB' | 'LR';
export type LineageMode = 'HIGHLIGHT' | 'ISOLATE';
export type LineageRelation = 'SELF' | 'ANCESTOR' | 'DESCENDANT' | 'NONE';
export type EdgeLineageSegment = 'UPSTREAM' | 'DOWNSTREAM' | 'NONE';

export interface CohortTheme {
  cohort: CohortSemester;
  rank: number;
  label: string;
  shortLabel: string;
  generationTitle: string;
  badgeClass: string;
  cardBgClass: string;
  cardBorderClass: string;
  dotClass: string;
  borderGlowClass: string;
  accentColor: string;
  minimapColor: string;
}

export const COHORT_THEMES: Record<string, CohortTheme> = {
  '2021.2': {
    cohort: '2021.2',
    rank: 0,
    label: '2021.2',
    shortLabel: '21.2',
    generationTitle: 'Turma 2021.2',
    badgeClass:
      'bg-teal-500/20 text-teal-900 border-teal-500/45 dark:bg-teal-500/20 dark:text-teal-200 dark:border-teal-400/40',
    cardBgClass: 'bg-teal-50/95 dark:bg-teal-950/40',
    cardBorderClass: 'border-teal-400/80 dark:border-teal-500/60',
    dotClass: 'bg-teal-500 dark:bg-teal-400',
    borderGlowClass: 'hover:border-teal-500',
    accentColor: '#14b8a6',
    minimapColor: '#14b8a6',
  },
  '2022.1': {
    cohort: '2022.1',
    rank: 1,
    label: '2022.1',
    shortLabel: '22.1',
    generationTitle: 'Turma 2022.1',
    badgeClass:
      'bg-fuchsia-500/20 text-fuchsia-900 border-fuchsia-500/45 dark:bg-fuchsia-500/20 dark:text-fuchsia-200 dark:border-fuchsia-400/40',
    cardBgClass: 'bg-fuchsia-50/95 dark:bg-fuchsia-950/40',
    cardBorderClass: 'border-fuchsia-400/80 dark:border-fuchsia-500/60',
    dotClass: 'bg-fuchsia-500 dark:bg-fuchsia-400',
    borderGlowClass: 'hover:border-fuchsia-500',
    accentColor: '#d946ef',
    minimapColor: '#d946ef',
  },
  '2024.1': {
    cohort: '2024.1',
    rank: 2,
    label: '2024.1',
    shortLabel: '24.1',
    generationTitle: 'Turma 2024.1',
    badgeClass:
      'bg-amber-500/20 text-amber-900 border-amber-500/45 dark:bg-amber-500/20 dark:text-amber-200 dark:border-amber-400/40',
    cardBgClass: 'bg-amber-50/95 dark:bg-amber-950/40',
    cardBorderClass: 'border-amber-400/80 dark:border-amber-500/60',
    dotClass: 'bg-amber-500 dark:bg-amber-400',
    borderGlowClass: 'hover:border-amber-500',
    accentColor: '#f59e0b',
    minimapColor: '#f59e0b',
  },
  '2024.2': {
    cohort: '2024.2',
    rank: 3,
    label: '2024.2',
    shortLabel: '24.2',
    generationTitle: 'Turma 2024.2',
    badgeClass:
      'bg-violet-500/20 text-violet-900 border-violet-500/45 dark:bg-violet-500/20 dark:text-violet-200 dark:border-violet-400/40',
    cardBgClass: 'bg-violet-50/95 dark:bg-violet-950/40',
    cardBorderClass: 'border-violet-400/80 dark:border-violet-500/60',
    dotClass: 'bg-violet-500 dark:bg-violet-400',
    borderGlowClass: 'hover:border-violet-500',
    accentColor: '#8b5cf6',
    minimapColor: '#8b5cf6',
  },
  '2025.1': {
    cohort: '2025.1',
    rank: 4,
    label: '2025.1',
    shortLabel: '25.1',
    generationTitle: 'Turma 2025.1',
    badgeClass:
      'bg-emerald-500/20 text-emerald-900 border-emerald-500/45 dark:bg-emerald-500/20 dark:text-emerald-200 dark:border-emerald-400/40',
    cardBgClass: 'bg-emerald-50/95 dark:bg-emerald-950/40',
    cardBorderClass: 'border-emerald-400/80 dark:border-emerald-500/60',
    dotClass: 'bg-emerald-500 dark:bg-emerald-400',
    borderGlowClass: 'hover:border-emerald-500',
    accentColor: '#10b981',
    minimapColor: '#10b981',
  },
  '2025.2': {
    cohort: '2025.2',
    rank: 5,
    label: '2025.2',
    shortLabel: '25.2',
    generationTitle: 'Turma 2025.2',
    badgeClass:
      'bg-sky-500/20 text-sky-900 border-sky-500/45 dark:bg-sky-500/20 dark:text-sky-200 dark:border-sky-400/40',
    cardBgClass: 'bg-sky-50/95 dark:bg-sky-950/40',
    cardBorderClass: 'border-sky-400/80 dark:border-sky-500/60',
    dotClass: 'bg-sky-500 dark:bg-sky-400',
    borderGlowClass: 'hover:border-sky-500',
    accentColor: '#0ea5e9',
    minimapColor: '#0ea5e9',
  },
  '2026.1': {
    cohort: '2026.1',
    rank: 6,
    label: '2026.1',
    shortLabel: '26.1',
    generationTitle: 'Turma 2026.1',
    badgeClass:
      'bg-rose-500/20 text-rose-900 border-rose-500/45 dark:bg-rose-500/20 dark:text-rose-200 dark:border-rose-400/40',
    cardBgClass: 'bg-rose-50/95 dark:bg-rose-950/40',
    cardBorderClass: 'border-rose-400/80 dark:border-rose-500/60',
    dotClass: 'bg-rose-500 dark:bg-rose-400',
    borderGlowClass: 'hover:border-rose-500',
    accentColor: '#f43f5e',
    minimapColor: '#f43f5e',
  },
  '2026.2': {
    cohort: '2026.2',
    rank: 7,
    label: '2026.2',
    shortLabel: '26.2',
    generationTitle: 'Turma 2026.2',
    badgeClass:
      'bg-cyan-500/20 text-cyan-900 border-cyan-500/45 dark:bg-cyan-500/20 dark:text-cyan-200 dark:border-cyan-400/40',
    cardBgClass: 'bg-cyan-50/95 dark:bg-cyan-950/40',
    cardBorderClass: 'border-cyan-400/80 dark:border-cyan-500/60',
    dotClass: 'bg-cyan-500 dark:bg-cyan-400',
    borderGlowClass: 'hover:border-cyan-500',
    accentColor: '#06b6d4',
    minimapColor: '#06b6d4',
  },
};

const FALLBACK_COHORT_THEME: CohortTheme = {
  cohort: 'N/A',
  rank: 8,
  label: 'Outro',
  shortLabel: '--',
  generationTitle: 'Comunidade CDIA',
  badgeClass:
    'bg-slate-500/15 text-slate-700 border-slate-500/35 dark:text-slate-300 dark:border-slate-500/30',
  cardBgClass: 'bg-white dark:bg-slate-900',
  cardBorderClass: 'border-slate-300 dark:border-slate-800',
  dotClass: 'bg-slate-500 dark:bg-slate-400',
  borderGlowClass: 'hover:border-sky-500/50',
  accentColor: '#64748b',
  minimapColor: '#64748b',
};

/**
 * Returns the numeric rank index for a known cohort, including earlier historical cohorts.
 */
export function getCohortRank(cohort: CohortSemester): number {
  const knownIndex = COHORT_ORDER.indexOf(cohort);
  if (knownIndex !== -1) {
    return knownIndex;
  }
  const match = /^(\d{4})\.(\d)$/.exec(String(cohort).trim());
  if (match) {
    const year = Number(match[1]);
    const sem = Number(match[2]);
    return (year - 2024) * 2 + (sem - 1);
  }
  return COHORT_ORDER.length;
}

/**
 * Returns Aquário UFPB semantic theme tokens for a cohort semester.
 */
export function getCohortTheme(cohort: CohortSemester): CohortTheme {
  const theme = COHORT_THEMES[cohort];
  if (theme) return theme;
  return {
    ...FALLBACK_COHORT_THEME,
    cohort,
    rank: getCohortRank(cohort),
    label: cohort || 'Outro',
    shortLabel: cohort ? cohort.replace(/^20/, '') : '--',
    generationTitle: cohort ? `Turma ${cohort}` : 'Comunidade CDIA',
  };
}

export interface StudentFlowNodeData extends StudentNodeData, Record<string, unknown> {
  /** Direct godparents of this student */
  godparents: StudentNodeData[];
  /** Total direct godparents count */
  godparentsCount: number;
  /** Total direct godchildren count */
  godchildrenCount: number;
  /** Total recursive academic ancestors count */
  ancestorsCount: number;
  /** Total recursive academic descendants count */
  descendantsCount: number;
  /** Layout direction currently active */
  direction: LayoutDirection;
  /** Rank tier index (0 for 2024.1 .. 4 for 2026.1) */
  tierRank: number;
  /** Whether this node is the actively selected ego node */
  isSelected: boolean;
  /** Whether this node is an ancestor of the selected node */
  isAncestor: boolean;
  /** Whether this node is a descendant of the selected node */
  isDescendant: boolean;
  /** Whether this node belongs to the active lineage focus set */
  isInLineage: boolean;
  /** Whether this node should be visually dimmed (outside active lineage/search) */
  isDimmed: boolean;
  /** Whether this node matches an active search query highlight */
  isSearchMatch?: boolean;
  /** Relationship to the currently selected student */
  lineageRelation: LineageRelation;
  /** Relative generational distance from selected student (-1 = direct godparent, +1 = direct godchild) */
  lineageDepth?: number;
}

export interface SponsorshipFlowEdgeData
  extends SponsorshipEdgeData,
    Record<string, unknown> {
  godparentName?: string;
  godchildName?: string;
  isHighlighted: boolean;
  isDimmed: boolean;
  hasSelection: boolean;
  lineageSegment: EdgeLineageSegment;
  parallelOffset: number;
  sourceOffset: number;
  targetOffset: number;
  curvatureOffset: number;
  direction: LayoutDirection;
}

export type StudentFlowNode = Node<StudentFlowNodeData, 'student'>;
export type SponsorshipFlowEdge = Edge<SponsorshipFlowEdgeData, 'sponsorship'>;

type EdgeLike =
  | SponsorshipEdgeData
  | {
      id?: string;
      godparentId?: string;
      godchildId?: string;
      source?: string;
      target?: string;
      data?: {
        godparentId?: string;
        godchildId?: string;
      };
    };

function extractEdgeEndpoints(edge: EdgeLike): {
  id: string;
  godparentId: string;
  godchildId: string;
} {
  const anyEdge = edge as Record<string, unknown>;
  const data = (anyEdge.data as Record<string, unknown> | undefined) ?? undefined;
  const godparentId = String(
    anyEdge.godparentId ?? data?.godparentId ?? anyEdge.source ?? ''
  );
  const godchildId = String(
    anyEdge.godchildId ?? data?.godchildId ?? anyEdge.target ?? ''
  );
  const id = String(anyEdge.id ?? `${godparentId}->${godchildId}`);
  return { id, godparentId, godchildId };
}

/**
 * Recursively computes all academic ancestors (godparents, grand-godparents, etc.)
 * of a given studentId by traversing directed edges backwards (godchild -> godparent).
 */
export function getAncestors(
  studentId: string,
  edges: ReadonlyArray<EdgeLike>
): Set<string> {
  const ancestors = new Set<string>();
  if (!studentId) return ancestors;

  const parentsByChild = new Map<string, string[]>();
  for (const rawEdge of edges) {
    const { godparentId, godchildId } = extractEdgeEndpoints(rawEdge);
    if (!godparentId || !godchildId) continue;

    const list = parentsByChild.get(godchildId);
    if (list) {
      list.push(godparentId);
    } else {
      parentsByChild.set(godchildId, [godparentId]);
    }
  }

  const queue: string[] = [studentId];
  const visited = new Set<string>([studentId]);

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const parents = parentsByChild.get(currentId) ?? [];
    for (const parentId of parents) {
      if (!visited.has(parentId)) {
        visited.add(parentId);
        ancestors.add(parentId);
        queue.push(parentId);
      }
    }
  }

  return ancestors;
}

/**
 * Recursively computes all academic descendants (godchildren, grand-godchildren, etc.)
 * of a given studentId by traversing directed edges forwards (godparent -> godchild).
 */
export function getDescendants(
  studentId: string,
  edges: ReadonlyArray<EdgeLike>
): Set<string> {
  const descendants = new Set<string>();
  if (!studentId) return descendants;

  const childrenByParent = new Map<string, string[]>();
  for (const rawEdge of edges) {
    const { godparentId, godchildId } = extractEdgeEndpoints(rawEdge);
    if (!godparentId || !godchildId) continue;

    const list = childrenByParent.get(godparentId);
    if (list) {
      list.push(godchildId);
    } else {
      childrenByParent.set(godparentId, [godchildId]);
    }
  }

  const queue: string[] = [studentId];
  const visited = new Set<string>([studentId]);

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const children = childrenByParent.get(currentId) ?? [];
    for (const childId of children) {
      if (!visited.has(childId)) {
        visited.add(childId);
        descendants.add(childId);
        queue.push(childId);
      }
    }
  }

  return descendants;
}

/**
 * Computes signed generational distance from `studentId`:
 * - `0` for `studentId`
 * - `-1, -2, ...` for ancestors (upward generations)
 * - `+1, +2, ...` for descendants (downward generations)
 */
export function getLineageDepths(
  studentId: string,
  edges: ReadonlyArray<EdgeLike>
): Map<string, number> {
  const depths = new Map<string, number>();
  if (!studentId) return depths;

  depths.set(studentId, 0);

  const parentsByChild = new Map<string, string[]>();
  const childrenByParent = new Map<string, string[]>();

  for (const rawEdge of edges) {
    const { godparentId, godchildId } = extractEdgeEndpoints(rawEdge);
    if (!godparentId || !godchildId) continue;

    const pList = parentsByChild.get(godchildId);
    if (pList) pList.push(godparentId);
    else parentsByChild.set(godchildId, [godparentId]);

    const cList = childrenByParent.get(godparentId);
    if (cList) cList.push(godchildId);
    else childrenByParent.set(godparentId, [godchildId]);
  }

  // Upward BFS for ancestors (negative depths)
  const upQueue: Array<{ id: string; depth: number }> = [{ id: studentId, depth: 0 }];
  const upVisited = new Set<string>([studentId]);
  while (upQueue.length > 0) {
    const { id, depth } = upQueue.shift()!;
    const parents = parentsByChild.get(id) ?? [];
    for (const parentId of parents) {
      if (!upVisited.has(parentId)) {
        upVisited.add(parentId);
        depths.set(parentId, depth - 1);
        upQueue.push({ id: parentId, depth: depth - 1 });
      }
    }
  }

  // Downward BFS for descendants (positive depths)
  const downQueue: Array<{ id: string; depth: number }> = [{ id: studentId, depth: 0 }];
  const downVisited = new Set<string>([studentId]);
  while (downQueue.length > 0) {
    const { id, depth } = downQueue.shift()!;
    const children = childrenByParent.get(id) ?? [];
    for (const childId of children) {
      if (!downVisited.has(childId)) {
        downVisited.add(childId);
        if (!depths.has(childId)) {
          depths.set(childId, depth + 1);
        }
        downQueue.push({ id: childId, depth: depth + 1 });
      }
    }
  }

  return depths;
}

export interface DirectStudentRelations {
  allGodparents: Array<{
    student: StudentNodeData;
    semester: CohortSemester;
    edgeId: string;
  }>;
  directGodchildren: Array<{
    student: StudentNodeData;
    semester: CohortSemester;
    edgeId: string;
  }>;
}

/**
 * Returns direct 1-hop godparents and direct godchildren for a student.
 */
export function getDirectRelations(
  studentId: string,
  nodes: ReadonlyArray<StudentNodeData>,
  edges: ReadonlyArray<SponsorshipEdgeData>
): DirectStudentRelations {
  const nodeMap = new Map<string, StudentNodeData>();
  for (const node of nodes) {
    nodeMap.set(node.id, node);
  }

  const allGodparents: DirectStudentRelations['allGodparents'] = [];
  const directGodchildren: DirectStudentRelations['directGodchildren'] = [];

  for (const edge of edges) {
    if (edge.godchildId === studentId) {
      const godparent = nodeMap.get(edge.godparentId);
      if (godparent) {
        allGodparents.push({
          student: godparent,
          semester: edge.semester,
          edgeId: edge.id,
        });
      }
    } else if (edge.godparentId === studentId) {
      const godchild = nodeMap.get(edge.godchildId);
      if (godchild) {
        directGodchildren.push({
          student: godchild,
          semester: edge.semester,
          edgeId: edge.id,
        });
      }
    }
  }

  return {
    allGodparents,
    directGodchildren,
  };
}

export interface LineageSubgraphResult {
  focusId: string;
  ancestors: Set<string>;
  descendants: Set<string>;
  lineageNodeIds: Set<string>;
  lineageEdgeIds: Set<string>;
  nodes: StudentNodeData[];
  edges: SponsorshipEdgeData[];
  depths: Map<string, number>;
}

/**
 * Extracts the complete Ego Lineage Subgraph for `studentId`:
 * `{studentId} ∪ Ancestors ∪ Descendants` along with the directed sponsorship edges
 * that form the upward ancestry paths and downward descendant paths of `studentId`.
 */
export function getLineageSubgraph(
  studentId: string,
  nodes: ReadonlyArray<StudentNodeData>,
  edges: ReadonlyArray<SponsorshipEdgeData>
): LineageSubgraphResult {
  const ancestors = getAncestors(studentId, edges);
  const descendants = getDescendants(studentId, edges);
  const depths = getLineageDepths(studentId, edges);

  const lineageNodeIds = new Set<string>();
  if (studentId) {
    lineageNodeIds.add(studentId);
  }
  for (const id of ancestors) lineageNodeIds.add(id);
  for (const id of descendants) lineageNodeIds.add(id);

  const upstreamSet = new Set<string>([studentId, ...ancestors]);
  const downstreamSet = new Set<string>([studentId, ...descendants]);

  const lineageEdges: SponsorshipEdgeData[] = [];
  const lineageEdgeIds = new Set<string>();

  for (const edge of edges) {
    const isUpstreamLink =
      upstreamSet.has(edge.godparentId) && upstreamSet.has(edge.godchildId);
    const isDownstreamLink =
      downstreamSet.has(edge.godparentId) && downstreamSet.has(edge.godchildId);

    if (isUpstreamLink || isDownstreamLink) {
      lineageEdges.push(edge);
      lineageEdgeIds.add(edge.id);
    }
  }

  const lineageNodes = nodes.filter((node) => lineageNodeIds.has(node.id));

  return {
    focusId: studentId,
    ancestors,
    descendants,
    lineageNodeIds,
    lineageEdgeIds,
    nodes: lineageNodes,
    edges: lineageEdges,
    depths,
  };
}

export interface TopGodparentMetric {
  student: StudentNodeData;
  directGodchildren: number;
  totalDescendants: number;
}

export interface LargestLineageMetric {
  rootStudent: StudentNodeData | null;
  size: number;
  descendantsCount: number;
  maxDepth: number;
  memberIds: string[];
}

export interface FamilyMetrics {
  totalStudents: number;
  totalSponsorships: number;
  sigaaVerifiedCount: number;
  sigaaVerifiedPercentage: number;
  generationCounts: Record<string, number>;
  topGodparents: TopGodparentMetric[];
  largestLineage: LargestLineageMetric;
  maxGenerationalDepth: number;
  activeGodparentsCount: number;
  connectedComponentsCount: number;
  largestComponentSize: number;
}

/**
 * Computes global genealogy & family size metrics across the CDIA DAG:
 * - Generation counts by cohort ('2024.1' -> '2026.1')
 * - Top godparents (direct godchildren & total recursive academic descendants)
 * - Largest academic lineage (founder/root student with the biggest descendant family tree)
 * - SIGAA verification statistics
 */
export function calculateFamilyMetrics(
  nodes: ReadonlyArray<StudentNodeData>,
  edges: ReadonlyArray<SponsorshipEdgeData>
): FamilyMetrics {
  const generationCounts: Record<string, number> = {};
  for (const cohort of COHORT_ORDER) {
    generationCounts[cohort] = 0;
  }

  let sigaaVerifiedCount = 0;
  for (const node of nodes) {
    generationCounts[node.cohort] = (generationCounts[node.cohort] ?? 0) + 1;
    if (node.sigaaVerified) {
      sigaaVerifiedCount += 1;
    }
  }

  const directCounts = new Map<string, number>();
  const undirectedAdj = new Map<string, Set<string>>();

  for (const node of nodes) {
    undirectedAdj.set(node.id, new Set<string>());
  }

  for (const edge of edges) {
    directCounts.set(
      edge.godparentId,
      (directCounts.get(edge.godparentId) ?? 0) + 1
    );

    if (!undirectedAdj.has(edge.godparentId)) {
      undirectedAdj.set(edge.godparentId, new Set<string>());
    }
    if (!undirectedAdj.has(edge.godchildId)) {
      undirectedAdj.set(edge.godchildId, new Set<string>());
    }
    undirectedAdj.get(edge.godparentId)!.add(edge.godchildId);
    undirectedAdj.get(edge.godchildId)!.add(edge.godparentId);
  }

  // Connected components (undirected academic families)
  const visitedComp = new Set<string>();
  let connectedComponentsCount = 0;
  let largestComponentSize = 0;

  for (const node of nodes) {
    if (visitedComp.has(node.id)) continue;
    connectedComponentsCount += 1;
    let compSize = 0;
    const queue = [node.id];
    visitedComp.add(node.id);
    while (queue.length > 0) {
      const curr = queue.shift()!;
      compSize += 1;
      const neighbors = undirectedAdj.get(curr);
      if (!neighbors) continue;
      for (const next of neighbors) {
        if (!visitedComp.has(next)) {
          visitedComp.add(next);
          queue.push(next);
        }
      }
    }
    if (compSize > largestComponentSize) {
      largestComponentSize = compSize;
    }
  }

  // Evaluate descendants and lineage depth for every student
  const topGodparentsAll: TopGodparentMetric[] = [];
  let largestLineage: LargestLineageMetric = {
    rootStudent: null,
    size: 0,
    descendantsCount: 0,
    maxDepth: 0,
    memberIds: [],
  };
  let maxGenerationalDepth = 0;

  for (const node of nodes) {
    const directTotal = directCounts.get(node.id) ?? 0;
    const descendants = getDescendants(node.id, edges);
    const depths = getLineageDepths(node.id, edges);

    let nodeMaxDownDepth = 0;
    for (const d of depths.values()) {
      if (d > nodeMaxDownDepth) {
        nodeMaxDownDepth = d;
      }
    }
    if (nodeMaxDownDepth > maxGenerationalDepth) {
      maxGenerationalDepth = nodeMaxDownDepth;
    }

    if (directTotal > 0 || descendants.size > 0) {
      topGodparentsAll.push({
        student: node,
        directGodchildren: directTotal,
        totalDescendants: descendants.size,
      });
    }

    const lineageSize = 1 + descendants.size;
    const isBetterRoot =
      descendants.size > largestLineage.descendantsCount ||
      (descendants.size === largestLineage.descendantsCount &&
        descendants.size > 0 &&
        directTotal >
          (directCounts.get(largestLineage.rootStudent?.id ?? '') ?? 0));

    if (isBetterRoot) {
      largestLineage = {
        rootStudent: node,
        size: lineageSize,
        descendantsCount: descendants.size,
        maxDepth: nodeMaxDownDepth,
        memberIds: [node.id, ...Array.from(descendants)],
      };
    }
  }

  topGodparentsAll.sort((a, b) => {
    if (b.totalDescendants !== a.totalDescendants) {
      return b.totalDescendants - a.totalDescendants;
    }
    if (b.directGodchildren !== a.directGodchildren) {
      return b.directGodchildren - a.directGodchildren;
    }
    return a.student.displayName.localeCompare(b.student.displayName, 'pt-BR');
  });

  const totalStudents = nodes.length;
  const sigaaVerifiedPercentage =
    totalStudents > 0 ? Math.round((sigaaVerifiedCount / totalStudents) * 1000) / 10 : 0;

  return {
    totalStudents,
    totalSponsorships: edges.length,
    sigaaVerifiedCount,
    sigaaVerifiedPercentage,
    generationCounts,
    topGodparents: topGodparentsAll.slice(0, 12),
    largestLineage,
    maxGenerationalDepth,
    activeGodparentsCount: topGodparentsAll.length,
    connectedComponentsCount,
    largestComponentSize,
  };
}

export interface CohortTierBand {
  cohort: CohortSemester;
  rank: number;
  theme: CohortTheme;
  studentCount: number;
  /** Primary axis coordinate (Y in TB mode, X in LR mode) */
  primaryCoord: number;
  /** Secondary axis min coordinate */
  minSecondaryCoord: number;
  /** Secondary axis max coordinate */
  maxSecondaryCoord: number;
}

export interface GraphLayoutOptions {
  direction?: LayoutDirection;
  cohortFilter?: CohortSemester | 'ALL';
  selectedStudentId?: string | null;
  lineageMode?: LineageMode;
  searchQuery?: string;
  nodeWidth?: number;
  nodeHeight?: number;
  nodeSep?: number;
  rankSep?: number;
}

export interface StratifiedLayoutResult {
  nodes: StudentFlowNode[];
  edges: SponsorshipFlowEdge[];
  tierBands: CohortTierBand[];
  activeLineage: LineageSubgraphResult | null;
  visibleStudentCount: number;
  visibleEdgeCount: number;
}

/**
 * Builds a stratified multi-generational DAG layout using `@dagrejs/dagre`
 * combined with custom cohort rank alignment ('2024.1' -> '2024.2' -> '2025.1' -> '2025.2' -> '2026.1')
 * so that students of the same cohort semester always align in clean horizontal (TB) or vertical (LR) tiers.
 */
export function buildStratifiedGraphLayout(
  rawNodes: ReadonlyArray<StudentNodeData>,
  rawEdges: ReadonlyArray<SponsorshipEdgeData>,
  options: GraphLayoutOptions = {}
): StratifiedLayoutResult {
  const {
    direction = 'TB',
    cohortFilter = 'ALL',
    selectedStudentId = null,
    lineageMode = 'HIGHLIGHT',
    searchQuery = '',
    nodeWidth = NODE_WIDTH,
    nodeHeight = NODE_HEIGHT,
    nodeSep = DEFAULT_NODE_SEP,
    rankSep = DEFAULT_RANK_SEP,
  } = options;

  const isHorizontal = direction === 'LR';
  const normalizedQuery = searchQuery
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // Precompute global node lookup and per-node sponsorship stats across full dataset
  const allNodeMap = new Map<string, StudentNodeData>();
  for (const n of rawNodes) {
    allNodeMap.set(n.id, n);
  }

  // Calculate active lineage subgraph if a student is selected
  const hasValidSelection =
    Boolean(selectedStudentId) && allNodeMap.has(selectedStudentId!);
  const activeLineage = hasValidSelection
    ? getLineageSubgraph(selectedStudentId!, rawNodes, rawEdges)
    : null;

  // Determine which nodes are visible on the canvas
  let visibleRawNodes = [...rawNodes];

  if (activeLineage && lineageMode === 'ISOLATE') {
    visibleRawNodes = visibleRawNodes.filter((n) =>
      activeLineage.lineageNodeIds.has(n.id)
    );
  }

  if (cohortFilter && cohortFilter !== 'ALL') {
    // When isolating a lineage, keep the lineage intact unless no student is selected;
    // when browsing by cohort filter, filter visible nodes to the chosen cohort (plus selected student if any)
    if (!(activeLineage && lineageMode === 'ISOLATE')) {
      visibleRawNodes = visibleRawNodes.filter(
        (n) => n.cohort === cohortFilter || n.id === selectedStudentId
      );
    }
  }

  const visibleNodeIdSet = new Set<string>(visibleRawNodes.map((n) => n.id));

  // Filter edges whose endpoints are both visible
  const visibleRawEdges = rawEdges.filter(
    (e) =>
      visibleNodeIdSet.has(e.godparentId) && visibleNodeIdSet.has(e.godchildId)
  );

  // Build Dagre graph for crossing minimization and initial relative ordering
  const g = new dagre.graphlib.Graph({ multigraph: true });
  g.setGraph({
    rankdir: direction,
    nodesep: nodeSep,
    ranksep: rankSep,
    edgesep: 20,
    marginx: 40,
    marginy: 40,
    ranker: 'network-simplex',
  });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of visibleRawNodes) {
    g.setNode(node.id, {
      width: nodeWidth,
      height: nodeHeight,
      cohortRank: getCohortRank(node.cohort),
    });
  }

  for (const edge of visibleRawEdges) {
    const sourceNode = allNodeMap.get(edge.godparentId);
    const targetNode = allNodeMap.get(edge.godchildId);
    const sourceRank = sourceNode ? getCohortRank(sourceNode.cohort) : 0;
    const targetRank = targetNode ? getCohortRank(targetNode.cohort) : 1;
    const rankDiff = Math.max(1, targetRank - sourceRank);

    g.setEdge(
      edge.godparentId,
      edge.godchildId,
      {
        weight: rankDiff === 1 ? 3 : 1,
        minlen: rankDiff,
      },
      edge.id
    );
  }

  if (visibleRawNodes.length > 0) {
    dagre.layout(g);
  }

  // Adjacency maps among visible nodes for barycenter alignment refinement
  const parentsMap = new Map<string, string[]>();
  const childrenMap = new Map<string, string[]>();
  for (const edge of visibleRawEdges) {
    const pList = parentsMap.get(edge.godchildId);
    if (pList) pList.push(edge.godparentId);
    else parentsMap.set(edge.godchildId, [edge.godparentId]);

    const cList = childrenMap.get(edge.godparentId);
    if (cList) cList.push(edge.godchildId);
    else childrenMap.set(edge.godparentId, [edge.godchildId]);
  }

  // Group visible nodes strictly by cohort rank so generations form horizontal/vertical tiers
  const nodesByRank = new Map<number, StudentNodeData[]>();
  for (const node of visibleRawNodes) {
    const rank = getCohortRank(node.cohort);
    const list = nodesByRank.get(rank);
    if (list) list.push(node);
    else nodesByRank.set(rank, [node]);
  }

  const sortedRanks = Array.from(nodesByRank.keys()).sort((a, b) => a - b);

  // Extract initial secondary coordinate from Dagre (X in TB mode, Y in LR mode)
  const secondaryCoord = new Map<string, number>();
  for (const node of visibleRawNodes) {
    const dagreNode = g.node(node.id);
    const initialSecondary = dagreNode
      ? isHorizontal
        ? dagreNode.y
        : dagreNode.x
      : 0;
    secondaryCoord.set(
      node.id,
      Number.isFinite(initialSecondary) ? initialSecondary : 0
    );
  }

  const secondarySpan = isHorizontal ? nodeHeight + nodeSep : nodeWidth + nodeSep;
  const primarySpan = isHorizontal ? nodeWidth + rankSep : nodeHeight + rankSep;

  // Helper to sort and assign centered, non-overlapping secondary coordinates for a single tier
  const assignTierPositions = (tierNodes: StudentNodeData[]) => {
    tierNodes.sort((a, b) => {
      const coordA = secondaryCoord.get(a.id) ?? 0;
      const coordB = secondaryCoord.get(b.id) ?? 0;
      if (Math.abs(coordA - coordB) > 1) {
        return coordA - coordB;
      }
      // Tie-break: connected nodes first, then alphabetical displayName
      const degA =
        (parentsMap.get(a.id)?.length ?? 0) + (childrenMap.get(a.id)?.length ?? 0);
      const degB =
        (parentsMap.get(b.id)?.length ?? 0) + (childrenMap.get(b.id)?.length ?? 0);
      if (degA !== degB) return degB - degA;
      return a.displayName.localeCompare(b.displayName, 'pt-BR');
    });

    const totalWidth = Math.max(0, (tierNodes.length - 1) * secondarySpan);
    const startOffset = -totalWidth / 2;
    for (let i = 0; i < tierNodes.length; i++) {
      secondaryCoord.set(tierNodes[i].id, startOffset + i * secondarySpan);
    }
  };

  // Initial tier assignment based on Dagre ordering
  for (const rank of sortedRanks) {
    const tierNodes = nodesByRank.get(rank)!;
    assignTierPositions(tierNodes);
  }

  // Two-pass Barycenter sweep (top-down then bottom-up) across cohort tiers to minimize edge crossings
  for (let pass = 0; pass < 2; pass++) {
    // Top-down sweep: pull children toward average position of their godparents
    for (const rank of sortedRanks) {
      const tierNodes = nodesByRank.get(rank)!;
      for (const node of tierNodes) {
        const parents = parentsMap.get(node.id);
        if (parents && parents.length > 0) {
          const avgParent =
            parents.reduce((acc, pid) => acc + (secondaryCoord.get(pid) ?? 0), 0) /
            parents.length;
          const current = secondaryCoord.get(node.id) ?? 0;
          secondaryCoord.set(node.id, current * 0.35 + avgParent * 0.65);
        }
      }
      assignTierPositions(tierNodes);
    }

    // Bottom-up sweep: align godparents toward average position of their godchildren
    for (let i = sortedRanks.length - 1; i >= 0; i--) {
      const rank = sortedRanks[i];
      const tierNodes = nodesByRank.get(rank)!;
      for (const node of tierNodes) {
        const children = childrenMap.get(node.id);
        if (children && children.length > 0) {
          const avgChild =
            children.reduce((acc, cid) => acc + (secondaryCoord.get(cid) ?? 0), 0) /
            children.length;
          const current = secondaryCoord.get(node.id) ?? 0;
          secondaryCoord.set(node.id, current * 0.4 + avgChild * 0.6);
        }
      }
      assignTierPositions(tierNodes);
    }
  }

  // Build final React Flow nodes and cohort tier metadata bands
  const flowNodes: StudentFlowNode[] = [];
  const tierBands: CohortTierBand[] = [];

  for (let tierIdx = 0; tierIdx < sortedRanks.length; tierIdx++) {
    const rank = sortedRanks[tierIdx];
    const tierNodes = nodesByRank.get(rank)!;
    if (tierNodes.length === 0) continue;

    // Preserve visual cohort gap based on actual rank index when all cohorts are shown,
    // or compact index when isolating a sparse subset
    const effectiveTierStep =
      (activeLineage && lineageMode === 'ISOLATE') ||
      (cohortFilter && cohortFilter !== 'ALL')
        ? tierIdx
        : rank;
    const primaryCoord = effectiveTierStep * primarySpan;

    let minSecondary = Infinity;
    let maxSecondary = -Infinity;

    for (const student of tierNodes) {
      const sec = secondaryCoord.get(student.id) ?? 0;
      if (sec < minSecondary) minSecondary = sec;
      if (sec > maxSecondary) maxSecondary = sec;

      const x = isHorizontal ? primaryCoord : sec;
      const y = isHorizontal ? sec : primaryCoord;

      const direct = getDirectRelations(student.id, rawNodes, rawEdges);
      const ancestors = getAncestors(student.id, rawEdges);
      const descendants = getDescendants(student.id, rawEdges);

      const isSelected = student.id === selectedStudentId;
      const isAncestor = activeLineage ? activeLineage.ancestors.has(student.id) : false;
      const isDescendant = activeLineage
        ? activeLineage.descendants.has(student.id)
        : false;
      const isInLineage = activeLineage
        ? activeLineage.lineageNodeIds.has(student.id)
        : false;

      let lineageRelation: LineageRelation = 'NONE';
      if (isSelected) lineageRelation = 'SELF';
      else if (isAncestor) lineageRelation = 'ANCESTOR';
      else if (isDescendant) lineageRelation = 'DESCENDANT';

      const lineageDepth = activeLineage?.depths.get(student.id);

      const isSearchMatch =
        normalizedQuery.length > 0
          ? [
              student.displayName,
              student.canonicalName,
              student.matricula ?? '',
              ...student.aliases,
            ]
              .join(' ')
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .includes(normalizedQuery)
          : false;

      const isDimmed =
        activeLineage && lineageMode === 'HIGHLIGHT'
          ? !isInLineage
          : normalizedQuery.length > 0
            ? !isSearchMatch
            : false;

      flowNodes.push({
        id: student.id,
        type: 'student',
        position: { x, y },
        sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
        targetPosition: isHorizontal ? Position.Left : Position.Top,
        selected: isSelected,
        zIndex: isSelected ? 50 : isInLineage ? 40 : 20,
        data: {
          ...student,
          godparents: direct.allGodparents.map((g) => g.student),
          godparentsCount: direct.allGodparents.length,
          godchildrenCount: direct.directGodchildren.length,
          ancestorsCount: ancestors.size,
          descendantsCount: descendants.size,
          direction,
          tierRank: rank,
          isSelected,
          isAncestor,
          isDescendant,
          isInLineage,
          isDimmed,
          isSearchMatch,
          lineageRelation,
          lineageDepth,
        },
      });
    }

    const sampleCohort = tierNodes[0].cohort;
    tierBands.push({
      cohort: sampleCohort,
      rank,
      theme: getCohortTheme(sampleCohort),
      studentCount: tierNodes.length,
      primaryCoord,
      minSecondaryCoord: Number.isFinite(minSecondary) ? minSecondary : 0,
      maxSecondaryCoord: Number.isFinite(maxSecondary)
        ? maxSecondary + (isHorizontal ? nodeHeight : nodeWidth)
        : isHorizontal
          ? nodeHeight
          : nodeWidth,
    });
  }

  // Precompute per-edge fan-out offsets so edges leaving the same godparent
  // or entering the same godchild never stack on the same collinear path
  const outgoingByParent = new Map<string, SponsorshipEdgeData[]>();
  const incomingByChild = new Map<string, SponsorshipEdgeData[]>();

  for (const edge of visibleRawEdges) {
    const outList = outgoingByParent.get(edge.godparentId);
    if (outList) outList.push(edge);
    else outgoingByParent.set(edge.godparentId, [edge]);

    const inList = incomingByChild.get(edge.godchildId);
    if (inList) inList.push(edge);
    else incomingByChild.set(edge.godchildId, [edge]);
  }

  const edgeSourceOffset = new Map<string, number>();
  const edgeTargetOffset = new Map<string, number>();

  for (const [, outEdges] of outgoingByParent) {
    outEdges.sort(
      (a, b) =>
        (secondaryCoord.get(a.godchildId) ?? 0) -
        (secondaryCoord.get(b.godchildId) ?? 0)
    );
    const k = outEdges.length;
    for (let i = 0; i < k; i++) {
      edgeSourceOffset.set(outEdges[i].id, i - (k - 1) / 2);
    }
  }

  for (const [, inEdges] of incomingByChild) {
    inEdges.sort(
      (a, b) =>
        (secondaryCoord.get(a.godparentId) ?? 0) -
        (secondaryCoord.get(b.godparentId) ?? 0)
    );
    const m = inEdges.length;
    for (let j = 0; j < m; j++) {
      edgeTargetOffset.set(inEdges[j].id, j - (m - 1) / 2);
    }
  }

  const upstreamNodeSet = activeLineage
    ? new Set<string>([activeLineage.focusId, ...activeLineage.ancestors])
    : null;
  const downstreamNodeSet = activeLineage
    ? new Set<string>([activeLineage.focusId, ...activeLineage.descendants])
    : null;

  // Build React Flow custom edges ('sponsorship')
  const flowEdges: SponsorshipFlowEdge[] = visibleRawEdges.map((edge, idx) => {
    const isHighlighted = activeLineage
      ? activeLineage.lineageEdgeIds.has(edge.id)
      : false;
    const isDimmed =
      activeLineage && lineageMode === 'HIGHLIGHT' ? !isHighlighted : false;

    let lineageSegment: EdgeLineageSegment = 'NONE';
    if (isHighlighted && activeLineage) {
      if (
        upstreamNodeSet?.has(edge.godparentId) &&
        upstreamNodeSet?.has(edge.godchildId)
      ) {
        lineageSegment = 'UPSTREAM';
      } else if (
        downstreamNodeSet?.has(edge.godparentId) &&
        downstreamNodeSet?.has(edge.godchildId)
      ) {
        lineageSegment = 'DOWNSTREAM';
      }
    }

    const srcOff = edgeSourceOffset.get(edge.id) ?? 0;
    const tgtOff = edgeTargetOffset.get(edge.id) ?? 0;
    const microSpread = ((idx % 5) - 2) * 0.25;
    const parallelOffset = srcOff * 0.9 + tgtOff * 0.9 + microSpread;

    const godparent = allNodeMap.get(edge.godparentId);
    const godchild = allNodeMap.get(edge.godchildId);

    return {
      id: edge.id,
      type: 'sponsorship',
      source: edge.godparentId,
      target: edge.godchildId,
      animated: false,
      zIndex: isHighlighted ? 15 : 1,
      data: {
        ...edge,
        godparentName: godparent?.displayName ?? edge.godparentId,
        godchildName: godchild?.displayName ?? edge.godchildId,
        isHighlighted,
        isDimmed,
        hasSelection: Boolean(activeLineage),
        lineageSegment,
        parallelOffset,
        sourceOffset: srcOff,
        targetOffset: tgtOff,
        curvatureOffset: parallelOffset,
        direction,
      },
    };
  });

  return {
    nodes: flowNodes,
    edges: flowEdges,
    tierBands,
    activeLineage,
    visibleStudentCount: flowNodes.length,
    visibleEdgeCount: flowEdges.length,
  };
}
