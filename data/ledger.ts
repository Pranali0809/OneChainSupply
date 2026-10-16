import { LedgerEntry } from "@/lib/types";
import { Rng, round } from "@/lib/rng";
import { BATCHES } from "./inventory";
import { NODES } from "./network";

const rng = new Rng(0x1ed6e4);

const ACTORS = [
  "A. Reyes (Deploy)",
  "M. Okafor (Planning)",
  "ONECHAIN · auto",
  "J. Halloran (Logistics)",
  "S. Patel (S&OP)",
  "D. Cho (Waste)",
];

const TEMPLATES = [
  { title: "Reposition at-risk stock", rationale: "Age risk above threshold; nearest DC has open demand within freshness window." },
  { title: "Hold batch for FEFO re-slot", rationale: "Mixed-batch pallet flagged; re-slot restores first-expiry-first-out pick order." },
  { title: "Deployment push", rationale: "Service risk rising on forward p90; push cover from upstream plant." },
  { title: "Markdown + donate residual", rationale: "Remaining shelf life below customer freshness requirement; recover partial value." },
  { title: "Truck build consolidation", rationale: "Two partial loads combined to protect freight cost and service window." },
  { title: "Raw-material order deferral", rationale: "Working capital pressure; demand signal softened, defer one cycle." },
];

const STATUSES: LedgerEntry["status"][] = [
  "executed",
  "approved",
  "recommended",
  "overridden",
];

const entries: LedgerEntry[] = [];

// Hero decision referenced by Beat 6 NLQ — must exist exactly.
entries.push({
  id: "DEC-00417",
  objectId: "B-4471188-26W38-COV",
  objectLabel: "Batch B-4471188-26W38-COV · Joliet",
  title: "Reposition 1,840 cs Joliet → Reed City",
  status: "executed",
  expectedValue: 169_280,
  realizedValue: 162_400,
  actor: "A. Reyes (Deploy)",
  week: 24,
  rationale:
    "Repositioned instead of donated. Reed City has open Walcott demand inside the 60-day freshness window; move preserves case value net of freight.",
});

let n = 1;
for (const node of NODES) {
  if (node.kind === "SUPPLIER") continue;
  const count = node.composite > 0.6 ? rng.int(4, 7) : rng.int(1, 3);
  for (let i = 0; i < count; i++) {
    const tpl = rng.pick(TEMPLATES);
    const status = rng.pick(STATUSES);
    const ev = rng.int(8, 240) * 1000;
    const nodeBatches = BATCHES.filter((b) => b.nodeId === node.id);
    const batch = nodeBatches.length ? rng.pick(nodeBatches) : null;
    const realized =
      status === "executed"
        ? Math.round(ev * rng.range(0.82, 1.08))
        : status === "approved"
        ? Math.round(ev * rng.range(0.9, 1.02))
        : null;
    entries.push({
      id: `DEC-${String(1000 + n).padStart(5, "0")}`,
      objectId: batch ? batch.id : node.id,
      objectLabel: batch
        ? `Batch ${batch.id} · ${node.name}`
        : `${node.code} · ${node.name}`,
      title: tpl.title,
      status,
      expectedValue: ev,
      realizedValue: realized,
      actor: rng.pick(ACTORS),
      week: rng.int(14, 25),
      rationale: tpl.rationale,
    });
    n++;
  }
}

export const LEDGER: LedgerEntry[] = entries;

export const LEDGER_BY_OBJECT: Record<string, LedgerEntry[]> = {};
for (const e of LEDGER) {
  (LEDGER_BY_OBJECT[e.objectId] ||= []).push(e);
}

export function ledgerForObject(objectId: string): LedgerEntry[] {
  return LEDGER_BY_OBJECT[objectId] || [];
}

export const LEDGER_STATS = {
  total: LEDGER.length,
  executed: LEDGER.filter((e) => e.status === "executed").length,
  realizedValue: LEDGER.filter((e) => e.realizedValue != null).reduce(
    (s, e) => s + (e.realizedValue || 0),
    0
  ),
};

void round;
