'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type EdgeTypes,
  type NodeMouseHandler,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Crown, Info, Map as MapIcon, Sparkles, Users } from 'lucide-react';
import type {
  CohortSemester,
  SponsorshipEdgeData,
  StudentNodeData,
} from '../../data/types';
import {
  buildStratifiedGraphLayout,
  calculateFamilyMetrics,
  COHORT_ORDER,
  getCohortTheme,
  NODE_HEIGHT,
  NODE_WIDTH,
  type LayoutDirection,
  type LineageMode,
  type RoleFilter,
  type SponsorshipFlowEdge,
  type StudentFlowNode,
} from '../../lib/graph-layout';
import { SponsorshipEdge } from './SponsorshipEdge';
import { StudentNode } from './StudentNode';
import { TreeControls } from './TreeControls';

const NODE_TYPES: NodeTypes = {
  student: StudentNode,
};

const EDGE_TYPES: EdgeTypes = {
  sponsorship: SponsorshipEdge,
};

export interface FamilyTreeCanvasProps {
  /** Canonical list of student nodes */
  students?: StudentNodeData[];
  /** Alias for students if passed as nodes */
  nodes?: StudentNodeData[];
  /** Canonical list of directed sponsorship edges */
  sponsorships?: SponsorshipEdgeData[];
  /** Alias for sponsorships if passed as edges */
  edges?: SponsorshipEdgeData[];
  /** Currently selected student ID (controlled mode) */
  selectedStudentId?: string | null;
  /** Callback when a student node is selected or cleared */
  onSelectStudent?: (student: StudentNodeData | null) => void;
  /** Optional callback alias passing only the clicked student */
  onStudentClick?: (student: StudentNodeData) => void;
  /** Optional callback alias passing the selected student ID */
  onNodeSelect?: (studentId: string | null) => void;
  /** Controlled role filter ('ALL' | 'P2' | 'VETERANO') */
  roleFilter?: RoleFilter;
  onRoleFilterChange?: (role: RoleFilter) => void;
  /** Controlled cohort filter ('ALL' | '2024.1' .. '2026.1') */
  cohortFilter?: CohortSemester | 'ALL';
  onCohortFilterChange?: (cohort: CohortSemester | 'ALL') => void;
  /** Controlled DAG layout orientation ('TB' | 'LR') */
  direction?: LayoutDirection;
  onDirectionChange?: (direction: LayoutDirection) => void;
  /** Controlled lineage mode ('HIGHLIGHT' | 'ISOLATE') */
  lineageMode?: LineageMode;
  onLineageModeChange?: (mode: LineageMode) => void;
  /** Optional search highlight string */
  searchQuery?: string;
  /** Whether to show the floating TreeControls bar inside the canvas (default: true) */
  showControls?: boolean;
  /** Whether to show the MiniMap in bottom-right by default (default: false for smooth 60fps panning) */
  showMiniMap?: boolean;
  /** Additional container className */
  className?: string;
}

function FamilyTreeCanvasInner({
  students,
  nodes: nodesProp,
  sponsorships,
  edges: edgesProp,
  selectedStudentId: controlledSelectedId,
  onSelectStudent,
  onStudentClick,
  onNodeSelect,
  roleFilter: controlledRoleFilter,
  onRoleFilterChange,
  cohortFilter: controlledCohortFilter,
  onCohortFilterChange,
  direction: controlledDirection,
  onDirectionChange,
  lineageMode: controlledLineageMode,
  onLineageModeChange,
  searchQuery = '',
  showControls = true,
  showMiniMap = false,
  className = '',
}: FamilyTreeCanvasProps) {
  const rawStudents = useMemo(
    () => students ?? nodesProp ?? [],
    [students, nodesProp]
  );
  const rawSponsorships = useMemo(
    () => sponsorships ?? edgesProp ?? [],
    [sponsorships, edgesProp]
  );

  // Support both controlled and uncontrolled state for filters & selection
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(
    controlledSelectedId ?? null
  );
  const [internalRoleFilter, setInternalRoleFilter] = useState<RoleFilter>(
    controlledRoleFilter ?? 'ALL'
  );
  const [internalCohortFilter, setInternalCohortFilter] = useState<
    CohortSemester | 'ALL'
  >(controlledCohortFilter ?? 'ALL');
  const [internalDirection, setInternalDirection] = useState<LayoutDirection>(
    controlledDirection ?? 'TB'
  );
  const [internalLineageMode, setInternalLineageMode] = useState<LineageMode>(
    controlledLineageMode ?? 'HIGHLIGHT'
  );
  const [miniMapVisible, setMiniMapVisible] = useState<boolean>(showMiniMap);

  const activeSelectedId =
    controlledSelectedId !== undefined ? controlledSelectedId : internalSelectedId;
  const activeRoleFilter =
    controlledRoleFilter !== undefined ? controlledRoleFilter : internalRoleFilter;
  const activeCohortFilter =
    controlledCohortFilter !== undefined
      ? controlledCohortFilter
      : internalCohortFilter;
  const activeDirection =
    controlledDirection !== undefined ? controlledDirection : internalDirection;
  const activeLineageMode =
    controlledLineageMode !== undefined
      ? controlledLineageMode
      : internalLineageMode;

  const handleRoleChange = useCallback(
    (nextRole: RoleFilter) => {
      setInternalRoleFilter(nextRole);
      onRoleFilterChange?.(nextRole);
    },
    [onRoleFilterChange]
  );

  const handleCohortChange = useCallback(
    (nextCohort: CohortSemester | 'ALL') => {
      setInternalCohortFilter(nextCohort);
      onCohortFilterChange?.(nextCohort);
    },
    [onCohortFilterChange]
  );

  const handleDirectionChange = useCallback(
    (nextDir: LayoutDirection) => {
      setInternalDirection(nextDir);
      onDirectionChange?.(nextDir);
    },
    [onDirectionChange]
  );

  const handleLineageModeChange = useCallback(
    (nextMode: LineageMode) => {
      setInternalLineageMode(nextMode);
      onLineageModeChange?.(nextMode);
    },
    [onLineageModeChange]
  );

  const studentMap = useMemo(() => {
    const map = new Map<string, StudentNodeData>();
    for (const s of rawStudents) {
      map.set(s.id, s);
    }
    return map;
  }, [rawStudents]);

  const selectedStudent = useMemo(
    () => (activeSelectedId ? studentMap.get(activeSelectedId) ?? null : null),
    [activeSelectedId, studentMap]
  );

  const familyMetrics = useMemo(
    () => calculateFamilyMetrics(rawStudents, rawSponsorships),
    [rawStudents, rawSponsorships]
  );

  // Compute stratified DAG layout and lineage highlighting
  const layoutResult = useMemo(
    () =>
      buildStratifiedGraphLayout(rawStudents, rawSponsorships, {
        direction: activeDirection,
        roleFilter: activeRoleFilter,
        cohortFilter: activeCohortFilter,
        selectedStudentId: activeSelectedId,
        lineageMode: activeLineageMode,
        searchQuery,
      }),
    [
      rawStudents,
      rawSponsorships,
      activeDirection,
      activeRoleFilter,
      activeCohortFilter,
      activeSelectedId,
      activeLineageMode,
      searchQuery,
    ]
  );

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState<StudentFlowNode>(
    layoutResult.nodes
  );
  const [flowEdges, setFlowEdges, onEdgesChange] =
    useEdgesState<SponsorshipFlowEdge>(layoutResult.edges);

  const reactFlow = useReactFlow<StudentFlowNode, SponsorshipFlowEdge>();
  const prevSelectedIdRef = useRef<string | null>(null);
  const prevLayoutKeyRef = useRef<string>('');

  // Sync computed layout nodes and edges into React Flow state
  useEffect(() => {
    setFlowNodes(layoutResult.nodes);
    setFlowEdges(layoutResult.edges);
  }, [layoutResult.nodes, layoutResult.edges, setFlowNodes, setFlowEdges]);

  // Center or fitView smoothly when selection or layout orientation/isolation changes
  const centerOnStudent = useCallback(
    (targetId: string) => {
      const targetNode = layoutResult.nodes.find((n) => n.id === targetId);
      if (!targetNode) return;

      if (activeLineageMode === 'ISOLATE') {
        window.requestAnimationFrame(() => {
          reactFlow.fitView({
            padding: 0.22,
            duration: 400,
            maxZoom: 1.15,
          });
        });
      } else {
        const centerX = targetNode.position.x + NODE_WIDTH / 2;
        const centerY = targetNode.position.y + NODE_HEIGHT / 2;
        window.requestAnimationFrame(() => {
          reactFlow.setCenter(centerX, centerY, {
            zoom: Math.max(reactFlow.getZoom(), 0.85),
            duration: 450,
          });
        });
      }
    },
    [layoutResult.nodes, activeLineageMode, reactFlow]
  );

  useEffect(() => {
    const layoutKey = `${activeDirection}:${activeCohortFilter}:${activeLineageMode}`;
    const selectionChanged = activeSelectedId !== prevSelectedIdRef.current;
    const layoutChanged = layoutKey !== prevLayoutKeyRef.current;

    prevSelectedIdRef.current = activeSelectedId ?? null;
    prevLayoutKeyRef.current = layoutKey;

    if (activeSelectedId && (selectionChanged || activeLineageMode === 'ISOLATE')) {
      const timer = window.setTimeout(() => {
        centerOnStudent(activeSelectedId);
      }, 30);
      return () => window.clearTimeout(timer);
    }

    if (layoutChanged) {
      const timer = window.setTimeout(() => {
        reactFlow.fitView({
          padding: 0.16,
          duration: 380,
          maxZoom: 1.1,
        });
      }, 30);
      return () => window.clearTimeout(timer);
    }
  }, [
    activeSelectedId,
    activeDirection,
    activeCohortFilter,
    activeLineageMode,
    centerOnStudent,
    reactFlow,
  ]);

  const handleSelectStudent = useCallback(
    (student: StudentNodeData | null) => {
      const nextId = student?.id ?? null;
      setInternalSelectedId(nextId);
      onSelectStudent?.(student);
      onNodeSelect?.(nextId);
      if (student) {
        onStudentClick?.(student);
      }
    },
    [onSelectStudent, onNodeSelect, onStudentClick]
  );

  const handleNodeClick: NodeMouseHandler<StudentFlowNode> = useCallback(
    (_event, node) => {
      const student = studentMap.get(node.id) ?? node.data;
      handleSelectStudent(student);
    },
    [studentMap, handleSelectStudent]
  );

  const handlePaneClick = useCallback(() => {
    if (activeSelectedId) {
      handleSelectStudent(null);
    }
  }, [activeSelectedId, handleSelectStudent]);

  const handleFitView = useCallback(() => {
    reactFlow.fitView({
      padding: 0.16,
      duration: 400,
      maxZoom: 1.15,
    });
  }, [reactFlow]);

  const handleCenterSelected = useCallback(() => {
    if (activeSelectedId) {
      centerOnStudent(activeSelectedId);
    }
  }, [activeSelectedId, centerOnStudent]);

  const minimapNodeColor = useCallback((node: StudentFlowNode) => {
    if (node.data?.isSelected) return '#0284c7';
    if (node.data?.isDimmed) return '#94a3b8';
    return getCohortTheme(node.data?.cohort ?? '2025.2').minimapColor;
  }, []);

  const ancestorsCount = layoutResult.activeLineage?.ancestors.size ?? 0;
  const descendantsCount = layoutResult.activeLineage?.descendants.size ?? 0;

  return (
    <div
      data-testid="family-tree-canvas"
      className={`relative h-[740px] w-full min-h-[620px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/90 dark:border-slate-800/80 dark:bg-slate-950 ${className}`}
    >
      {/* Subtle Ocean Radial Backdrop (Light & Dark aware) */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-500/8 via-cyan-500/4 to-transparent dark:from-sky-500/10 dark:via-cyan-500/5" />

      <div className="absolute inset-0 h-full w-full">
        <ReactFlow<StudentFlowNode, SponsorshipFlowEdge>
          nodes={flowNodes}
          edges={flowEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          nodeTypes={NODE_TYPES}
          edgeTypes={EDGE_TYPES}
          onlyRenderVisibleElements
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          nodesFocusable={false}
          edgesFocusable={false}
          selectNodesOnDrag={false}
          fitView
          fitViewOptions={{
            padding: 0.16,
            maxZoom: 1.1,
          }}
          minZoom={0.12}
          maxZoom={2.2}
          defaultEdgeOptions={{
            type: 'sponsorship',
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 14,
              height: 14,
              color: '#0ea5e9',
            },
          }}
          proOptions={{ hideAttribution: true }}
          style={{ width: '100%', height: '100%' }}
          className="h-full w-full bg-transparent"
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1.25}
            color="#94a3b8"
            className="opacity-45 dark:opacity-25"
          />

          {/* Floating Top Filter & Lineage Controls Bar */}
          {showControls && (
            <Panel
              position="top-left"
              className="!m-2.5 max-w-[calc(100%-1.25rem)]"
            >
              <TreeControls
                roleFilter={activeRoleFilter}
                onRoleFilterChange={handleRoleChange}
                cohortFilter={activeCohortFilter}
                onCohortFilterChange={handleCohortChange}
                direction={activeDirection}
                onDirectionChange={handleDirectionChange}
                lineageMode={activeLineageMode}
                onLineageModeChange={handleLineageModeChange}
                selectedStudent={selectedStudent}
                ancestorsCount={ancestorsCount}
                descendantsCount={descendantsCount}
                onClearSelection={() => handleSelectStudent(null)}
                onFitView={handleFitView}
                onCenterSelected={handleCenterSelected}
                generationCounts={familyMetrics.generationCounts}
                visibleStudentsCount={layoutResult.visibleStudentCount}
                visibleEdgesCount={layoutResult.visibleEdgeCount}
                totalStudentsCount={rawStudents.length}
              />
            </Panel>
          )}

          {/* Bottom-Left Compact Aquário Legend & Lineage Insights */}
          <Panel position="bottom-left" className="!m-3 hidden md:block">
            <div className="pointer-events-auto flex flex-col gap-2 rounded-xl border border-slate-200 bg-white/95 px-3.5 py-2.5 text-[11px] text-slate-700 shadow-lg dark:border-slate-800 dark:bg-slate-950/90 dark:text-slate-300 dark:shadow-xl">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-0.5 w-5 rounded-full bg-emerald-500" />
                  <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                    Ancestrais (Padrinhos)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-0.5 w-5 rounded-full bg-sky-500 dark:bg-sky-400" />
                  <span className="font-semibold text-sky-700 dark:text-sky-300">
                    Descendentes (Afilhados)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <Info className="h-3.5 w-3.5 text-sky-600 dark:text-cyan-400" />
                  <span>Clique em um aluno para destacar sua linhagem</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMiniMapVisible((v) => !v)}
                  className={`ml-auto inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium transition-colors ${
                    miniMapVisible
                      ? 'border-sky-500/40 bg-sky-500/15 text-sky-700 dark:text-sky-300'
                      : 'border-slate-200 bg-slate-100 text-slate-600 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                  title="Alternar exibição do MiniMapa"
                >
                  <MapIcon className="h-3 w-3" />
                  <span>MiniMapa</span>
                </button>
              </div>

              {/* Generation Tier Quick Legend + Largest Lineage Highlight */}
              <div className="flex flex-wrap items-center gap-2 border-t border-slate-200/80 dark:border-slate-800/75 pt-1.5 text-[10px]">
                {COHORT_ORDER.map((cohort) => {
                  const theme = getCohortTheme(cohort);
                  return (
                    <span
                      key={cohort}
                      className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400"
                    >
                      <span className={`h-2 w-2 rounded-full ${theme.dotClass}`} />
                      <span>{cohort}</span>
                    </span>
                  );
                })}

                {familyMetrics.largestLineage.rootStudent && (
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectStudent(familyMetrics.largestLineage.rootStudent)
                    }
                    className="ml-2 inline-flex items-center gap-1 rounded-md border border-amber-600/45 bg-amber-100/90 px-2.5 py-0.5 text-[10px] font-bold text-amber-950 hover:bg-amber-200/90 dark:border-amber-500/35 dark:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-500/25 transition-colors"
                    title="Focar na maior linhagem acadêmica do curso"
                  >
                    <Crown className="h-3 w-3 text-amber-700 dark:text-amber-400" />
                    <span>
                      Maior Linhagem:{' '}
                      {familyMetrics.largestLineage.rootStudent.displayName} (+
                      {familyMetrics.largestLineage.descendantsCount})
                    </span>
                  </button>
                )}
              </div>
            </div>
          </Panel>

          <Controls
            position="bottom-right"
            showInteractive={false}
            className="!mb-3 !mr-3 !overflow-hidden !rounded-xl !border !border-slate-200 !bg-white/95 !shadow-lg dark:!border-slate-800 dark:!bg-slate-900/90 [&>button]:!border-slate-200 [&>button]:!bg-white [&>button]:!fill-slate-700 [&>button:hover]:!bg-slate-100 dark:[&>button]:!border-slate-800 dark:[&>button]:!bg-slate-900/90 dark:[&>button]:!fill-slate-200 dark:[&>button:hover]:!bg-slate-800"
          />

          {miniMapVisible && (
            <MiniMap<StudentFlowNode>
              position="bottom-right"
              nodeColor={minimapNodeColor}
              nodeStrokeWidth={2}
              maskColor="rgba(15, 23, 42, 0.18)"
              pannable
              zoomable
              className="!mb-3 !mr-14 hidden sm:block !h-32 !w-48 !overflow-hidden !rounded-xl !border !border-slate-200 !bg-white/95 !shadow-xl dark:!border-slate-800/90 dark:!bg-slate-950/90"
            />
          )}
        </ReactFlow>
      </div>

      {/* Empty State Overlay if filtered result has 0 nodes */}
      {layoutResult.visibleStudentCount === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
          <div className="pointer-events-auto flex max-w-md flex-col items-center rounded-2xl border border-slate-200 bg-white/95 p-6 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900/95">
            <Users className="mb-3 h-10 w-10 text-sky-600 dark:text-sky-400/80" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Nenhum estudante encontrado para os filtros atuais
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Experimente limpar o filtro de geração para visualizar toda a árvore
              genealógica de CDIA.
            </p>
            <button
              type="button"
              onClick={() => {
                handleRoleChange('ALL');
                handleCohortChange('ALL');
                handleLineageModeChange('HIGHLIGHT');
                handleSelectStudent(null);
              }}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-sky-500/15 border border-sky-500/40 px-3.5 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-500/25 dark:bg-sky-500/20 dark:border-sky-400/40 dark:text-sky-300 dark:hover:bg-sky-500/30 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Restaurar Árvore Completa
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function FamilyTreeCanvas(props: FamilyTreeCanvasProps) {
  return (
    <ReactFlowProvider>
      <FamilyTreeCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

export default FamilyTreeCanvas;
