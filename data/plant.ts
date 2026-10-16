import { Rng, clamp, round } from "@/lib/rng";
import { BusinessUnit } from "@/lib/types";
import { NODES, NODE_BY_ID } from "./network";
import { MATERIALS_BY_BU, MATERIAL_BY_CODE, HERO_MATERIAL } from "./materials";

export const HOURS_PER_WEEK = 110; // operating hours

export type MachineKind = "filler" | "sealer" | "casepacker" | "palletizer" | "metaldetector" | "vision";

export interface Machine {
  id: string;
  name: string;
  kind: MachineKind;
  risk: number; // 0..1 health (higher = worse)
  rulDays: number; // remaining useful life
}

export interface PlantLine {
  id: string;
  committedRate: number; // cs/hr nameplate
  actualRate: number; // cs/hr achieved
  availability: number;
  performance: number;
  quality: number;
  oee: number; // availability * performance * quality
  weeklyCases: number; // nameplate weekly capacity (sums to plant throughput)
  yieldPct: number;
  energyPerCase: number; // kWh/case
  risk: number; // line risk 0..1
  machines: Machine[];
}

export interface PlantOrder {
  id: string;
  materialCode: string;
  desc: string;
  family: BusinessUnit;
  qtyCases: number;
}

export interface PlantData {
  plantId: string;
  hoursPerWeek: number;
  lines: PlantLine[];
  changeover: Record<BusinessUnit, Record<BusinessUnit, number>>; // minutes
  sequence: PlantOrder[];
  totalWeeklyCases: number;
  rateCsPerHr: number; // sum of committed rates
  baselineChangeoverMin: number;
}

const MACHINE_ORDER: { kind: MachineKind; name: string }[] = [
  { kind: "filler", name: "Filler" },
  { kind: "sealer", name: "Sealer" },
  { kind: "casepacker", name: "Case Packer" },
  { kind: "palletizer", name: "Palletizer" },
];

// deterministic integer split of total into n weighted parts that sums exactly
function splitInt(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => (w / sum) * total);
  const out = raw.map((x) => Math.floor(x));
  let rem = total - out.reduce((a, b) => a + b, 0);
  const frac = raw.map((x, i) => ({ i, f: x - Math.floor(x) })).sort((a, b) => b.f - a.f);
  for (let k = 0; k < rem; k++) out[frac[k % frac.length].i] += 1;
  return out;
}

function changeoverMatrix(rng: Rng): Record<BusinessUnit, Record<BusinessUnit, number>> {
  const fams: BusinessUnit[] = ["PET", "CEREAL", "SNACKS"];
  const m = {} as Record<BusinessUnit, Record<BusinessUnit, number>>;
  for (const a of fams) {
    m[a] = {} as Record<BusinessUnit, number>;
    for (const b of fams) {
      m[a][b] = a === b ? rng.int(12, 22) : rng.int(38, 74);
    }
  }
  return m;
}

export function changeoverForSequence(
  seq: PlantOrder[],
  matrix: Record<BusinessUnit, Record<BusinessUnit, number>>
): number {
  let total = 0;
  for (let i = 1; i < seq.length; i++) {
    total += matrix[seq[i - 1].family][seq[i].family];
  }
  return total;
}

// Best (minimum-changeover) order: group families together via nearest-neighbour.
export function optimizeSequence(
  seq: PlantOrder[],
  matrix: Record<BusinessUnit, Record<BusinessUnit, number>>
): PlantOrder[] {
  if (seq.length <= 2) return [...seq];
  const remaining = [...seq];
  const result: PlantOrder[] = [remaining.shift()!];
  while (remaining.length) {
    const last = result[result.length - 1];
    let bestIdx = 0;
    let best = Infinity;
    remaining.forEach((o, i) => {
      const c = matrix[last.family][o.family];
      if (c < best) {
        best = c;
        bestIdx = i;
      }
    });
    result.push(remaining.splice(bestIdx, 1)[0]);
  }
  return result;
}

function buildPlant(plantId: string): PlantData | null {
  const node = NODE_BY_ID[plantId];
  if (!node || node.kind !== "PLANT" || !node.lines) return null;
  const rng = new Rng(hashSeed(plantId));
  const lineIds = node.lines;
  const lineRisk = node.risks.find((r) => r.kind === "line")?.value ?? 0.4;

  // weekly cases split so lines sum exactly to the plant's map throughput
  const weights = lineIds.map(() => rng.range(0.7, 1.4));
  const weekly = splitInt(node.throughput, weights);

  const lines: PlantLine[] = lineIds.map((id, i) => {
    const availability = round(clamp(rng.range(0.86, 0.98)), 3);
    const performance = round(clamp(rng.range(0.82, 0.97)), 3);
    const quality = round(clamp(rng.range(0.95, 0.995)), 3);
    const oee = availability * performance * quality; // exact product of the factors
    const weeklyCases = weekly[i];
    const committedRate = Math.round(weeklyCases / HOURS_PER_WEEK);
    const actualRate = Math.round(committedRate * performance);
    const lastStation: { kind: MachineKind; name: string } =
      i === 0 ? { kind: "vision", name: "Vision Station" } : { kind: "metaldetector", name: "Metal Detector" };

    // one asset per line carries lower RUL; the first plant line has a critical one
    const machines: Machine[] = [...MACHINE_ORDER, lastStation].map((mt, mi) => {
      const baseRisk = clamp(lineRisk * 0.6 + rng.gauss(0, 0.12));
      const low = i === 0 && mi === 2; // Case Packer on L1 is near end-of-life
      const rulDays = low ? rng.int(6, 16) : rng.int(40, 320);
      return {
        id: `${id}-${mt.kind.toUpperCase().slice(0, 3)}`,
        name: mt.name,
        kind: mt.kind,
        risk: round(low ? clamp(0.62 + rng.range(0, 0.1)) : baseRisk, 3),
        rulDays,
      };
    });

    const risk = round(clamp(Math.max(...machines.map((m) => m.risk)) * 0.7 + lineRisk * 0.3), 3);

    return {
      id,
      committedRate,
      actualRate,
      availability,
      performance,
      quality,
      oee,
      weeklyCases,
      yieldPct: round(quality * 100 - rng.range(0.2, 1.4), 1),
      energyPerCase: round(rng.range(0.28, 0.62), 3),
      risk,
      machines,
    };
  });

  const matrix = changeoverMatrix(rng);

  // 12-order weekly sequence across the plant's business units (hero batch seeded in)
  const fams = node.businessUnits;
  const orders: PlantOrder[] = [];
  for (let i = 0; i < 12; i++) {
    let materialCode: string;
    let family: BusinessUnit;
    if (plantId === "PL-COV" && i === 3) {
      materialCode = HERO_MATERIAL;
      family = "PET";
    } else {
      family = rng.pick(fams);
      const pool = MATERIALS_BY_BU[family];
      materialCode = pool.length ? rng.pick(pool).code : HERO_MATERIAL;
    }
    const mat = MATERIAL_BY_CODE[materialCode];
    orders.push({
      id: `ORD-${plantId.replace("PL-", "")}-${String(i + 1).padStart(2, "0")}`,
      materialCode,
      desc: mat?.desc ?? materialCode,
      family,
      qtyCases: rng.int(6, 22) * 100,
    });
  }

  const rateCsPerHr = lines.reduce((s, l) => s + l.committedRate, 0);
  const totalWeeklyCases = lines.reduce((s, l) => s + l.weeklyCases, 0);

  return {
    plantId,
    hoursPerWeek: HOURS_PER_WEEK,
    lines,
    changeover: matrix,
    sequence: orders,
    totalWeeklyCases,
    rateCsPerHr,
    baselineChangeoverMin: changeoverForSequence(orders, matrix),
  };
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const cache: Record<string, PlantData | null> = {};
export function getPlant(plantId: string): PlantData | null {
  if (!(plantId in cache)) cache[plantId] = buildPlant(plantId);
  return cache[plantId];
}

// Aggregate line risk a plant's node exposes (reconciles with the Inspector gauge).
export function plantLineRisk(plantId: string): number {
  const p = getPlant(plantId);
  if (!p) return 0;
  return Math.max(...p.lines.map((l) => l.risk));
}

// Reconcile each plant node's line-risk value with its floor data, so the map's
// Line health layer and the Inspector gauge match the plant screen exactly.
NODES.forEach((n) => {
  if (n.kind !== "PLANT") return;
  const r = n.risks.find((x) => x.kind === "line");
  if (r) r.value = plantLineRisk(n.id);
});
