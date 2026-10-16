import { Rng, clamp, round } from "@/lib/rng";
import { Batch, TWIN_VERSION } from "@/lib/types";
import { NODES, NODE_BY_ID } from "./network";
import { MATERIALS_BY_BU, MATERIAL_BY_CODE, HERO_MATERIAL } from "./materials";

const rng = new Rng(0xba7c4);
const NOW = new Date("2026-10-15T00:00:00Z");

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86400000);
}
function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function isoWeek(d: Date): string {
  const start = new Date("2026-01-01T00:00:00Z");
  const w = Math.floor((d.getTime() - start.getTime()) / (7 * 86400000)) + 1;
  return `26W${String(Math.max(1, w)).padStart(2, "0")}`;
}

// Batches live at DCs and plants (finished goods staged for deployment).
const stockNodes = NODES.filter((n) => n.kind === "DC" || n.kind === "PLANT");

const batches: Batch[] = [];

// ── Hero batch, exactly as scripted ──────────────────────────────────────────
(() => {
  const mat = MATERIAL_BY_CODE[HERO_MATERIAL];
  const isd = new Date("2026-09-21T00:00:00Z");
  const production = addDays(isd, -9);
  const remaining = 41; // days of remaining shelf life (Beat 3)
  const expiry = addDays(NOW, remaining);
  const lastShip = addDays(expiry, -mat.minRemainingShipDays);
  batches.push({
    id: "B-4471188-26W38-COV",
    materialCode: HERO_MATERIAL,
    nodeId: "DC-JOL",
    productionDate: iso(production),
    isd: iso(isd),
    expiry: iso(expiry),
    lastShipDate: iso(lastShip),
    qtyCases: 1840,
    remainingShelfDays: remaining,
    ageRisk: 0.91,
    fefoFlag: true,
    twinVersion: TWIN_VERSION,
  });
})();

// ── General batch population (~2,400 total) ──────────────────────────────────
const TARGET = 2400;
let guard = 0;
while (batches.length < TARGET && guard < TARGET * 3) {
  guard++;
  const node = rng.pick(stockNodes);
  const bu = rng.pick(node.businessUnits);
  const pool = MATERIALS_BY_BU[bu];
  if (!pool.length) continue;
  const mat = rng.pick(pool);

  const shelf = mat.shelfLifeDays;
  // age the batch somewhere across its life, skewed so DCs with high composite
  // risk carry proportionally older stock
  const ageBias = node.composite * 0.55;
  const consumedFrac = clamp(rng.range(0.05, 0.75) + ageBias * rng.range(0, 0.6));
  const ageDays = Math.round(shelf * consumedFrac);
  const production = addDays(NOW, -ageDays);
  const isd = addDays(production, rng.int(5, 16));
  const expiry = addDays(production, shelf);
  const remaining = Math.round((expiry.getTime() - NOW.getTime()) / 86400000);
  const lastShip = addDays(expiry, -mat.minRemainingShipDays);

  const remFrac = clamp(remaining / shelf);
  const ageRisk = round(
    clamp(
      (1 - remFrac) * 0.9 +
        node.composite * 0.25 +
        (remaining < mat.minRemainingShipDays ? 0.25 : 0) +
        rng.gauss(0, 0.05)
    ),
    3
  );
  const fefoFlag = rng.chance(0.12 + node.composite * 0.25);

  batches.push({
    id: `B-${mat.code}-${isoWeek(production)}-${node.code.replace(/^[A-Z]+-/, "")}`,
    materialCode: mat.code,
    nodeId: node.id,
    productionDate: iso(production),
    isd: iso(isd),
    expiry: iso(expiry),
    lastShipDate: iso(lastShip),
    qtyCases: rng.int(180, 3200),
    remainingShelfDays: remaining,
    ageRisk,
    fefoFlag,
    twinVersion: TWIN_VERSION,
  });
}

// Guarantee a visible red cluster at Joliet (Beat 3).
const joliet = batches.filter((b) => b.nodeId === "DC-JOL");
joliet.slice(0, Math.min(14, joliet.length)).forEach((b, i) => {
  if (b.id === "B-4471188-26W38-COV") return;
  b.ageRisk = round(clamp(0.74 + i * 0.012 + rng.range(0, 0.08)), 3);
  b.fefoFlag = i % 3 !== 0;
  b.remainingShelfDays = Math.min(b.remainingShelfDays, rng.int(28, 66));
});

export const BATCHES: Batch[] = batches;

export const BATCHES_BY_NODE: Record<string, Batch[]> = {};
for (const b of BATCHES) {
  (BATCHES_BY_NODE[b.nodeId] ||= []).push(b);
}
for (const id in BATCHES_BY_NODE) {
  BATCHES_BY_NODE[id].sort((a, b) => b.ageRisk - a.ageRisk);
}

export const BATCHES_BY_MATERIAL: Record<string, Batch[]> = {};
for (const b of BATCHES) {
  (BATCHES_BY_MATERIAL[b.materialCode] ||= []).push(b);
}

export function onHandForNode(nodeId: string): number {
  return (BATCHES_BY_NODE[nodeId] || []).reduce((s, b) => s + b.qtyCases, 0);
}

export function atRiskBatches(nodeId: string, threshold = 0.6): Batch[] {
  return (BATCHES_BY_NODE[nodeId] || []).filter((b) => b.ageRisk >= threshold);
}

export const BATCH_COUNT = BATCHES.length;
export const HERO_BATCH_ID = "B-4471188-26W38-COV";

// Reconcile node on-hand with actual batch quantities so numbers agree app-wide.
for (const n of NODES) {
  if (BATCHES_BY_NODE[n.id]) {
    n.onHandCases = onHandForNode(n.id);
    n.daysOfSupply = round(
      clamp((n.onHandCases / Math.max(1, n.throughput)) * 7, 1, 60),
      1
    );
  }
}

void NODE_BY_ID;
