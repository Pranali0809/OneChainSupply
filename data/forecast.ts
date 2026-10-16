import { Rng, clamp, round } from "@/lib/rng";
import { ForecastSeries, ForecastPoint } from "@/lib/types";
import { NODES } from "./network";
import { BATCHES_BY_NODE } from "./inventory";
import { HERO_MATERIAL } from "./materials";

const rng = new Rng(0xf02eca5);

export const HISTORY_WEEKS = 26;
export const FORWARD_WEEKS = 13;
export const TOTAL_WEEKS = HISTORY_WEEKS + FORWARD_WEEKS; // 39
export const NOW_WEEK = HISTORY_WEEKS - 1; // index of "current" week (25)

// Week labels across the 39-week twin clock.
export const WEEK_LABELS: string[] = Array.from({ length: TOTAL_WEEKS }, (_, i) => {
  const rel = i - NOW_WEEK;
  const w = 15 + rel; // today is 26W15-ish; label stays operational
  const yr = w <= 0 ? 25 : w > 52 ? 27 : 26;
  const ww = ((((w - 1) % 52) + 52) % 52) + 1;
  return `${yr}W${String(ww).padStart(2, "0")}`;
});

function buildSeries(
  nodeId: string,
  materialCode: string,
  baseDemand: number,
  bias: number
): ForecastSeries {
  const points: ForecastPoint[] = [];
  let level = baseDemand;
  for (let w = 0; w < TOTAL_WEEKS; w++) {
    const season = 1 + 0.18 * Math.sin((w / 52) * 2 * Math.PI * 4 + nodeId.length);
    level = clamp(level + rng.gauss(0, baseDemand * 0.04), baseDemand * 0.5, baseDemand * 1.8);
    const p50 = Math.round(level * season);
    const spread = p50 * (0.14 + (w > NOW_WEEK ? (w - NOW_WEEK) * 0.012 : 0));
    const p10 = Math.round(p50 - spread);
    const p90 = Math.round(p50 + spread);
    const pt: ForecastPoint = { week: w, p10, p50, p90 };
    if (w <= NOW_WEEK) {
      // actuals carry the over-forecast bias that drives downstream waste
      pt.actual = Math.round(p50 * (1 - bias * 0.5) + rng.gauss(0, p50 * 0.05));
    }
    points.push(pt);
  }
  return { nodeId, materialCode, points };
}

const series: ForecastSeries[] = [];
const index: Record<string, ForecastSeries> = {};

function key(nodeId: string, materialCode: string) {
  return `${nodeId}:${materialCode}`;
}

for (const node of NODES) {
  if (node.kind === "SUPPLIER") continue;
  const batches = BATCHES_BY_NODE[node.id] || [];
  const mats = Array.from(new Set(batches.map((b) => b.materialCode))).slice(0, 10);
  // always include hero material where it is stocked
  if (batches.some((b) => b.materialCode === HERO_MATERIAL) && !mats.includes(HERO_MATERIAL)) {
    mats.unshift(HERO_MATERIAL);
  }
  for (const mat of mats) {
    const base = node.throughput * rng.range(0.004, 0.02);
    // Joliet + hero material carry the strongest over-forecast bias.
    const bias =
      node.id === "DC-JOL" && mat === HERO_MATERIAL
        ? 0.18
        : node.id === "DC-JOL"
        ? 0.11
        : rng.range(-0.03, 0.08);
    const s = buildSeries(node.id, mat, Math.max(40, base), bias);
    series.push(s);
    index[key(node.id, mat)] = s;
  }
}

export const FORECASTS = series;

export function getForecast(nodeId: string, materialCode: string): ForecastSeries | undefined {
  return index[key(nodeId, materialCode)];
}

// Node-level aggregate forecast (sum across stocked materials) for the inspector.
const nodeAgg: Record<string, ForecastSeries> = {};
for (const node of NODES) {
  if (node.kind === "SUPPLIER") continue;
  const mine = series.filter((s) => s.nodeId === node.id);
  if (!mine.length) continue;
  const points: ForecastPoint[] = Array.from({ length: TOTAL_WEEKS }, (_, w) => {
    const acc = mine.reduce(
      (a, s) => {
        const p = s.points[w];
        a.p10 += p.p10;
        a.p50 += p.p50;
        a.p90 += p.p90;
        a.actual += p.actual ?? 0;
        a.hasActual = a.hasActual || p.actual != null;
        return a;
      },
      { p10: 0, p50: 0, p90: 0, actual: 0, hasActual: false }
    );
    const pt: ForecastPoint = { week: w, p10: acc.p10, p50: acc.p50, p90: acc.p90 };
    if (acc.hasActual) pt.actual = acc.actual;
    return pt;
  });
  nodeAgg[node.id] = { nodeId: node.id, materialCode: "ALL", points };
}

export function getNodeForecast(nodeId: string): ForecastSeries | undefined {
  return nodeAgg[nodeId];
}

// Forecast accuracy (MAPE-style) for NLQ "how accurate was our forecast".
export function forecastAccuracy(nodeId: string, materialCode: string): number {
  const s = index[key(nodeId, materialCode)];
  if (!s) return 0;
  let err = 0;
  let n = 0;
  for (const p of s.points) {
    if (p.actual != null && p.actual > 0) {
      err += Math.abs(p.p50 - p.actual) / p.actual;
      n++;
    }
  }
  return n ? round(1 - err / n, 3) : 0;
}

export const FORECAST_COUNT = series.length;
