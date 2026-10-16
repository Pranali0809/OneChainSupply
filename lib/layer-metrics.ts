// Pre-computed per-node metrics that drive each layer's distinct encoding, plus
// live counts for the key chip. Deterministic — derived from the twin at import.
import { NODES } from "@/data/network";
import { BATCHES_BY_NODE } from "@/data/inventory";
import { getNodeForecast, NOW_WEEK } from "@/data/forecast";
import { getPlant } from "@/data/plant";
import { nodeLayerValue, LayerId } from "./layers";
import { TwinNode } from "./types";

export interface NodeMetrics {
  casesAtRisk: number; // age ≥ 0.6
  worstRemaining: number; // days on worst batch
  compliancePct: number; // FEFO compliance 0..100
  uncertaintyWidth: number; // normalized p90−p10 at now
  costPerCase: number; // $ cost-to-serve per case
  lineRates: { line: string; actual: number; committed: number }[];
}

const metrics: Record<string, NodeMetrics> = {};

for (const n of NODES) {
  const batches = BATCHES_BY_NODE[n.id] || [];
  const risky = batches.filter((b) => b.ageRisk >= 0.6);
  const casesAtRisk = risky.reduce((s, b) => s + b.qtyCases, 0);
  const worstRemaining = batches.length
    ? Math.min(...batches.map((b) => b.remainingShelfDays))
    : 999;
  const flagged = batches.filter((b) => b.fefoFlag).length;
  const compliancePct = batches.length ? Math.round(100 * (1 - flagged / batches.length)) : 100;

  const fc = getNodeForecast(n.id);
  let uncertaintyWidth = nodeLayerValue(n, "uncertainty");
  if (fc) {
    const p = fc.points[NOW_WEEK + 6] || fc.points[NOW_WEEK];
    const w = (p.p90 - p.p10) / Math.max(1, p.p50);
    uncertaintyWidth = Math.max(0, Math.min(1, w));
  }
  const costPerCase = Math.round((8 + n.composite * 9) * 100) / 100;

  // Line-health bars come from the same plant floor data the screen uses.
  const plant = n.kind === "PLANT" ? getPlant(n.id) : null;
  const lineRates = plant
    ? plant.lines.map((l) => ({ line: l.id, actual: l.actualRate, committed: l.committedRate }))
    : [];

  metrics[n.id] = { casesAtRisk, worstRemaining, compliancePct, uncertaintyWidth, costPerCase, lineRates };
}

export function nodeMetrics(id: string): NodeMetrics {
  return metrics[id];
}

// Max cases-at-risk for radius normalization under the Age layer.
export const MAX_CASES_AT_RISK = Math.max(1, ...NODES.map((n) => metrics[n.id].casesAtRisk));
export const MAX_COST_PER_CASE = Math.max(...NODES.map((n) => metrics[n.id].costPerCase));

// Live count of nodes above a threshold for a node-based layer (key chip).
export function countAbove(layer: LayerId, threshold = 0.6): number {
  return NODES.filter((n) => {
    if (layer === "line" && n.kind !== "PLANT") return false;
    const v = layerMetricValue(n, layer);
    return v >= threshold;
  }).length;
}

// Unified 0..1 value per node for a layer (used for color + counts).
export function layerMetricValue(n: TwinNode, layer: LayerId): number {
  const m = metrics[n.id];
  switch (layer) {
    case "age":
      return n.risks.find((r) => r.kind === "age")?.value ?? 0;
    case "service":
      return n.risks.find((r) => r.kind === "service")?.value ?? 0;
    case "fefo":
      return 1 - m.compliancePct / 100;
    case "line":
      return n.kind === "PLANT" ? n.risks.find((r) => r.kind === "line")?.value ?? 0 : 0;
    case "inventory":
      return Math.min(1, n.daysOfSupply / 34);
    case "uncertainty":
      return m.uncertaintyWidth;
    case "cost":
      return m.costPerCase / MAX_COST_PER_CASE;
    default:
      return n.composite;
  }
}
