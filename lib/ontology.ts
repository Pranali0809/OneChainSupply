// Target positions for the abstract ontology view, expressed in the SAME
// lon/lat space as the map so the geo→ontology transition is a per-node
// interpolation, never a cut. Nodes settle into typed columns.
import { NODES } from "@/data/network";
import { NodeKind } from "./types";

const COLS: { kind: NodeKind; lon: number; label: string }[] = [
  { kind: "SUPPLIER", lon: -119, label: "Supplier" },
  { kind: "PLANT", lon: -106, label: "Plant / Line" },
  { kind: "DC", lon: -92, label: "Node (DC)" },
  { kind: "CUSTOMER_DC", lon: -78, label: "Customer DC" },
];

const LAT_TOP = 47.5;
const LAT_BOT = 28;

export const ONTOLOGY_POS: Record<string, [number, number]> = {};
export const ONTOLOGY_COLUMNS = COLS;

for (const col of COLS) {
  const group = NODES.filter((n) => n.kind === col.kind);
  group.forEach((n, i) => {
    const t = group.length > 1 ? i / (group.length - 1) : 0.5;
    const lat = LAT_TOP - t * (LAT_TOP - LAT_BOT);
    // slight horizontal jitter (deterministic by index) for an organic column
    const lon = col.lon + ((i % 2 === 0 ? -1 : 1) * (i % 3)) * 0.6;
    ONTOLOGY_POS[n.id] = [lon, lat];
  });
}

export function ontologyPos(id: string): [number, number] | undefined {
  return ONTOLOGY_POS[id];
}
