import { Rng, clamp, round } from "@/lib/rng";
import {
  TwinNode,
  Lane,
  NodeKind,
  Ownership,
  Temp,
  BusinessUnit,
  RiskScore,
  LaneMode,
  TWIN_VERSION,
} from "@/lib/types";

const VALID_FROM = "2026-01-05";
const VALID_TO = "2027-01-04";

interface Anchor {
  code: string;
  name: string;
  city: string;
  state: string;
  lon: number;
  lat: number;
  ownership?: Ownership;
  temp?: Temp;
  lines?: string[];
  customerCode?: string;
  bu?: BusinessUnit[];
}

// ── Plants (9) ──────────────────────────────────────────────────────────────
const PLANTS: Anchor[] = [
  { code: "PL-COV", name: "Covington", city: "Covington", state: "GA", lon: -83.86, lat: 33.6, lines: ["COV-L1", "COV-L2", "COV-L3", "COV-L4"], bu: ["PET", "SNACKS"] },
  { code: "PL-LBK", name: "Lubbock", city: "Lubbock", state: "TX", lon: -101.86, lat: 33.58, lines: ["LBK-L1", "LBK-L2", "LBK-L3"], bu: ["PET"] },
  { code: "PL-FAR", name: "Fargo", city: "Fargo", state: "ND", lon: -96.79, lat: 46.88, lines: ["FAR-L1", "FAR-L2"], bu: ["CEREAL"] },
  { code: "PL-MOD", name: "Modesto", city: "Modesto", state: "CA", lon: -120.99, lat: 37.64, lines: ["MOD-L1", "MOD-L2", "MOD-L3", "MOD-L4", "MOD-L5"], bu: ["CEREAL", "SNACKS"] },
  { code: "PL-COL", name: "Columbus", city: "Columbus", state: "OH", lon: -82.99, lat: 39.96, lines: ["COL-L1", "COL-L2", "COL-L3"], bu: ["CEREAL", "SNACKS"] },
  { code: "PL-ALL", name: "Allentown", city: "Allentown", state: "PA", lon: -75.47, lat: 40.6, lines: ["ALL-L1", "ALL-L2"], bu: ["SNACKS"] },
  { code: "PL-OMA", name: "Omaha", city: "Omaha", state: "NE", lon: -95.93, lat: 41.26, lines: ["OMA-L1", "OMA-L2", "OMA-L3"], bu: ["PET", "CEREAL"] },
  { code: "PL-SLC", name: "Salt Lake City", city: "Salt Lake City", state: "UT", lon: -111.89, lat: 40.76, lines: ["SLC-L1", "SLC-L2"], bu: ["SNACKS", "CEREAL"] },
  { code: "PL-OCA", name: "Ocala", city: "Ocala", state: "FL", lon: -82.13, lat: 29.19, lines: ["OCA-L1", "OCA-L2", "OCA-L3"], bu: ["PET"] },
];

// ── Distribution centers (14: 6 owned, 8 3PL) ────────────────────────────────
const DCS: Anchor[] = [
  { code: "DC-JOL", name: "Joliet", city: "Joliet", state: "IL", lon: -88.08, lat: 41.53, ownership: "3PL", temp: "DRY" },
  { code: "DC-RED", name: "Reed City", city: "Reed City", state: "MI", lon: -85.51, lat: 43.87, ownership: "OWNED", temp: "DRY" },
  { code: "DC-FTW", name: "Fort Worth", city: "Fort Worth", state: "TX", lon: -97.33, lat: 32.75, ownership: "OWNED", temp: "DRY" },
  { code: "DC-ONT", name: "Ontario", city: "Ontario", state: "CA", lon: -117.65, lat: 34.06, ownership: "3PL", temp: "TEMP" },
  { code: "DC-EDI", name: "Edison", city: "Edison", state: "NJ", lon: -74.41, lat: 40.52, ownership: "3PL", temp: "DRY" },
  { code: "DC-ATL", name: "Atlanta", city: "Atlanta", state: "GA", lon: -84.39, lat: 33.75, ownership: "OWNED", temp: "TEMP" },
  { code: "DC-MEM", name: "Memphis", city: "Memphis", state: "TN", lon: -90.05, lat: 35.15, ownership: "3PL", temp: "DRY" },
  { code: "DC-DEN", name: "Denver", city: "Denver", state: "CO", lon: -104.99, lat: 39.74, ownership: "OWNED", temp: "DRY" },
  { code: "DC-KC", name: "Kansas City", city: "Kansas City", state: "MO", lon: -94.58, lat: 39.1, ownership: "3PL", temp: "DRY" },
  { code: "DC-PHX", name: "Phoenix", city: "Phoenix", state: "AZ", lon: -112.07, lat: 33.45, ownership: "3PL", temp: "TEMP" },
  { code: "DC-ORL", name: "Orlando", city: "Orlando", state: "FL", lon: -81.38, lat: 28.54, ownership: "OWNED", temp: "DRY" },
  { code: "DC-SEA", name: "Kent", city: "Kent", state: "WA", lon: -122.23, lat: 47.38, ownership: "3PL", temp: "DRY" },
  { code: "DC-HAR", name: "Harrisburg", city: "Harrisburg", state: "PA", lon: -76.88, lat: 40.27, ownership: "OWNED", temp: "DRY" },
  { code: "DC-STO", name: "Stockton", city: "Stockton", state: "CA", lon: -121.29, lat: 37.96, ownership: "3PL", temp: "TEMP" },
];

// ── Retail customers (6) + their DCs (22) ────────────────────────────────────
export const CUSTOMERS = [
  { code: "CUST-WAL", name: "Walcott Stores" },
  { code: "CUST-GAG", name: "Gageton Markets" },
  { code: "CUST-RRR", name: "Red River Retail" },
  { code: "CUST-BYR", name: "Byrne Bros" },
  { code: "CUST-SUN", name: "Sunmark" },
  { code: "CUST-PAL", name: "Pallas Group" },
];

const CUSTOMER_DCS: Anchor[] = [
  { code: "CDC-WAL-BTN", name: "Walcott Bentonville", city: "Bentonville", state: "AR", lon: -94.21, lat: 36.37, customerCode: "CUST-WAL" },
  { code: "CDC-WAL-MOB", name: "Walcott Mobile", city: "Mobile", state: "AL", lon: -88.04, lat: 30.69, customerCode: "CUST-WAL" },
  { code: "CDC-WAL-HAG", name: "Walcott Hagerstown", city: "Hagerstown", state: "MD", lon: -77.72, lat: 39.64, customerCode: "CUST-WAL" },
  { code: "CDC-WAL-TMC", name: "Walcott Tomah", city: "Tomah", state: "WI", lon: -90.5, lat: 43.98, customerCode: "CUST-WAL" },
  { code: "CDC-WAL-RCH", name: "Walcott Red Oak", city: "Red Oak", state: "TX", lon: -96.8, lat: 32.52, customerCode: "CUST-WAL" },
  { code: "CDC-GAG-SPR", name: "Gageton Springfield", city: "Springfield", state: "MA", lon: -72.59, lat: 42.1, customerCode: "CUST-GAG" },
  { code: "CDC-GAG-ROC", name: "Gageton Rochelle", city: "Rochelle", state: "IL", lon: -89.07, lat: 41.92, customerCode: "CUST-GAG" },
  { code: "CDC-GAG-APP", name: "Gageton Apple Valley", city: "Apple Valley", state: "MN", lon: -93.22, lat: 44.73, customerCode: "CUST-GAG" },
  { code: "CDC-GAG-FRD", name: "Gageton Frederick", city: "Frederick", state: "MD", lon: -77.41, lat: 39.41, customerCode: "CUST-GAG" },
  { code: "CDC-RRR-SHR", name: "Red River Shreveport", city: "Shreveport", state: "LA", lon: -93.75, lat: 32.52, customerCode: "CUST-RRR" },
  { code: "CDC-RRR-SAN", name: "Red River San Antonio", city: "San Antonio", state: "TX", lon: -98.49, lat: 29.42, customerCode: "CUST-RRR" },
  { code: "CDC-RRR-TUL", name: "Red River Tulsa", city: "Tulsa", state: "OK", lon: -95.99, lat: 36.15, customerCode: "CUST-RRR" },
  { code: "CDC-BYR-LAK", name: "Byrne Lakeland", city: "Lakeland", state: "FL", lon: -81.95, lat: 28.04, customerCode: "CUST-BYR" },
  { code: "CDC-BYR-POO", name: "Byrne Pooler", city: "Pooler", state: "GA", lon: -81.25, lat: 32.12, customerCode: "CUST-BYR" },
  { code: "CDC-BYR-CHA", name: "Byrne Charlotte", city: "Charlotte", state: "NC", lon: -80.84, lat: 35.23, customerCode: "CUST-BYR" },
  { code: "CDC-SUN-TRC", name: "Sunmark Tracy", city: "Tracy", state: "CA", lon: -121.43, lat: 37.74, customerCode: "CUST-SUN" },
  { code: "CDC-SUN-MOR", name: "Sunmark Moreno Valley", city: "Moreno Valley", state: "CA", lon: -117.23, lat: 33.94, customerCode: "CUST-SUN" },
  { code: "CDC-SUN-KEN", name: "Sunmark Kent", city: "Kent", state: "WA", lon: -122.2, lat: 47.4, customerCode: "CUST-SUN" },
  { code: "CDC-SUN-GOO", name: "Sunmark Goodyear", city: "Goodyear", state: "AZ", lon: -112.42, lat: 33.44, customerCode: "CUST-SUN" },
  { code: "CDC-PAL-AUR", name: "Pallas Aurora", city: "Aurora", state: "CO", lon: -104.73, lat: 39.73, customerCode: "CUST-PAL" },
  { code: "CDC-PAL-LEN", name: "Pallas Lenexa", city: "Lenexa", state: "KS", lon: -94.73, lat: 38.95, customerCode: "CUST-PAL" },
  { code: "CDC-PAL-GRV", name: "Pallas Grove City", city: "Grove City", state: "OH", lon: -83.09, lat: 39.88, customerCode: "CUST-PAL" },
];

// ── Suppliers (12) ───────────────────────────────────────────────────────────
const SUPPLIERS: Anchor[] = [
  { code: "SUP-GRN", name: "Grainland Mills", city: "Wichita", state: "KS", lon: -97.34, lat: 37.69 },
  { code: "SUP-PRO", name: "ProMeal Proteins", city: "Sioux City", state: "IA", lon: -96.4, lat: 42.5 },
  { code: "SUP-CRN", name: "Cornbelt Starch", city: "Decatur", state: "IL", lon: -88.95, lat: 39.84 },
  { code: "SUP-OIL", name: "Western Oils", city: "Fresno", state: "CA", lon: -119.77, lat: 36.75 },
  { code: "SUP-PKG", name: "Apex Packaging", city: "Green Bay", state: "WI", lon: -88.02, lat: 44.51 },
  { code: "SUP-FLM", name: "ClearFilm Flex", city: "Charlotte", state: "NC", lon: -80.84, lat: 35.23 },
  { code: "SUP-CTN", name: "Carton Craft", city: "Memphis", state: "TN", lon: -90.0, lat: 35.1 },
  { code: "SUP-VIT", name: "VitaBlend Nutrients", city: "Newark", state: "NJ", lon: -74.17, lat: 40.73 },
  { code: "SUP-SUG", name: "Southland Sugar", city: "Baton Rouge", state: "LA", lon: -91.19, lat: 30.45 },
  { code: "SUP-FLV", name: "Keystone Flavors", city: "Cincinnati", state: "OH", lon: -84.51, lat: 39.1 },
  { code: "SUP-PAL", name: "Pallet Standard Co", city: "Portland", state: "OR", lon: -122.68, lat: 45.52 },
  { code: "SUP-LAB", name: "Label Dynamics", city: "Dallas", state: "TX", lon: -96.8, lat: 32.78 },
];

const rng = new Rng(0xc0ffee);

// Nodes flagged into elevated risk so the demo has a clear antagonist cluster.
const RISK_OVERRIDES: Record<string, number> = {
  "DC-JOL": 0.88, // Joliet — Beat 3 hero, age-risk cluster
  "DC-KC": 0.66,
  "DC-MEM": 0.58,
  "DC-RED": 0.31,
  "PL-OMA": 0.52,
  "DC-DEN": 0.44,
};

function makeRisks(
  kind: NodeKind,
  composite: number,
  code: string
): RiskScore[] {
  const r = (base: number) => clamp(base + rng.gauss(0, 0.05));
  const scaled = (w: number) => clamp(composite * w + rng.gauss(0, 0.06));

  const age: RiskScore = {
    kind: "age",
    label: "Age risk",
    value: kind === "DC" || kind === "CUSTOMER_DC" ? scaled(1.05) : scaled(0.5),
    threshold: 0.6,
    thresholdNote: "Batch passes last-ship-date before it moves",
    drivers: [
      { label: "National over-forecast", contribution: round(0.22 + rng.range(0, 0.1), 2) },
      { label: "CSF demand bias", contribution: round(0.16 + rng.range(0, 0.08), 2) },
      { label: "FEFO miss at node", contribution: round(0.11 + rng.range(0, 0.06), 2) },
      { label: "Shelf-life headroom", contribution: -round(0.08 + rng.range(0, 0.05), 2) },
    ],
  };
  const service: RiskScore = {
    kind: "service",
    label: "Service risk",
    value: scaled(0.72),
    threshold: 0.55,
    thresholdNote: "Node cannot cover forecast demand in horizon",
    drivers: [
      { label: "Forecast p90 spike", contribution: round(0.19 + rng.range(0, 0.08), 2) },
      { label: "Inbound lane reliability", contribution: round(0.14 + rng.range(0, 0.06), 2) },
      { label: "Safety stock buffer", contribution: -round(0.12 + rng.range(0, 0.05), 2) },
    ],
  };
  const fefo: RiskScore = {
    kind: "fefo",
    label: "FEFO miss risk",
    value: kind === "DC" ? scaled(0.9) : scaled(0.4),
    threshold: 0.5,
    thresholdNote: "Next pick violates first-expiry-first-out",
    drivers: [
      { label: "Slotting churn", contribution: round(0.17 + rng.range(0, 0.07), 2) },
      { label: "Mixed-batch pallets", contribution: round(0.13 + rng.range(0, 0.06), 2) },
      { label: "WMS FEFO enforcement", contribution: -round(0.1 + rng.range(0, 0.05), 2) },
    ],
  };
  const lane: RiskScore = {
    kind: "lane",
    label: "Lane risk",
    value: scaled(0.6),
    threshold: 0.5,
    thresholdNote: "Transit failure or capacity shortfall on primary lane",
    drivers: [
      { label: "Carrier capacity", contribution: round(0.2 + rng.range(0, 0.08), 2) },
      { label: "Seasonal congestion", contribution: round(0.12 + rng.range(0, 0.05), 2) },
    ],
  };
  const line: RiskScore = {
    kind: "line",
    label: "Line risk",
    value: kind === "PLANT" ? scaled(0.85) : r(0.08),
    threshold: 0.5,
    thresholdNote: "Production line runs below committed rate",
    drivers: [
      { label: "Changeover frequency", contribution: round(0.18 + rng.range(0, 0.07), 2) },
      { label: "OEE trend", contribution: round(0.11 + rng.range(0, 0.05), 2) },
      { label: "Predictive maintenance", contribution: -round(0.09 + rng.range(0, 0.04), 2) },
    ],
  };
  return [age, service, fefo, lane, line];
}

function sparkline(base: number): number[] {
  const out: number[] = [];
  let v = base;
  for (let i = 0; i < 12; i++) {
    v = clamp(v + rng.gauss(0, 0.08), 0.1, 1);
    out.push(round(v, 3));
  }
  return out;
}

function transitions(code: string): TwinNode["transitions"] {
  const events = [
    "Receipt posted",
    "Cycle count closed",
    "Deployment plan applied",
    "FEFO re-slot executed",
    "Inbound ASN confirmed",
    "Safety stock re-rated",
    "Risk score recomputed",
    "Outbound wave released",
    "Hold placed on batch",
    "Repositioning approved",
    "Carrier tender accepted",
    "Twin snapshot committed",
  ];
  return events.map((label, i) => ({
    week: 26 - 12 + i,
    label,
    detail: `${code} · auto-logged to decision ledger`,
  }));
}

function buildNode(a: Anchor, kind: NodeKind): TwinNode {
  const ownership: Ownership =
    kind === "PLANT"
      ? "OWNED"
      : kind === "CUSTOMER_DC"
      ? "CUSTOMER"
      : kind === "SUPPLIER"
      ? "SUPPLIER"
      : a.ownership ?? "OWNED";
  const temp: Temp = a.temp ?? (rng.chance(0.3) ? "TEMP" : "DRY");
  const throughput =
    kind === "PLANT"
      ? rng.int(38000, 92000)
      : kind === "DC"
      ? rng.int(22000, 61000)
      : kind === "CUSTOMER_DC"
      ? rng.int(9000, 34000)
      : rng.int(14000, 40000);

  const composite = clamp(
    RISK_OVERRIDES[a.code] ??
      (kind === "SUPPLIER"
        ? rng.range(0.12, 0.4)
        : kind === "CUSTOMER_DC"
        ? rng.range(0.1, 0.38)
        : rng.range(0.18, 0.55))
  );

  const bu: BusinessUnit[] =
    a.bu ??
    rng.shuffle<BusinessUnit>(["PET", "CEREAL", "SNACKS"]).slice(
      0,
      rng.int(1, 3)
    );

  const onHand = Math.round(throughput * rng.range(0.9, 2.4));

  return {
    id: a.code,
    code: a.code,
    name: a.name,
    city: a.city,
    state: a.state,
    kind,
    ownership,
    temp,
    lon: a.lon,
    lat: a.lat,
    throughput,
    lines: a.lines,
    customerCode: a.customerCode,
    businessUnits: bu,
    onHandCases: onHand,
    daysOfSupply: round(rng.range(6, 34), 1),
    composite: round(composite, 3),
    risks: makeRisks(kind, composite, a.code).map((r) => ({
      ...r,
      value: round(r.value, 3),
    })),
    sparkline: sparkline(clamp(0.4 + composite * 0.3)),
    transitions: transitions(a.code),
    validFrom: VALID_FROM,
    validTo: VALID_TO,
    twinVersion: TWIN_VERSION,
  };
}

export const NODES: TwinNode[] = [
  ...PLANTS.map((a) => buildNode(a, "PLANT")),
  ...DCS.map((a) => buildNode(a, "DC")),
  ...CUSTOMER_DCS.map((a) => buildNode(a, "CUSTOMER_DC")),
  ...SUPPLIERS.map((a) => buildNode(a, "SUPPLIER")),
];

export const NODE_BY_ID: Record<string, TwinNode> = Object.fromEntries(
  NODES.map((n) => [n.id, n])
);

// ── Lanes ────────────────────────────────────────────────────────────────────
function dist(a: TwinNode, b: TwinNode): number {
  const dx = (a.lon - b.lon) * Math.cos(((a.lat + b.lat) / 2) * (Math.PI / 180));
  const dy = a.lat - b.lat;
  return Math.sqrt(dx * dx + dy * dy) * 69; // approx miles
}

function pickMode(miles: number): LaneMode {
  if (miles > 1400) return rng.chance(0.55) ? "INTERMODAL" : "RAIL";
  if (miles > 700) return rng.chance(0.4) ? "INTERMODAL" : "TRUCKLOAD";
  return rng.chance(0.15) ? "LTL" : "TRUCKLOAD";
}

function nearest(node: TwinNode, pool: TwinNode[], k: number): TwinNode[] {
  return [...pool]
    .filter((n) => n.id !== node.id)
    .sort((a, b) => dist(node, a) - dist(node, b))
    .slice(0, k);
}

const plants = NODES.filter((n) => n.kind === "PLANT");
const dcs = NODES.filter((n) => n.kind === "DC");
const custDcs = NODES.filter((n) => n.kind === "CUSTOMER_DC");
const suppliers = NODES.filter((n) => n.kind === "SUPPLIER");

const laneSet = new Map<string, Lane>();

function addLane(from: TwinNode, to: TwinNode) {
  const key = `${from.id}->${to.id}`;
  if (laneSet.has(key)) return;
  const miles = dist(from, to);
  const mode = pickMode(miles);
  const transitDays = Math.max(
    1,
    Math.round(miles / (mode === "RAIL" ? 450 : mode === "INTERMODAL" ? 520 : 620))
  );
  const reliability = round(
    clamp(
      0.97 -
        (mode === "RAIL" ? 0.08 : mode === "INTERMODAL" ? 0.05 : 0.02) -
        rng.range(0, 0.06)
    ),
    2
  );
  const volume = Math.round(
    Math.min(from.throughput, to.throughput) * rng.range(0.08, 0.3)
  );
  const utilization = round(clamp(rng.range(0.45, 0.98)), 2);
  const risk = round(
    clamp((1 - reliability) * 2 + (utilization > 0.9 ? 0.2 : 0) + rng.gauss(0, 0.05)),
    2
  );
  laneSet.set(key, {
    id: `LN-${from.code.replace(/^[A-Z]+-/, "")}-${to.code.replace(/^[A-Z]+-/, "")}-${mode.slice(0, 2)}`,
    from: from.id,
    to: to.id,
    mode,
    transitDays,
    costPerCwt: round(2.4 + miles * 0.0017 + rng.range(0, 0.9), 2),
    reliability,
    volume,
    utilization,
    risk,
    twinVersion: TWIN_VERSION,
  });
}

// Supplier -> Plant (inbound raw/packaging)
suppliers.forEach((s) => nearest(s, plants, rng.int(2, 3)).forEach((p) => addLane(s, p)));
// Plant -> DC (primary deployment)
plants.forEach((p) => nearest(p, dcs, rng.int(4, 6)).forEach((d) => addLane(p, d)));
// DC -> DC (repositioning)
dcs.forEach((d) => nearest(d, dcs, 3).forEach((d2) => addLane(d, d2)));
// DC -> Customer DC (outbound)
custDcs.forEach((c) => nearest(c, dcs, rng.int(3, 4)).forEach((d) => addLane(d, c)));

export const LANES: Lane[] = Array.from(laneSet.values());

export const LANE_BY_ID: Record<string, Lane> = Object.fromEntries(
  LANES.map((l) => [l.id, l])
);

export const NETWORK_STATS = {
  plants: plants.length,
  dcs: dcs.length,
  customerDcs: custDcs.length,
  suppliers: suppliers.length,
  lanes: LANES.length,
  nodes: NODES.length,
};
