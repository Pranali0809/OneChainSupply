import { SolvePlan, SolveFlow, OptimizerClaim, KpiSet } from "@/lib/types";
import { CASE_VALUE, BASELINE_KPI } from "@/lib/constants";
import { LANES } from "./network";
import { SCENARIO_BY_ID } from "./scenarios";

const OPTIMIZERS = ["Deployment", "Repositioning", "Truck Build", "Raw Material Order"];

function flowsFor(scenarioId: string): SolveFlow[] {
  const scn = SCENARIO_BY_ID[scenarioId];
  const severed = new Set(scn.severedLanes);
  const stressed = new Set(scn.stressedLanes);
  const out: SolveFlow[] = [];
  // Re-routes: lanes that bypass the severed region (not severed, touching a
  // recovery node) become the new plan's flows.
  const recoveryNodes = new Set(
    scn.id === "SCN-CARRIER"
      ? ["DC-RED", "DC-DEN", "DC-FTW"]
      : scn.id === "SCN-COLDCHAIN"
      ? ["DC-STO", "DC-PHX"]
      : ["PL-OCA", "DC-ATL"]
  );
  for (const l of LANES) {
    if (severed.has(l.id)) continue;
    const isNew = recoveryNodes.has(l.from) || recoveryNodes.has(l.to);
    if (isNew || stressed.has(l.id)) {
      out.push({
        laneId: l.id,
        from: l.from,
        to: l.to,
        cases: Math.round(l.volume * (isNew ? 1.25 : 0.8)),
        isNew,
      });
    }
  }
  return out.slice(0, 28);
}

function claimsFor(scenarioId: string): OptimizerClaim[] {
  const scn = SCENARIO_BY_ID[scenarioId];
  const contestedNodes = scn.impactedNodes.slice(0, 4).map((n) => n.nodeId);
  const claims: OptimizerClaim[] = [];
  contestedNodes.forEach((nodeId, i) => {
    // first two optimizers both claim the same two nodes → contested
    OPTIMIZERS.forEach((opt, j) => {
      const claimsHere = (i + j) % 2 === 0 || i < 2;
      if (!claimsHere) return;
      const contested = i < 2 && j < 2; // the headline conflict
      claims.push({
        optimizer: opt,
        nodeId,
        pallets: 40 + ((i * 7 + j * 13) % 9) * 20,
        contested,
      });
    });
  });
  return claims;
}

// Post-solve KPI per scenario (reconciles with scenario.kpiAfter → avoided).
const SOLVE_KPI: Record<string, KpiSet> = {
  "SCN-CARRIER": {
    fillRate: 96.1,
    projectedWasteCases: 21840, // 24,960 disrupted − 3,120 avoided
    projectedWasteDollars: 21840 * CASE_VALUE,
    freightCost: 3_640_000,
    workingCapital: 12_900_000,
    expediteCost: 210_000,
  },
  "SCN-COLDCHAIN": {
    fillRate: 96.8,
    projectedWasteCases: 19420,
    projectedWasteDollars: 19420 * CASE_VALUE,
    freightCost: 3_520_000,
    workingCapital: 12_640_000,
    expediteCost: 180_000,
  },
  "SCN-LINEDOWN": {
    fillRate: 96.4,
    projectedWasteCases: 18650,
    projectedWasteDollars: 18650 * CASE_VALUE,
    freightCost: 3_480_000,
    workingCapital: 12_550_000,
    expediteCost: 160_000,
  },
};

const TRADEOFFS: Record<string, string[]> = {
  "SCN-CARRIER": [
    "+340 intermodal moves swapped to truck to protect 48h service window",
    "1,840 cs repositioned Joliet → Reed City instead of donated (recovers $169k value)",
    "Raw-material order for PL-OMA deferred one cycle to free working capital",
  ],
  "SCN-COLDCHAIN": [
    "Reefer volume re-slotted Ontario → Stockton with 6h pre-cool buffer",
    "Phoenix safety stock lifted one week to hold Sunmark fill rate",
  ],
  "SCN-LINEDOWN": [
    "Pet-dry build shifted Covington → Ocala, +1 changeover absorbed",
    "Atlanta DC drawn down 9% to cover Southeast customer demand",
  ],
};

function objectiveTicks(startGap: number): SolvePlan["objective"] {
  const steps = 6;
  const ticks: SolvePlan["objective"] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    ticks.push({
      cost: Math.round(4_200_000 - 560_000 * t),
      service: Math.round((91 + 5.3 * t) * 10) / 10,
      waste: Math.round(24960 - 3120 * t),
      gap: Math.round(startGap * (1 - t) * 1000) / 1000,
    });
  }
  return ticks;
}

export const SOLVES: SolvePlan[] = Object.keys(SOLVE_KPI).map((scenarioId) => ({
  id: `SOLVE-${scenarioId}`,
  scenarioId,
  label: "Coordinated plan",
  claims: claimsFor(scenarioId),
  flows: flowsFor(scenarioId),
  kpi: SOLVE_KPI[scenarioId],
  objective: objectiveTicks(0.42),
  tradeoffs: TRADEOFFS[scenarioId],
}));

export const SOLVE_BY_SCENARIO: Record<string, SolvePlan> = Object.fromEntries(
  SOLVES.map((s) => [s.scenarioId, s])
);

// Baseline plan (no disruption) — steady-state flows for the idle canvas.
export const BASELINE_PLAN: SolvePlan = {
  id: "SOLVE-BASELINE",
  scenarioId: "BASELINE",
  label: "Baseline plan",
  claims: [],
  flows: LANES.map((l) => ({
    laneId: l.id,
    from: l.from,
    to: l.to,
    cases: l.volume,
    isNew: false,
  })),
  kpi: { ...BASELINE_KPI },
  objective: [],
  tradeoffs: [],
};

// Headline deltas used by the before/after reveal — single source of truth.
export function solveDeltas(scenarioId: string) {
  const scn = SCENARIO_BY_ID[scenarioId];
  const after = SOLVE_KPI[scenarioId];
  const before = scn.kpiAfter;
  return {
    fillRate: +(after.fillRate - before.fillRate).toFixed(1),
    wasteCases: before.projectedWasteCases - after.projectedWasteCases,
    wasteDollars: before.projectedWasteDollars - after.projectedWasteDollars,
    freight: before.freightCost - after.freightCost,
    workingCapital: before.workingCapital - after.workingCapital,
    expedite: before.expediteCost - after.expediteCost,
  };
}
