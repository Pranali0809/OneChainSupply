// Builds a white shape atlas on a canvas so deck.gl's IconLayer can render the
// four node archetypes (plant=hexagon, DC=circle, customer=square,
// supplier=triangle) and tint each by its risk color. Client-only.
import { NodeKind } from "./types";

const CELL = 128;
const PAD = 14;

export interface IconAtlas {
  image: HTMLCanvasElement;
  mapping: Record<string, { x: number; y: number; width: number; height: number; anchorY: number; anchorX: number }>;
}

const KINDS: NodeKind[] = ["PLANT", "DC", "CUSTOMER_DC", "SUPPLIER"];

function drawShape(ctx: CanvasRenderingContext2D, kind: NodeKind, cx: number, cy: number, r: number) {
  ctx.beginPath();
  if (kind === "DC") {
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
  } else if (kind === "CUSTOMER_DC") {
    ctx.rect(cx - r * 0.86, cy - r * 0.86, r * 1.72, r * 1.72);
  } else if (kind === "SUPPLIER") {
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r * 0.92, cy + r * 0.72);
    ctx.lineTo(cx - r * 0.92, cy + r * 0.72);
    ctx.closePath();
  } else {
    // hexagon (plant)
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      const x = cx + r * Math.cos(a);
      const y = cy + r * Math.sin(a);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
  }
}

let cached: IconAtlas | null = null;

export function buildIconAtlas(): IconAtlas {
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = CELL * KINDS.length;
  canvas.height = CELL;
  const ctx = canvas.getContext("2d")!;
  const mapping: IconAtlas["mapping"] = {};
  KINDS.forEach((kind, i) => {
    const ox = i * CELL;
    const cx = ox + CELL / 2;
    const cy = CELL / 2;
    const r = CELL / 2 - PAD;
    // filled white (tinted later) + crisp inner ring
    ctx.save();
    drawShape(ctx, kind, cx, cy, r);
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fill();
    ctx.restore();
    mapping[kind] = { x: ox, y: 0, width: CELL, height: CELL, anchorX: CELL / 2, anchorY: CELL / 2 };
  });
  cached = { image: canvas, mapping };
  return cached;
}
