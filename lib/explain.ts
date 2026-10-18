import { ExplanationCard, TwinNode } from "./types";
import { NODE_BY_ID } from "@/data/network";
import { BATCHES_BY_NODE, atRiskBatches } from "@/data/inventory";
import { ATTRIBUTION } from "@/data/attribution";
import { forecastAccuracy, getForecast } from "@/data/forecast";
import { ledgerForObject } from "@/data/ledger";

// Generates the structured explanation card for the hero reposition decision.
export function explainReposition(): ExplanationCard {
  return {
    query: "why did we reposition 1,840 cases from Joliet to Reed City instead of donating them?",
    decision:
      "Reposition 1,840 cs of 4471188 (PET DRY ADULT CHKN 24LB) from Joliet (DC-JOL) to Reed City (DC-RED).",
    expectedValue: 169280,
    drivers: [
      { label: "Recovered case value vs donation", contribution: 0.52 },
      { label: "Open Walcott demand at Reed City", contribution: 0.27 },
      { label: "Freight cost of the move", contribution: -0.11 },
      { label: "Remaining shelf-life headroom (41d)", contribution: 0.18 },
      { label: "FEFO pick-order gain at Joliet", contribution: 0.14 },
    ],
    constraints: [
      { name: "Customer freshness ≥ 60d", slack: "crossed by day 7 of transit — binds", binding: true },
      { name: "Reed City receiving capacity", slack: "2,400 cs/wk open — 560 cs slack", binding: false },
      { name: "Min remaining ship ≥ 110d", slack: "not binding for repositioning leg", binding: false },
      { name: "Truckload minimum", slack: "1,840 cs = 38 full + 1 partial pallet · 44,160 lb = 92% of trailer limit — binds to 1 TL (weight)", binding: true },
    ],
    nextBest: {
      label: "Donate at Joliet (tax-credit recovery)",
      costDelta: -112400,
      whyLost:
        "Donation recovers only partial value and forfeits the open Walcott demand; net $112.4k worse than repositioning.",
    },
    highlightNodeIds: ["DC-JOL", "DC-RED"],
    highlightLaneIds: [],
  };
}

function nodeLabel(id: string): string {
  return NODE_BY_ID[id]?.name ?? id;
}

// Intent-specific card builders ------------------------------------------------
export function explainRiskAtNode(node: TwinNode): ExplanationCard {
  const risky = atRiskBatches(node.id, 0.6);
  const totalCases = risky.reduce((s, b) => s + b.qtyCases, 0);
  const top = node.risks.slice().sort((a, b) => b.value - a.value)[0];
  return {
    query: `which batches are at risk at ${node.name}?`,
    decision: `${risky.length} batches (${totalCases.toLocaleString()} cs) at ${node.name} exceed the 0.60 age-risk threshold.`,
    expectedValue: totalCases * 92,
    drivers: top.drivers,
    constraints: [
      { name: top.label + " threshold", slack: `verdict flips below ${top.threshold}`, binding: top.value >= top.threshold },
      { name: "Shelf-life headroom", slack: `${risky[0]?.remainingShelfDays ?? 0}d remaining on worst batch`, binding: true },
    ],
    nextBest: {
      label: "Hold and re-slot in place",
      costDelta: -48000,
      whyLost: "Re-slotting alone does not clear the forward demand gap; exposure persists.",
    },
    highlightNodeIds: [node.id],
    highlightLaneIds: [],
  };
}

export function explainWasteDriver(materialDesc: string): ExplanationCard {
  const top = ATTRIBUTION[0];
  return {
    query: `what is driving waste for ${materialDesc}?`,
    decision: `${top.cause} is the dominant driver at ${top.cases.toLocaleString()} cs ($${(top.dollars / 1000).toFixed(0)}k) last quarter.`,
    expectedValue: top.dollars,
    drivers: ATTRIBUTION.map((b) => ({ label: b.cause, contribution: +(b.cases / ATTRIBUTION[0].cases).toFixed(2) })),
    constraints: [
      { name: "Forecast bias tolerance", slack: "−6.4% correction now live", binding: true },
      { name: "FEFO enforcement", slack: "92% compliant, 8% gap", binding: false },
    ],
    nextBest: {
      label: "Increase safety stock",
      costDelta: -210000,
      whyLost: "Adds working capital and raises age risk — treats symptom, not the forecast bias.",
    },
    highlightNodeIds: ["DC-JOL"],
    highlightLaneIds: [],
  };
}

export function explainLaneFailure(laneId: string, fromId: string, toId: string): ExplanationCard {
  return {
    query: `what happens if lane ${laneId} fails?`,
    decision: `Severing ${nodeLabel(fromId)} → ${nodeLabel(toId)} forces re-route via the next-cheapest reliable lane and lifts downstream service risk by ~0.22.`,
    expectedValue: -340000,
    drivers: [
      { label: "Downstream service risk", contribution: 0.22 },
      { label: "Expedite cost exposure", contribution: 0.19 },
      { label: "Alternate lane reliability", contribution: -0.12 },
    ],
    constraints: [
      { name: "48h service window", slack: "binds for 2 customer DCs", binding: true },
      { name: "Alternate carrier capacity", slack: "1 TL/day open", binding: true },
    ],
    nextBest: {
      label: "Absorb with safety stock",
      costDelta: -86000,
      whyLost: "Only covers one week; second week breaches fill-rate commitment.",
    },
    highlightNodeIds: [fromId, toId],
    highlightLaneIds: [laneId],
  };
}

export function explainForecastAccuracy(nodeId: string, materialCode: string): ExplanationCard {
  const acc = forecastAccuracy(nodeId, materialCode);
  getForecast(nodeId, materialCode);
  return {
    query: `how accurate was our forecast for ${materialCode} at ${nodeLabel(nodeId)}?`,
    decision: `Forecast accuracy over the last 26 weeks is ${(acc * 100).toFixed(1)}% (1 − MAPE on p50 vs actuals).`,
    expectedValue: 0,
    drivers: [
      { label: "p50 vs actual (over-forecast)", contribution: 0.31 },
      { label: "Seasonality capture", contribution: 0.22 },
      { label: "Promo lift miss", contribution: -0.14 },
    ],
    constraints: [
      { name: "Bias band ±5%", slack: acc > 0.9 ? "inside band" : "exceeds band", binding: acc <= 0.9 },
    ],
    nextBest: { label: "Hold prior model", costDelta: -0, whyLost: "Bias correction already improves accuracy +2.4 pts." },
    highlightNodeIds: [nodeId],
    highlightLaneIds: [],
  };
}

export function explainCustomerExposure(customerName: string, nodeIds: string[]): ExplanationCard {
  const cases = nodeIds.reduce((s, id) => s + (BATCHES_BY_NODE[id]?.length ?? 0), 0);
  return {
    query: `what is our exposure to ${customerName}?`,
    decision: `${customerName} is served from ${nodeIds.length} DCs with ${cases} tracked inbound batches; current fill-rate exposure is 2.6 pts under disruption.`,
    expectedValue: -420000,
    drivers: [
      { label: "Concentration in Midwest lanes", contribution: 0.29 },
      { label: "Freshness-day requirement", contribution: 0.21 },
      { label: "Dual-source coverage", contribution: -0.18 },
    ],
    constraints: [
      { name: "Customer freshness window", slack: "binds on 2 SKUs", binding: true },
      { name: "Fill-rate SLA 96%", slack: "0.1 pt headroom", binding: true },
    ],
    nextBest: { label: "Single-source from nearest DC", costDelta: -150000, whyLost: "Removes resilience; one lane failure breaches SLA." },
    highlightNodeIds: nodeIds,
    highlightLaneIds: [],
  };
}
