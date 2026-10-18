import { create } from "zustand";
import { CameraState, CanvasMode, BEATS, US_OVERVIEW, Beat } from "./choreography";
import { LayerId } from "./layers";
import { runSolve, SolveStage } from "./solve";
import { runQuery, NlqResult } from "./nlq";
import { KpiSet, LedgerEntry } from "./types";
import { BASELINE_KPI } from "./constants";
import { SCENARIO_BY_ID } from "@/data/scenarios";
import { SOLVE_BY_SCENARIO } from "@/data/solves";
import { NODE_BY_ID } from "@/data/network";
import { HERO_BATCH_ID } from "@/data/inventory";
import { appendLedger, resetSessionLedger } from "@/data/ledger";
import { ScreenKind } from "@/data/atlas";

export interface ScreenState {
  kind: ScreenKind;
  id?: string;
  sub?: string;
}

export interface CommitInput {
  objectId: string;
  objectLabel: string;
  title: string;
  expectedValue: number;
  status?: "recommended" | "approved" | "overridden" | "executed";
  actor?: string;
  rationale?: string;
  kpi?: Partial<Record<keyof KpiSet, number>>; // signed deltas applied to the strip
  nodeRiskDelta?: { nodeId: string; delta: number };
  laneFlow?: string; // lane id to light up as a committed flow on the twin
}

export type RiskTierFilter = "low" | "med" | "high" | "crit" | null;

interface StoreState {
  // camera + canvas mode
  camera: CameraState;
  setCamera: (c: Partial<CameraState>) => void;
  flyTo: (c: CameraState) => void;
  cameraNonce: number; // bump to force deck.gl transition

  mode: CanvasMode;
  setMode: (m: CanvasMode) => void;
  toggleMode: () => void;

  // layers
  activeLayers: LayerId[];
  toggleLayer: (id: LayerId) => void;
  setLayers: (ids: LayerId[]) => void;

  // legend isolation
  isolatedTier: RiskTierFilter;
  setIsolatedTier: (t: RiskTierFilter) => void;

  // selection / inspector
  selectedNodeId: string | null;
  selectedLaneId: string | null;
  selectedBatchId: string | null;
  inspectorTab: string;
  hoveredNodeId: string | null;
  selectNode: (id: string | null) => void;
  selectLane: (id: string | null) => void;
  selectBatch: (id: string | null, nodeId?: string) => void;
  setInspectorTab: (t: string) => void;
  setHovered: (id: string | null) => void;
  closeInspector: () => void;

  // scenario / disruption
  activeScenarioId: string | null;
  fireScenario: (id: string) => void;
  clearScenario: () => void;

  // solve
  solveStage: SolveStage;
  solveScenarioId: string | null;
  startSolve: (scenarioId?: string) => void;
  resetSolve: () => void;
  _cancelSolve?: () => void;

  // twin clock
  clockWeek: number;
  setClockWeek: (w: number) => void;

  // overlays
  commandBarOpen: boolean;
  setCommandBar: (b: boolean) => void;
  helpOpen: boolean;
  setHelp: (b: boolean) => void;
  nlqOpen: boolean;
  setNlq: (b: boolean) => void;
  nlqResult: NlqResult | null;
  runNlq: (q: string) => void;
  loopOpen: boolean;
  setLoop: (b: boolean) => void;
  closeOverlay: boolean;
  ghostPanels: boolean;
  unifiedCard: boolean;
  scenarioRailOpen: boolean;
  setScenarioRail: (b: boolean) => void;

  // presenter mode
  presenterMode: boolean;
  beatIndex: number;
  enterPresenter: () => void;
  exitPresenter: () => void;
  nextBeat: () => void;
  prevBeat: () => void;
  applyBeat: (b: Beat) => void;

  // deep-dive screens
  activeScreen: ScreenState | null;
  openScreen: (kind: ScreenKind, id?: string, sub?: string) => void;
  closeScreen: () => void;

  // commit pipeline + session state
  sessionLedger: LedgerEntry[];
  kpiDelta: Partial<Record<keyof KpiSet, number>>;
  nodeRiskDelta: Record<string, number>;
  committedFlows: string[];
  twinRevision: number;
  _nodeRestore?: Record<string, { composite: number; line?: number }>;
  commitDecision: (input: CommitInput) => LedgerEntry;
  resetAll: () => void;

  // auto-demo (drives the real controls like a user clicking)
  autoDemo: boolean;
  autoPaused: boolean;
  startAutoDemo: () => void;
  stopAutoDemo: () => void;
  setAutoPaused: (b: boolean) => void;

  // derived
  currentKpi: () => KpiSet;
}

export const useStore = create<StoreState>((set, get) => ({
  camera: { ...US_OVERVIEW },
  cameraNonce: 0,
  setCamera: (c) => set((s) => ({ camera: { ...s.camera, ...c } })),
  flyTo: (c) => set((s) => ({ camera: { ...c }, cameraNonce: s.cameraNonce + 1 })),

  mode: "geo",
  setMode: (m) => set({ mode: m }),
  toggleMode: () => set((s) => ({ mode: s.mode === "geo" ? "ontology" : "geo" })),

  activeLayers: ["flows"],
  toggleLayer: (id) =>
    set((s) => {
      if (s.activeLayers.includes(id)) {
        return { activeLayers: s.activeLayers.filter((x) => x !== id) };
      }
      // at most two coexist; a third replaces the oldest
      const next = [...s.activeLayers, id];
      return { activeLayers: next.slice(Math.max(0, next.length - 2)) };
    }),
  setLayers: (ids) => set({ activeLayers: ids.slice(0, 2) }),

  isolatedTier: null,
  setIsolatedTier: (t) => set((s) => ({ isolatedTier: s.isolatedTier === t ? null : t })),

  selectedNodeId: null,
  selectedLaneId: null,
  selectedBatchId: null,
  inspectorTab: "State",
  hoveredNodeId: null,
  selectNode: (id) =>
    set({ selectedNodeId: id, selectedLaneId: null, selectedBatchId: null }),
  selectLane: (id) =>
    set({ selectedLaneId: id, selectedNodeId: null, selectedBatchId: null }),
  selectBatch: (id, nodeId) =>
    set((s) => ({
      selectedBatchId: id,
      selectedNodeId: nodeId ?? s.selectedNodeId,
      inspectorTab: "Risk",
    })),
  setInspectorTab: (t) => set({ inspectorTab: t }),
  setHovered: (id) => set({ hoveredNodeId: id }),
  closeInspector: () =>
    set({ selectedNodeId: null, selectedLaneId: null, selectedBatchId: null }),

  activeScenarioId: null,
  fireScenario: (id) => {
    const scn = SCENARIO_BY_ID[id];
    if (!scn) return;
    set({ activeScenarioId: id, solveStage: "idle", scenarioRailOpen: false });
    const n = NODE_BY_ID[scn.epicenter];
    if (n) get().flyTo({ longitude: n.lon - 3, latitude: n.lat, zoom: 4.6, pitch: 28, bearing: 0 });
  },
  clearScenario: () => set({ activeScenarioId: null, solveStage: "idle" }),

  solveStage: "idle",
  solveScenarioId: null,
  startSolve: (scenarioId) => {
    const id = scenarioId ?? get().activeScenarioId;
    if (!id || !SOLVE_BY_SCENARIO[id]) return;
    get()._cancelSolve?.();
    set({ solveScenarioId: id, activeScenarioId: id });
    const cancel = runSolve(id, (stage) => set({ solveStage: stage }));
    set({ _cancelSolve: cancel });
  },
  resetSolve: () => {
    get()._cancelSolve?.();
    set({ solveStage: "idle", _cancelSolve: undefined });
  },

  clockWeek: 25, // NOW_WEEK
  setClockWeek: (w) => set({ clockWeek: Math.max(0, Math.min(38, Math.round(w))) }),

  commandBarOpen: false,
  setCommandBar: (b) => set({ commandBarOpen: b }),
  helpOpen: false,
  setHelp: (b) => set({ helpOpen: b }),
  nlqOpen: false,
  setNlq: (b) => set({ nlqOpen: b }),
  nlqResult: null,
  runNlq: (q) => {
    const res = runQuery(q);
    set({ nlqResult: res, nlqOpen: true });
    if (res.card) {
      const ids = res.card.highlightNodeIds;
      if (ids.length) {
        const n = NODE_BY_ID[ids[0]];
        if (n) get().flyTo({ longitude: n.lon, latitude: n.lat, zoom: 5, pitch: 30, bearing: 0 });
      }
    }
  },
  loopOpen: false,
  setLoop: (b) => set({ loopOpen: b }),
  closeOverlay: false,
  ghostPanels: false,
  unifiedCard: false,
  scenarioRailOpen: false,
  setScenarioRail: (b) => set({ scenarioRailOpen: b }),

  presenterMode: false,
  beatIndex: 0,
  enterPresenter: () => {
    set({ presenterMode: true, beatIndex: 0 });
    get().applyBeat(BEATS[0]);
  },
  exitPresenter: () =>
    set({
      presenterMode: false,
      ghostPanels: false,
      unifiedCard: false,
      loopOpen: false,
      closeOverlay: false,
      nlqOpen: false,
    }),
  nextBeat: () => {
    const i = Math.min(BEATS.length - 1, get().beatIndex + 1);
    set({ beatIndex: i });
    get().applyBeat(BEATS[i]);
  },
  prevBeat: () => {
    const i = Math.max(0, get().beatIndex - 1);
    set({ beatIndex: i });
    get().applyBeat(BEATS[i]);
  },
  applyBeat: (b) => {
    get()._cancelSolve?.();
    set({
      ghostPanels: !!b.ghostPanels,
      unifiedCard: !!b.unifiedCard,
      loopOpen: !!b.loop,
      closeOverlay: !!b.close,
      mode: b.mode,
      activeLayers: [...b.layers].slice(0, 2),
      nlqOpen: false,
      nlqResult: null,
      commandBarOpen: false,
      scenarioRailOpen: false,
      solveStage: "idle",
    });
    get().flyTo(b.camera);

    // scenario state for the beat
    if (b.scenario) {
      set({ activeScenarioId: b.scenario });
    } else if (!b.loop && !b.close) {
      set({ activeScenarioId: null });
    }

    // inspector
    if (b.inspector) {
      set({
        selectedNodeId: b.inspector.nodeId ?? null,
        selectedBatchId: b.inspector.batchId ?? null,
        inspectorTab: b.inspector.tab ?? "State",
      });
    } else {
      set({ selectedNodeId: null, selectedBatchId: null, selectedLaneId: null });
    }

    // solve (deferred so the camera + layers settle first)
    if (b.solve && b.scenario) {
      setTimeout(() => {
        if (get().beatIndex === b.id - 1) get().startSolve(b.scenario);
      }, 650);
    }

    // nlq auto-run
    if (b.nlq) {
      setTimeout(() => {
        if (get().beatIndex === b.id - 1) get().runNlq(b.nlq!);
      }, 700);
    }
  },

  // ── deep-dive screens ──────────────────────────────────────────────────
  activeScreen: null,
  openScreen: (kind, id, sub) => {
    set({ activeScreen: { kind, id, sub } });
    // fly the camera into the object the screen scales out of
    if ((kind === "plant" || kind === "dock") && id) {
      const n = NODE_BY_ID[id];
      if (n) get().flyTo({ longitude: n.lon, latitude: n.lat, zoom: 6.6, pitch: 45, bearing: 0 });
    }
  },
  closeScreen: () => set({ activeScreen: null }),

  // ── commit pipeline ────────────────────────────────────────────────────
  sessionLedger: [],
  kpiDelta: {},
  nodeRiskDelta: {},
  committedFlows: [],
  twinRevision: 0,
  _nodeRestore: {},
  commitDecision: (input) => {
    const status = input.status ?? "executed";
    const entry = appendLedger({
      objectId: input.objectId,
      objectLabel: input.objectLabel,
      title: input.title,
      status,
      expectedValue: input.expectedValue,
      realizedValue: status === "executed" ? Math.round(input.expectedValue * 0.96) : null,
      actor: input.actor ?? "ONECHAIN · screen",
      week: get().clockWeek,
      rationale: input.rationale ?? "Committed from a deep-dive screen.",
    });
    set((s) => {
      const kpiDelta = { ...s.kpiDelta };
      if (input.kpi) {
        for (const k of Object.keys(input.kpi) as (keyof KpiSet)[]) {
          kpiDelta[k] = (kpiDelta[k] ?? 0) + (input.kpi[k] ?? 0);
        }
      }
      const nodeRiskDelta = { ...s.nodeRiskDelta };
      const nodeRestore = { ...s._nodeRestore };
      if (input.nodeRiskDelta) {
        const { nodeId, delta } = input.nodeRiskDelta;
        nodeRiskDelta[nodeId] = (nodeRiskDelta[nodeId] ?? 0) + delta;
        const node = NODE_BY_ID[nodeId];
        if (node) {
          const lineRisk = node.risks.find((r) => r.kind === "line");
          // snapshot originals once so reset restores the baseline exactly
          if (!nodeRestore[nodeId]) {
            nodeRestore[nodeId] = { composite: node.composite, line: lineRisk?.value };
          }
          node.composite = Math.max(0, Math.min(1, node.composite + delta));
          if (lineRisk) lineRisk.value = Math.max(0, Math.min(1, lineRisk.value + delta));
        }
      }
      const committedFlows = input.laneFlow && !s.committedFlows.includes(input.laneFlow)
        ? [...s.committedFlows, input.laneFlow]
        : s.committedFlows;
      return {
        _nodeRestore: nodeRestore,
        sessionLedger: [entry, ...s.sessionLedger],
        kpiDelta,
        nodeRiskDelta,
        committedFlows,
        twinRevision: s.twinRevision + 1,
      };
    });
    return entry;
  },
  resetAll: () => {
    get()._cancelSolve?.();
    resetSessionLedger();
    // restore any node risk values mutated by commits
    const restore = get()._nodeRestore ?? {};
    for (const id of Object.keys(restore)) {
      const node = NODE_BY_ID[id];
      if (!node) continue;
      node.composite = restore[id].composite;
      const lineRisk = node.risks.find((r) => r.kind === "line");
      if (lineRisk && restore[id].line != null) lineRisk.value = restore[id].line!;
    }
    set({
      sessionLedger: [],
      kpiDelta: {},
      nodeRiskDelta: {},
      committedFlows: [],
      _nodeRestore: {},
      twinRevision: get().twinRevision + 1,
      activeScreen: null,
      activeScenarioId: null,
      solveStage: "idle",
      _cancelSolve: undefined,
      selectedNodeId: null,
      selectedLaneId: null,
      selectedBatchId: null,
      isolatedTier: null,
      activeLayers: ["flows"],
      mode: "geo",
      clockWeek: 25,
      nlqOpen: false,
      nlqResult: null,
      loopOpen: false,
      commandBarOpen: false,
      scenarioRailOpen: false,
      ghostPanels: false,
      unifiedCard: false,
      closeOverlay: false,
      presenterMode: false,
    });
    get().flyTo({ ...US_OVERVIEW });
  },

  // ── auto-demo ──────────────────────────────────────────────────────────
  autoDemo: false,
  autoPaused: false,
  startAutoDemo: () => {
    get().resetAll();
    set({ autoDemo: true, autoPaused: false });
  },
  stopAutoDemo: () =>
    set({ autoDemo: false, autoPaused: false, scenarioRailOpen: false, nlqOpen: false, loopOpen: false }),
  setAutoPaused: (b) => set({ autoPaused: b }),

  currentKpi: () => {
    const s = get();
    let base: KpiSet;
    if (s.activeScenarioId && s.solveStage === "done") {
      base = SOLVE_BY_SCENARIO[s.activeScenarioId]?.kpi ?? BASELINE_KPI;
    } else if (s.activeScenarioId) {
      base = SCENARIO_BY_ID[s.activeScenarioId]?.kpiAfter ?? BASELINE_KPI;
    } else {
      base = BASELINE_KPI;
    }
    const d = s.kpiDelta;
    if (!d || Object.keys(d).length === 0) return base;
    const out = { ...base };
    for (const k of Object.keys(d) as (keyof KpiSet)[]) {
      out[k] = (out[k] as number) + (d[k] ?? 0);
    }
    return out;
  },
}));

export { HERO_BATCH_ID };
