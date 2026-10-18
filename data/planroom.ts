import { Rng, clamp, round } from "@/lib/rng";
import { BusinessUnit } from "@/lib/types";
import { CUSTOMERS } from "./network";
import { CASE_VALUE, BASELINE_KPI } from "@/lib/constants";
import { TOTAL_WEEKS, NOW_WEEK, WEEK_LABELS } from "./forecast";
import { BIAS_CORRECTION } from "./attribution";

export const FAMILIES: BusinessUnit[] = ["PET", "CEREAL", "SNACKS"];
export const PLAN_CUSTOMERS = CUSTOMERS;
export { WEEK_LABELS, NOW_WEEK, TOTAL_WEEKS };
export const BIAS_PCT = 0.064; // −6.4% PET DRY ADULT correction (Beat 7)

export interface Handles {
  capacityPct: number; // 0.80 .. 1.30
  promo: { start: number; end: number; pct: number }; // forward-week window + lift
  safetyWeeks: number; // 0 .. 6
}

export interface PlanSeries {
  customerId: string;
  family: BusinessUnit;
  p50: number[]; // 39 weeks
  spread: number[]; // relative p10/p90 half-width
  supplyBase: number[]; // pre-scale supply (production + inventory)
  scale: number; // calibrated so default fill == target
  avgFwd: number;
  baseWC: number; // $ working-capital floor
  target: number; // default fill target
  biasEligible: boolean; // PET family carries the bias correction
}

export const DEFAULT_HANDLES: Handles = {
  capacityPct: 1.0,
  promo: { start: 30, end: 32, pct: 0.15 },
  safetyWeeks: 2,
};

// Pre-computed "best" S&OP handle set per series (revealed by Balance).
export function balancedHandles(): Handles {
  return { capacityPct: 1.12, promo: { start: 31, end: 33, pct: 0.12 }, safetyWeeks: 3 };
}

function makeSeries(customerId: string, family: BusinessUnit, isDefault: boolean): PlanSeries {
  const rng = new Rng(hash(customerId + family));
  const base = rng.range(900, 2600);
  const p50: number[] = [];
  const spread: number[] = [];
  const supplyBase: number[] = [];
  let level = base;
  for (let w = 0; w < TOTAL_WEEKS; w++) {
    const season = 1 + 0.16 * Math.sin((w / 52) * Math.PI * 2 * 4 + customerId.length);
    level = clamp(level + rng.gauss(0, base * 0.04), base * 0.6, base * 1.7);
    const d = Math.round(level * season);
    p50.push(d);
    spread.push(round(0.12 + (w > NOW_WEEK ? (w - NOW_WEEK) * 0.01 : 0), 3));
    // supply tracks demand with seeded slack
    supplyBase.push(Math.round(d * rng.range(0.93, 1.03)));
  }
  const avgFwd = Math.round(p50.slice(NOW_WEEK + 1).reduce((a, b) => a + b, 0) / (TOTAL_WEEKS - NOW_WEEK - 1));
  const target = isDefault ? BASELINE_KPI.fillRate / 100 : round(rng.range(0.93, 0.985), 3);
  const baseWC = Math.round(rng.range(1.6, 3.4) * 1_000_000);
  const s: PlanSeries = {
    customerId,
    family,
    p50,
    spread,
    supplyBase,
    scale: 1,
    avgFwd,
    baseWC,
    target,
    biasEligible: family === "PET",
  };
  s.scale = calibrate(s);
  return s;
}

// compute forward fill rate for a given scale + handles
function fillFor(s: PlanSeries, handles: Handles, scale = s.scale, biasOn = false): PlanResult {
  const rows: PlanRow[] = [];
  let safetyPool = handles.safetyWeeks * s.avgFwd * 0.25;
  let cuts = 0;
  let demandFwd = 0;
  let excess = 0;
  for (let w = 0; w < TOTAL_WEEKS; w++) {
    let p50 = s.p50[w];
    if (biasOn && s.biasEligible && w > NOW_WEEK) p50 = p50 * (1 - BIAS_PCT);
    const inPromo = w >= handles.promo.start && w <= handles.promo.end;
    const demand = Math.round(p50 * (inPromo ? 1 + handles.promo.pct : 1));
    const sp = s.spread[w];
    let supply = Math.round(s.supplyBase[w] * scale * (w > NOW_WEEK ? handles.capacityPct : 1));
    let cut = 0;
    let exc = 0;
    if (w > NOW_WEEK) {
      demandFwd += demand;
      let gap = demand - supply;
      if (gap > 0) {
        const draw = Math.min(gap, safetyPool);
        safetyPool -= draw;
        supply += draw;
        gap -= draw;
        cut = gap;
        cuts += gap;
      } else {
        exc = Math.max(0, supply - Math.round(demand * (1 + sp)));
        excess += exc;
      }
    }
    rows.push({
      week: w,
      demand,
      p10: Math.round(demand * (1 - sp)),
      p90: Math.round(demand * (1 + sp)),
      supply,
      actual: w <= NOW_WEEK ? Math.round(demand * (1 - (s.biasEligible ? 0.03 : 0.01))) : undefined,
      cut,
      excess: exc,
      inPromo,
    });
  }
  const fillRate = demandFwd ? 1 - cuts / demandFwd : 1;
  const workingCapital = Math.round(s.baseWC + handles.safetyWeeks * s.avgFwd * CASE_VALUE);
  return { rows, fillRate, cuts, excess, workingCapital, demandFwd };
}

function calibrate(s: PlanSeries): number {
  let lo = 0.6;
  let hi = 1.25;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const f = fillFor(s, DEFAULT_HANDLES, mid).fillRate;
    if (f < s.target) lo = mid;
    else hi = mid;
  }
  return round((lo + hi) / 2, 4);
}

export interface PlanRow {
  week: number;
  demand: number;
  p10: number;
  p90: number;
  supply: number;
  actual?: number;
  cut: number;
  excess: number;
  inPromo: boolean;
}
export interface PlanResult {
  rows: PlanRow[];
  fillRate: number;
  cuts: number;
  excess: number;
  workingCapital: number;
  demandFwd: number;
}

// Build all 18 series once.
const SERIES: Record<string, PlanSeries> = {};
PLAN_CUSTOMERS.forEach((c, ci) => {
  FAMILIES.forEach((f) => {
    const isDefault = ci === 0 && f === "PET";
    SERIES[key(c.code, f)] = makeSeries(c.code, f, isDefault);
  });
});

function key(custId: string, fam: BusinessUnit) {
  return `${custId}:${fam}`;
}
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function getSeries(custId: string, fam: BusinessUnit): PlanSeries {
  return SERIES[key(custId, fam)];
}

export function computePlan(custId: string, fam: BusinessUnit, handles: Handles, biasOn = false): PlanResult {
  const s = getSeries(custId, fam);
  return fillFor(s, handles, s.scale, biasOn);
}

// Promotion readiness: supply covers promo demand AND shelf life meets freshness.
export function promoReadiness(custId: string, fam: BusinessUnit, handles: Handles): { ready: boolean; supplyOk: boolean; freshnessOk: boolean; freshnessDays: number } {
  const r = computePlan(custId, fam, handles);
  const promoRows = r.rows.filter((row) => row.inPromo);
  const supplyOk = promoRows.every((row) => row.cut === 0);
  // family freshness-day requirement vs typical remaining shelf life
  const freshnessDays = fam === "PET" ? 60 : fam === "CEREAL" ? 45 : 30;
  const typicalRemaining = fam === "PET" ? 120 : fam === "CEREAL" ? 70 : 24;
  const freshnessOk = typicalRemaining >= freshnessDays;
  return { ready: supplyOk && freshnessOk, supplyOk, freshnessOk, freshnessDays };
}

// Bias-correction accuracy — sourced from the Beat 7 card so numbers match.
export const BIAS_ACCURACY = {
  before: BIAS_CORRECTION.accuracyBefore, // 0.882
  after: BIAS_CORRECTION.accuracyAfter, // 0.906
};

export const PLAN_BASELINE_FILL = BASELINE_KPI.fillRate; // 97.4
