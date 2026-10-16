import { create } from "zustand";
import { CameraState, CanvasMode, BEATS, US_OVERVIEW, Beat } from "./choreography";
import { LayerId } from "./layers";
import { runSolve, SolveStage } from "./solve";
import { runQuery, NlqResult } from "./nlq";
import { KpiSet } from "./types";
import { BASELINE_KPI } from "./constants";
import { SCENARIO_BY_ID } from "@/data/scenarios";
import { SOLVE_BY_SCENARIO } from "@/data/solves";
import { NODE_BY_ID } from "@/data/network";
import { HERO_BATCH_ID } from "@/data/inventory";

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

  currentKpi: () => {
    const s = get();
    if (s.activeScenarioId && s.solveStage === "done") {
      return SOLVE_BY_SCENARIO[s.activeScenarioId]?.kpi ?? BASELINE_KPI;
    }
    if (s.activeScenarioId) {
      return SCENARIO_BY_ID[s.activeScenarioId]?.kpiAfter ?? BASELINE_KPI;
    }
    return BASELINE_KPI;
  },
}));

export { HERO_BATCH_ID };
