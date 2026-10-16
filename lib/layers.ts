import { TwinNode, Lane } from "./types";

export type LayerId =
  | "flows"
  | "age"
  | "service"
  | "fefo"
  | "lane"
  | "line"
  | "inventory"
  | "uncertainty"
  | "cost";

export interface LayerDef {
  id: LayerId;
  label: string;
  short: string; // single-char glyph for the rail
  key: string; // keyboard shortcut
  kind: "flow" | "node" | "lane" | "density";
  meaning: string; // one-line plain-language definition
  encoding: string; // what color / size / ring / hatch means
  ramp: "risk" | "blue" | "flow"; // key-chip gradient
}

export const LAYERS: LayerDef[] = [
  { id: "flows", label: "Flows", short: "⇄", key: "1", kind: "flow", meaning: "material in motion along active lanes.", encoding: "Blue = in motion. Particle density = flow rate.", ramp: "flow" },
  { id: "age", label: "Age risk", short: "◷", key: "2", kind: "node", meaning: "chance a batch passes its last-ship-date before it moves.", encoding: "Red = high. Size = cases at risk. Badge = worst remaining shelf.", ramp: "risk" },
  { id: "service", label: "Service risk", short: "◉", key: "3", kind: "node", meaning: "chance a node cannot cover forecast demand in the horizon.", encoding: "Red = high. Territory tint + ring-gauge arc = probability.", ramp: "risk" },
  { id: "fefo", label: "FEFO compliance", short: "⧗", key: "4", kind: "node", meaning: "whether the next pick honors first-expiry-first-out.", encoding: "Hatched = mixed-batch pallets. Badge = compliance %.", ramp: "risk" },
  { id: "lane", label: "Lane reliability", short: "≋", key: "5", kind: "lane", meaning: "probability of transit failure or capacity shortfall.", encoding: "Red + thick = unreliable lane.", ramp: "risk" },
  { id: "line", label: "Line health", short: "⌁", key: "6", kind: "node", meaning: "whether a production line runs below committed rate.", encoding: "Plants enlarge. Radial bars = actual vs committed per line.", ramp: "risk" },
  { id: "inventory", label: "Inventory density", short: "▦", key: "7", kind: "density", meaning: "days of supply held at each node.", encoding: "Red = high density. Size = on-hand.", ramp: "risk" },
  { id: "uncertainty", label: "Forecast uncertainty", short: "∿", key: "8", kind: "density", meaning: "width of the demand band (p90 − p10).", encoding: "Blue halo radius = band width. Wide = low confidence.", ramp: "blue" },
  { id: "cost", label: "Cost to serve", short: "$", key: "9", kind: "node", meaning: "fully-loaded cost to serve, per case and per lane.", encoding: "Blue. Lane width = $/cwt. Node size = $/case. Labels = 3 costliest lanes.", ramp: "blue" },
];

export const LAYER_BY_ID: Record<LayerId, LayerDef> = Object.fromEntries(
  LAYERS.map((l) => [l.id, l])
) as Record<LayerId, LayerDef>;

// Value a node expresses under a given layer (0..1, higher = hotter).
export function nodeLayerValue(node: TwinNode, layer: LayerId): number {
  const r = (k: string) => node.risks.find((x) => x.kind === k)?.value ?? 0;
  switch (layer) {
    case "age":
      return r("age");
    case "service":
      return r("service");
    case "fefo":
      return r("fefo");
    case "line":
      return node.kind === "PLANT" ? r("line") : 0.05;
    case "inventory":
      return Math.min(1, node.daysOfSupply / 34);
    case "uncertainty":
      return Math.min(1, node.composite * 0.7 + (node.kind === "CUSTOMER_DC" ? 0.2 : 0.1));
    case "cost":
      return Math.min(1, node.composite * 0.5 + 0.2);
    default:
      return node.composite;
  }
}

// Value a lane expresses under a given layer.
export function laneLayerValue(lane: Lane, layer: LayerId): number {
  switch (layer) {
    case "lane":
      return 1 - lane.reliability;
    case "flows":
      return lane.utilization;
    default:
      return lane.utilization * 0.6;
  }
}
