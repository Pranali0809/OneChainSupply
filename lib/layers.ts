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
}

export const LAYERS: LayerDef[] = [
  { id: "flows", label: "Flows", short: "⇄", key: "1", kind: "flow" },
  { id: "age", label: "Age risk", short: "◷", key: "2", kind: "node" },
  { id: "service", label: "Service risk", short: "◉", key: "3", kind: "node" },
  { id: "fefo", label: "FEFO compliance", short: "⧗", key: "4", kind: "node" },
  { id: "lane", label: "Lane reliability", short: "≋", key: "5", kind: "lane" },
  { id: "line", label: "Line health", short: "⌁", key: "6", kind: "node" },
  { id: "inventory", label: "Inventory density", short: "▦", key: "7", kind: "density" },
  { id: "uncertainty", label: "Forecast uncertainty", short: "∿", key: "8", kind: "density" },
  { id: "cost", label: "Cost to serve", short: "$", key: "9", kind: "node" },
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
