// Risk ramp + shared color helpers. One accent, restraint everywhere else.

export const COLORS = {
  accent: [77, 225, 193] as [number, number, number],
  flow: [106, 169, 255] as [number, number, number],
  riskLow: [61, 214, 140] as [number, number, number],
  riskMed: [245, 185, 68] as [number, number, number],
  riskHigh: [255, 107, 90] as [number, number, number],
  riskCrit: [255, 59, 107] as [number, number, number],
  textLow: [92, 102, 120] as [number, number, number],
};

type RGB = [number, number, number];

function lerp(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

// map 0..1 risk onto the low→med→high→crit ramp
export function riskRamp(v: number): RGB {
  const x = Math.max(0, Math.min(1, v));
  if (x < 0.4) return lerp(COLORS.riskLow, COLORS.riskMed, x / 0.4);
  if (x < 0.7) return lerp(COLORS.riskMed, COLORS.riskHigh, (x - 0.4) / 0.3);
  return lerp(COLORS.riskHigh, COLORS.riskCrit, (x - 0.7) / 0.3);
}

export function riskRampHex(v: number): string {
  const [r, g, b] = riskRamp(v);
  return `rgb(${r},${g},${b})`;
}

// Sequential blue ramp for non-risk metrics (cost, forecast uncertainty) so red
// never reads as danger where none exists.
const BLUE_LO: RGB = [26, 54, 93];
const BLUE_HI: RGB = [120, 190, 255];
export function blueRamp(v: number): RGB {
  return lerp(BLUE_LO, BLUE_HI, Math.max(0, Math.min(1, v)));
}
export function blueRampHex(v: number): string {
  const [r, g, b] = blueRamp(v);
  return `rgb(${r},${g},${b})`;
}

export function riskTier(v: number): "low" | "med" | "high" | "crit" {
  if (v < 0.4) return "low";
  if (v < 0.7) return "med";
  if (v < 0.85) return "high";
  return "crit";
}

export const riskTierColor: Record<string, string> = {
  low: "var(--risk-low)",
  med: "var(--risk-med)",
  high: "var(--risk-high)",
  crit: "var(--risk-crit)",
};

export function withAlpha(rgb: RGB, a: number): [number, number, number, number] {
  return [rgb[0], rgb[1], rgb[2], Math.round(a * 255)];
}
