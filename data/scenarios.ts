import { Scenario, KpiSet } from "@/lib/types";
import { CASE_VALUE, BASELINE_KPI } from "@/lib/constants";
import { LANES, NODE_BY_ID } from "./network";

const baseline: KpiSet = { ...BASELINE_KPI };

// Build blast-radius rings outward from an epicenter over the lane graph.
function blastRings(epicenter: string, hops: number): string[][] {
  const adj: Record<string, Set<string>> = {};
  for (const l of LANES) {
    (adj[l.from] ||= new Set()).add(l.to);
    (adj[l.to] ||= new Set()).add(l.from);
  }
  const seen = new Set<string>([epicenter]);
  const rings: string[][] = [[epicenter]];
  let frontier = [epicenter];
  for (let h = 0; h < hops; h++) {
    const next: string[] = [];
    for (const n of frontier) {
      for (const m of adj[n] || []) {
        if (!seen.has(m)) {
          seen.add(m);
          next.push(m);
        }
      }
    }
    if (!next.length) break;
    rings.push(next);
    frontier = next;
  }
  return rings;
}

function lanesTouching(ids: string[]): string[] {
  const set = new Set(ids);
  return LANES.filter((l) => set.has(l.from) || set.has(l.to)).map((l) => l.id);
}

function cases(n: number) {
  return { cases: n, dollars: n * CASE_VALUE };
}

// ── Scenario 1: Carrier capacity shortfall, Midwest, 48h (Beat 4 main) ───────
const s1Rings = blastRings("DC-KC", 3);
const s1Core = [...(s1Rings[0] || []), ...(s1Rings[1] || [])];
const scn1: Scenario = {
  id: "SCN-CARRIER",
  name: "Carrier capacity shortfall · Midwest · 48h",
  epicenter: "DC-KC",
  caption: "The twin feels it in 4 seconds. Today this takes a planner two days.",
  severedLanes: lanesTouching(["DC-KC", "DC-JOL"]).slice(0, 9),
  stressedLanes: lanesTouching(["DC-MEM", "PL-OMA", "DC-DEN"]).slice(0, 14),
  impactedNodes: [
    { nodeId: "DC-KC", deltaRisk: 0.28 },
    { nodeId: "DC-JOL", deltaRisk: 0.1 },
    { nodeId: "DC-MEM", deltaRisk: 0.22 },
    { nodeId: "PL-OMA", deltaRisk: 0.18 },
    { nodeId: "DC-DEN", deltaRisk: 0.2 },
    { nodeId: "CDC-PAL-LEN", deltaRisk: 0.26 },
    { nodeId: "CDC-WAL-BTN", deltaRisk: 0.19 },
    { nodeId: "CDC-RRR-TUL", deltaRisk: 0.17 },
  ],
  blastHops: s1Rings.slice(0, 4),
  kpiBefore: baseline,
  kpiAfter: {
    fillRate: 91.2,
    ...cases(24960),
    projectedWasteCases: 24960,
    projectedWasteDollars: 24960 * CASE_VALUE,
    freightCost: 3_980_000,
    workingCapital: 14_200_000,
    expediteCost: 880_000,
  } as KpiSet,
};

// ── Scenario 2: Cold-chain failure at Ontario (temp DC) ──────────────────────
const s2Rings = blastRings("DC-ONT", 3);
const scn2: Scenario = {
  id: "SCN-COLDCHAIN",
  name: "Cold-chain failure · Ontario CA · 24h",
  epicenter: "DC-ONT",
  caption: "A single reefer DC fails. Temperature-controlled SKUs cascade west.",
  severedLanes: lanesTouching(["DC-ONT"]).slice(0, 6),
  stressedLanes: lanesTouching(["DC-STO", "DC-PHX"]).slice(0, 10),
  impactedNodes: [
    { nodeId: "DC-ONT", deltaRisk: 0.34 },
    { nodeId: "DC-STO", deltaRisk: 0.21 },
    { nodeId: "DC-PHX", deltaRisk: 0.19 },
    { nodeId: "CDC-SUN-MOR", deltaRisk: 0.27 },
    { nodeId: "CDC-SUN-GOO", deltaRisk: 0.23 },
    { nodeId: "CDC-SUN-TRC", deltaRisk: 0.18 },
  ],
  blastHops: s2Rings.slice(0, 4),
  kpiBefore: baseline,
  kpiAfter: {
    fillRate: 93.6,
    projectedWasteCases: 21880,
    projectedWasteDollars: 21880 * CASE_VALUE,
    freightCost: 3_710_000,
    workingCapital: 13_250_000,
    expediteCost: 560_000,
  },
};

// ── Scenario 3: Production line down at Covington ────────────────────────────
const s3Rings = blastRings("PL-COV", 3);
const scn3: Scenario = {
  id: "SCN-LINEDOWN",
  name: "Line down · Covington GA · L2+L3 · 72h",
  epicenter: "PL-COV",
  caption: "Two lines down at Covington. Pet-dry supply tightens across the Southeast.",
  severedLanes: lanesTouching(["PL-COV"]).slice(0, 5),
  stressedLanes: lanesTouching(["DC-ATL", "DC-ORL", "PL-OCA"]).slice(0, 11),
  impactedNodes: [
    { nodeId: "PL-COV", deltaRisk: 0.3 },
    { nodeId: "DC-ATL", deltaRisk: 0.24 },
    { nodeId: "DC-ORL", deltaRisk: 0.2 },
    { nodeId: "DC-MEM", deltaRisk: 0.16 },
    { nodeId: "CDC-BYR-POO", deltaRisk: 0.25 },
    { nodeId: "CDC-WAL-MOB", deltaRisk: 0.2 },
  ],
  blastHops: s3Rings.slice(0, 4),
  kpiBefore: baseline,
  kpiAfter: {
    fillRate: 92.8,
    projectedWasteCases: 20110,
    projectedWasteDollars: 20110 * CASE_VALUE,
    freightCost: 3_650_000,
    workingCapital: 13_020_000,
    expediteCost: 640_000,
  },
};

export const SCENARIOS: Scenario[] = [scn1, scn2, scn3];
export const SCENARIO_BY_ID: Record<string, Scenario> = Object.fromEntries(
  SCENARIOS.map((s) => [s.id, s])
);
export const PRIMARY_SCENARIO = "SCN-CARRIER";

void NODE_BY_ID;
