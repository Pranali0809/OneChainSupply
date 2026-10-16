// Small geographic-geometry helpers for layer encodings (territories, ring
// gauges, line mini-bars). All output is lon/lat so it rides the MapView.

const D2R = Math.PI / 180;

function lonScale(lat: number) {
  return 1 / Math.max(0.2, Math.cos(lat * D2R));
}

// Regular polygon ring around a center (closed).
export function polyRing(lon: number, lat: number, rDeg: number, sides = 6, rot = 0): number[][] {
  const ls = lonScale(lat);
  const out: number[][] = [];
  for (let i = 0; i <= sides; i++) {
    const a = rot + (i / sides) * Math.PI * 2;
    out.push([lon + Math.cos(a) * rDeg * ls, lat + Math.sin(a) * rDeg]);
  }
  return out;
}

// Open arc path from angle a0→a1 (radians, 0 = east, CCW), for ring gauges.
export function arcPath(lon: number, lat: number, rDeg: number, a0: number, a1: number, steps = 36): number[][] {
  const ls = lonScale(lat);
  const out: number[][] = [];
  const n = Math.max(2, Math.round((Math.abs(a1 - a0) / (Math.PI * 2)) * steps) + 1);
  for (let i = 0; i < n; i++) {
    const a = a0 + ((a1 - a0) * i) / (n - 1);
    out.push([lon + Math.cos(a) * rDeg * ls, lat + Math.sin(a) * rDeg]);
  }
  return out;
}

// Straight radial bar (for Line health mini-bars): base at center, length by value.
export function radialBar(lon: number, lat: number, angle: number, lenDeg: number): number[][] {
  const ls = lonScale(lat);
  return [
    [lon, lat],
    [lon + Math.cos(angle) * lenDeg * ls, lat + Math.sin(angle) * lenDeg],
  ];
}
