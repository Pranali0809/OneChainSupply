import { AttributionBand } from "@/lib/types";
import { CASE_VALUE } from "@/lib/constants";

// Last quarter's realized waste, attributed to driver. Total reconciles with
// the bias-correction card and the ledger's realized-value entries.
const RAW: { cause: string; cases: number; color: string }[] = [
  { cause: "National over-forecast", cases: 16180, color: "#FF3B6B" },
  { cause: "CSF demand bias", cases: 9940, color: "#FF6B5A" },
  { cause: "FEFO miss", cases: 7320, color: "#F5B944" },
  { cause: "Oversupply", cases: 5610, color: "#6AA9FF" },
  { cause: "Unattributed", cases: 3550, color: "#5C6678" },
];

export const ATTRIBUTION: AttributionBand[] = RAW.map((r) => ({
  cause: r.cause,
  cases: r.cases,
  dollars: r.cases * CASE_VALUE,
  color: r.color,
}));

export const ATTRIBUTION_TOTAL_CASES = ATTRIBUTION.reduce((s, b) => s + b.cases, 0);
export const ATTRIBUTION_TOTAL_DOLLARS = ATTRIBUTION_TOTAL_CASES * CASE_VALUE;

// Bias correction derived from the largest band → feeds the next forecast cycle.
export const BIAS_CORRECTION = {
  sourceCause: "National over-forecast",
  sourceCases: 16180,
  correctionLabel: "−6.4% national mean shift on PET DRY ADULT family",
  appliedCycle: "26W15 forecast cycle",
  accuracyBefore: 0.882,
  accuracyAfter: 0.906, // +2.4 pts measured improvement since correction went live
  wasteReductionCases: 4120, // projected reduction next cycle
};

// Sankey graph: causes → waste → correction (for the Loop view).
export const LOOP_SANKEY = {
  nodes: [
    ...ATTRIBUTION.map((b) => ({ name: b.cause })),
    { name: "Realized waste" },
    { name: "Bias correction" },
    { name: "Next-cycle forecast" },
  ],
  links: [
    ...ATTRIBUTION.map((b, i) => ({ source: i, target: ATTRIBUTION.length, value: b.cases })),
    { source: ATTRIBUTION.length, target: ATTRIBUTION.length + 1, value: 16180 },
    { source: ATTRIBUTION.length + 1, target: ATTRIBUTION.length + 2, value: 16180 },
  ],
};
