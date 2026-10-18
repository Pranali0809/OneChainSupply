"use client";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import DeckGL from "@deck.gl/react";
import { MapView, FlyToInterpolator } from "@deck.gl/core";
import {
  GeoJsonLayer,
  ArcLayer,
  IconLayer,
  ScatterplotLayer,
  PolygonLayer,
  PathLayer,
  TextLayer,
} from "@deck.gl/layers";
import { useStore } from "@/lib/store";
import { NODES, LANES, NODE_BY_ID } from "@/data/network";
import { buildIconAtlas } from "@/lib/icon-atlas";
import { riskRamp, blueRamp, COLORS } from "@/lib/palette";
import { LayerId } from "@/lib/layers";
import { nodeMetrics, layerMetricValue, MAX_CASES_AT_RISK, MAX_COST_PER_CASE } from "@/lib/layer-metrics";
import { polyRing, arcPath, radialBar } from "@/lib/geo";
import { ontologyPos } from "@/lib/ontology";
import { SCENARIO_BY_ID } from "@/data/scenarios";
import { SOLVE_BY_SCENARIO } from "@/data/solves";
import naCountries from "@/data/na-countries.geo.json";
import naStates from "@/data/na-states.geo.json";
import { TwinNode } from "@/lib/types";
import NodeTooltip from "./NodeTooltip";

const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const CITY_LABELS = [
  { name: "Toronto", lon: -79.38, lat: 43.65 },
  { name: "Montréal", lon: -73.57, lat: 45.5 },
  { name: "Vancouver", lon: -123.12, lat: 49.28 },
  { name: "Monterrey", lon: -100.32, lat: 25.67 },
  { name: "Mexico City", lon: -99.13, lat: 19.43 },
];

// Which layers recolor on a blue (non-risk) ramp vs the red risk ramp.
const BLUE_LAYERS: LayerId[] = ["cost", "uncertainty"];
const NODE_LAYERS: LayerId[] = ["age", "service", "fefo", "line", "inventory", "uncertainty", "cost"];

export default function TwinCanvas() {
  const camera = useStore((s) => s.camera);
  const cameraNonce = useStore((s) => s.cameraNonce);
  const mode = useStore((s) => s.mode);
  const activeLayers = useStore((s) => s.activeLayers);
  const isolatedTier = useStore((s) => s.isolatedTier);
  const activeScenarioId = useStore((s) => s.activeScenarioId);
  const solveStage = useStore((s) => s.solveStage);
  const hoveredNodeId = useStore((s) => s.hoveredNodeId);
  const setHovered = useStore((s) => s.setHovered);
  const selectNode = useStore((s) => s.selectNode);
  const selectLane = useStore((s) => s.selectLane);
  const setCamera = useStore((s) => s.setCamera);
  const flyTo = useStore((s) => s.flyTo);

  const [atlas, setAtlas] = useState<ReturnType<typeof buildIconAtlas> | null>(null);
  const [viewState, setViewState] = useState<any>({ ...camera });
  const [frame, setFrame] = useState(0);
  const morphRef = useRef(0);
  const lastNonce = useRef(cameraNonce);
  const [pointer, setPointer] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => setAtlas(buildIconAtlas()), []);

  useEffect(() => {
    let raf = 0;
    let mounted = true;
    const loop = () => {
      const target = mode === "ontology" ? 1 : 0;
      morphRef.current += (target - morphRef.current) * 0.06;
      if (Math.abs(target - morphRef.current) < 0.001) morphRef.current = target;
      if (mounted) setFrame((f) => (f + 1) % 1_000_000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      mounted = false;
      cancelAnimationFrame(raf);
    };
  }, [mode]);

  useEffect(() => {
    if (cameraNonce !== lastNonce.current) {
      lastNonce.current = cameraNonce;
      setViewState({
        ...camera,
        transitionDuration: 600,
        transitionInterpolator: new FlyToInterpolator({ speed: 1.4 }),
      });
    }
  }, [cameraNonce, camera]);

  const morph = morphRef.current;
  const t = frame;

  const scenario = activeScenarioId ? SCENARIO_BY_ID[activeScenarioId] : null;
  const deltaByNode = useMemo(() => {
    const m: Record<string, number> = {};
    scenario?.impactedNodes.forEach((n) => (m[n.nodeId] = n.deltaRisk));
    return m;
  }, [scenario]);
  const severed = useMemo(() => new Set(scenario?.severedLanes ?? []), [scenario]);
  const stressed = useMemo(() => new Set(scenario?.stressedLanes ?? []), [scenario]);
  const committedFlows = useStore((s) => s.committedFlows);
  const solved = activeScenarioId && (solveStage === "reveal" || solveStage === "done");
  const newFlows = useMemo(() => {
    const set = new Set<string>(committedFlows);
    if (solved && activeScenarioId) {
      SOLVE_BY_SCENARIO[activeScenarioId]?.flows.filter((f) => f.isNew).forEach((f) => set.add(f.laneId));
    }
    return set;
  }, [solved, activeScenarioId, committedFlows]);

  const primary = activeLayers[0] ?? "flows";
  const secondary = activeLayers[1];
  const isNodeLayer = NODE_LAYERS.includes(primary);
  const lanesDim = isNodeLayer && primary !== "cost"; // cost is a lane metric
  const dimNonPlants = primary === "line";

  // displayed 0..1 value per node under the primary layer (+scenario dynamics)
  const nodeVal = useCallback(
    (n: TwinNode) => {
      let base = primary === "flows" ? n.composite : layerMetricValue(n, primary);
      if (["flows", "age", "service"].includes(primary)) {
        const d = deltaByNode[n.id] ?? 0;
        base += d;
        if (solveStage === "done" && d > 0) base -= d * 0.85;
      }
      return Math.max(0, Math.min(1, base));
    },
    [primary, deltaByNode, solveStage]
  );

  const colorFor = useCallback(
    (v: number): [number, number, number] => (BLUE_LAYERS.includes(primary) ? blueRamp(v) : riskRamp(v)),
    [primary]
  );

  const tierOf = (v: number) => (v < 0.4 ? "low" : v < 0.7 ? "med" : v < 0.85 ? "high" : "crit");
  const dimmedByTier = useCallback(
    (n: TwinNode) => isolatedTier && tierOf(nodeVal(n)) !== isolatedTier,
    [isolatedTier, nodeVal]
  );

  const pos = useCallback(
    (n: TwinNode): [number, number] => {
      if (morph <= 0.001) return [n.lon, n.lat];
      const o = ontologyPos(n.id);
      if (!o) return [n.lon, n.lat];
      const e = ease(morph);
      return [lerp(n.lon, o[0], e), lerp(n.lat, o[1], e)];
    },
    [morph]
  );
  const posById = useCallback((id: string): [number, number] => {
    const n = NODE_BY_ID[id];
    return n ? pos(n) : [0, 0];
  }, [pos]);

  const layers = useMemo(() => {
    const geoFade = 1 - morph * 0.78;
    const out: any[] = [];

    // ── basemap: country fills (US lighter) + state/province borders ──────
    out.push(
      new GeoJsonLayer({
        id: "na-countries",
        data: naCountries as any,
        stroked: true,
        filled: true,
        getFillColor: (f: any) => (f.properties.us ? [20, 26, 36, Math.round(235 * geoFade)] : [13, 17, 24, Math.round(220 * geoFade)]),
        getLineColor: [255, 255, 255, Math.round(26 * geoFade)],
        lineWidthMinPixels: 1,
        pickable: false,
        updateTriggers: { getFillColor: Math.round(morph * 20), getLineColor: Math.round(morph * 20) },
      })
    );
    out.push(
      new GeoJsonLayer({
        id: "na-states",
        data: naStates as any,
        stroked: true,
        filled: false,
        getLineColor: [255, 255, 255, Math.round(14 * geoFade)],
        lineWidthMinPixels: 0.5,
        pickable: false,
        updateTriggers: { getLineColor: Math.round(morph * 20) },
      })
    );
    out.push(
      new TextLayer({
        id: "city-labels",
        data: CITY_LABELS,
        getPosition: (d: any) => [d.lon, d.lat],
        getText: (d: any) => d.name,
        getSize: 10,
        getColor: [155, 166, 184, Math.round(150 * geoFade)],
        getTextAnchor: "start",
        getPixelOffset: [6, 0],
        fontFamily: "Inter, sans-serif",
        characterSet: "auto",
        updateTriggers: { getColor: Math.round(morph * 20) },
      })
    );

    // ── service territories (PolygonLayer) ────────────────────────────────
    if (primary === "service") {
      const terr = NODES.filter((n) => n.kind === "DC" || n.kind === "CUSTOMER_DC" || n.kind === "PLANT");
      out.push(
        new PolygonLayer({
          id: "service-territories",
          data: terr,
          getPolygon: (d: any) => polyRing(pos(d)[0], pos(d)[1], 0.9 + Math.min(1, d.throughput / 90000) * 1.4, 6, Math.PI / 6),
          getFillColor: (d: any) => {
            const [r, g, b] = riskRamp(nodeVal(d));
            return [r, g, b, dimmedByTier(d) ? 8 : 34];
          },
          getLineColor: (d: any) => {
            const [r, g, b] = riskRamp(nodeVal(d));
            return [r, g, b, dimmedByTier(d) ? 20 : 90];
          },
          lineWidthMinPixels: 1,
          stroked: true,
          filled: true,
          updateTriggers: { getPolygon: morph, getFillColor: [isolatedTier, solveStage, activeScenarioId], getLineColor: [isolatedTier, solveStage] },
        })
      );
    }

    // ── lanes (arcs) ──────────────────────────────────────────────────────
    const laneAlphaBase = lanesDim ? 0.2 : 1;
    const costMax = Math.max(...LANES.map((l) => l.costPerCwt));
    function laneColor(d: any, target: boolean): [number, number, number, number] {
      if (newFlows.has(d.id)) return [...COLORS.accent, 230] as any;
      if (stressed.has(d.id)) return [245, 185, 68, Math.round((target ? 210 : 120) * (lanesDim ? 0.6 : 1))];
      if (morph > 0.5) return [120, 140, 170, 90];
      if (primary === "cost") {
        const [r, g, b] = blueRamp(d.costPerCwt / costMax);
        return [r, g, b, target ? 220 : 120];
      }
      if (primary === "lane") {
        const [r, g, b] = riskRamp(1 - d.reliability);
        return [r, g, b, target ? 210 : 70];
      }
      const u = d.utilization;
      const [r, g, b] = u > 0.9 ? [245, 185, 68] : COLORS.flow;
      return [r, g, b, Math.round((target ? 200 : 50) * laneAlphaBase)];
    }
    out.push(
      new ArcLayer({
        id: "lanes",
        data: LANES.filter((l) => !severed.has(l.id)),
        getSourcePosition: (d: any) => posById(d.from),
        getTargetPosition: (d: any) => posById(d.to),
        getSourceColor: (d: any) => laneColor(d, false),
        getTargetColor: (d: any) => laneColor(d, true),
        getHeight: (d: any) => (morph > 0.5 ? 0.08 : Math.min(1.1, d.volume / 9000)),
        getWidth: (d: any) =>
          newFlows.has(d.id) ? 3.4 : stressed.has(d.id) ? 2.2 : primary === "cost" ? 1 + (d.costPerCwt / costMax) * 4 : primary === "lane" ? 1 + (1 - d.reliability) * 4 : 1.1,
        greatCircle: morph < 0.5,
        pickable: true,
        autoHighlight: true,
        highlightColor: [77, 225, 193, 120],
        onClick: (info: any) => info.object && selectLane(info.object.id),
        updateTriggers: {
          getSourcePosition: morph,
          getTargetPosition: morph,
          getSourceColor: [primary, solveStage, activeScenarioId, lanesDim],
          getTargetColor: [primary, solveStage, activeScenarioId, lanesDim],
          getWidth: [primary, solveStage, activeScenarioId],
          getHeight: morph > 0.5,
          greatCircle: morph < 0.5,
        },
      })
    );

    // cost-to-serve labels on the 3 costliest lanes
    if (primary === "cost") {
      const top3 = [...LANES].sort((a, b) => b.costPerCwt - a.costPerCwt).slice(0, 3);
      out.push(
        new TextLayer({
          id: "cost-labels",
          data: top3,
          getPosition: (d: any) => {
            const a = posById(d.from);
            const b = posById(d.to);
            return [lerp(a[0], b[0], 0.5), lerp(a[1], b[1], 0.5)];
          },
          getText: (d: any) => `$${d.costPerCwt.toFixed(2)}/cwt`,
          getSize: 11,
          getColor: [120, 190, 255, 255],
          background: true,
          getBackgroundColor: [11, 13, 18, 220],
          backgroundPadding: [4, 2],
          fontFamily: "Inter, sans-serif",
          updateTriggers: { getPosition: morph },
        })
      );
    }

    // severed lanes — broken arc + red terminus
    out.push(
      new ArcLayer({
        id: "lanes-severed",
        data: LANES.filter((l) => severed.has(l.id)),
        getSourcePosition: (d: any) => posById(d.from),
        getTargetPosition: (d: any) => {
          const a = posById(d.from);
          const b = posById(d.to);
          return [lerp(a[0], b[0], 0.42), lerp(a[1], b[1], 0.42)];
        },
        getSourceColor: [255, 59, 107, 220],
        getTargetColor: [255, 59, 107, 30],
        getHeight: 0.9,
        getWidth: 2,
        greatCircle: morph < 0.5,
        updateTriggers: { getSourcePosition: morph, getTargetPosition: morph },
      })
    );
    out.push(
      new ScatterplotLayer({
        id: "severed-markers",
        data: LANES.filter((l) => severed.has(l.id)),
        getPosition: (d: any) => {
          const a = posById(d.from);
          const b = posById(d.to);
          return [lerp(a[0], b[0], 0.52), lerp(a[1], b[1], 0.52)];
        },
        getRadius: 5,
        radiusUnits: "pixels",
        getFillColor: [255, 59, 107, 230],
        getLineColor: [255, 255, 255, 180],
        lineWidthMinPixels: 1,
        stroked: true,
      })
    );

    // flow particles (suppressed/dimmed under node layers for clarity)
    if (!lanesDim || primary === "flows") {
      const particleData: { position: [number, number]; color: [number, number, number, number]; r: number }[] = [];
      const flowLanes = LANES.filter((l) => !severed.has(l.id) && (l.utilization > 0.55 || newFlows.has(l.id) || stressed.has(l.id)));
      const speed = 0.00025;
      for (const l of flowLanes) {
        const a = posById(l.from);
        const b = posById(l.to);
        const count = newFlows.has(l.id) ? 4 : 2;
        for (let k = 0; k < count; k++) {
          const phase = (t * speed * (newFlows.has(l.id) ? 1.8 : 1) + k / count) % 1;
          particleData.push({
            position: [lerp(a[0], b[0], phase), lerp(a[1], b[1], phase)],
            color: newFlows.has(l.id) ? ([...COLORS.accent, 255] as any) : stressed.has(l.id) ? [245, 185, 68, 220] : ([...COLORS.flow, 220] as any),
            r: newFlows.has(l.id) ? 2.6 : 1.8,
          });
        }
      }
      out.push(
        new ScatterplotLayer({
          id: "flow-particles",
          data: particleData,
          getPosition: (d: any) => d.position,
          getFillColor: (d: any) => d.color,
          getRadius: (d: any) => d.r,
          radiusUnits: "pixels",
          updateTriggers: { getPosition: t },
        })
      );
    }

    // ── forecast-uncertainty halos (breathing, blue) ──────────────────────
    if (primary === "uncertainty") {
      out.push(
        new ScatterplotLayer({
          id: "uncertainty-halo",
          data: NODES.filter((n) => n.kind !== "SUPPLIER"),
          getPosition: (d: any) => pos(d),
          getRadius: (d: any) => {
            const w = nodeMetrics(d.id).uncertaintyWidth;
            const pulse = 1 + 0.12 * Math.sin(t * 0.05 + d.lon);
            return (18 + w * 40) * pulse;
          },
          radiusUnits: "pixels",
          stroked: true,
          filled: false,
          getLineColor: (d: any) => {
            const [r, g, b] = blueRamp(nodeMetrics(d.id).uncertaintyWidth);
            return [r, g, b, dimmedByTier(d) ? 20 : 130];
          },
          lineWidthMinPixels: 1.5,
          updateTriggers: { getPosition: morph, getRadius: t, getLineColor: isolatedTier },
        })
      );
    }

    // ── service ring gauges (PathLayer arc) ───────────────────────────────
    if (primary === "service") {
      out.push(
        new PathLayer({
          id: "service-ring-bg",
          data: NODES,
          getPath: ((d: any) => arcPath(pos(d)[0], pos(d)[1], 0.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2, 48)) as any,
          getColor: [255, 255, 255, 30],
          getWidth: 1.5,
          widthUnits: "pixels",
          updateTriggers: { getPath: morph },
        })
      );
      out.push(
        new PathLayer({
          id: "service-ring",
          data: NODES,
          getPath: ((d: any) => {
            const v = nodeVal(d);
            return arcPath(pos(d)[0], pos(d)[1], 0.5, -Math.PI / 2, -Math.PI / 2 + Math.max(0.04, v) * Math.PI * 2, 48);
          }) as any,
          getColor: (d: any) => {
            const [r, g, b] = riskRamp(nodeVal(d));
            return [r, g, b, dimmedByTier(d) ? 40 : 255];
          },
          getWidth: 2.6,
          widthUnits: "pixels",
          updateTriggers: { getPath: [morph, solveStage, activeScenarioId], getColor: [isolatedTier, solveStage, activeScenarioId] },
        })
      );
    }

    // ── FEFO hatch + compliance badges ────────────────────────────────────
    if (primary === "fefo") {
      const nonCompliant = NODES.filter((n) => (n.kind === "DC" || n.kind === "PLANT") && nodeMetrics(n.id).compliancePct < 100);
      const hatchData: { path: number[][] }[] = [];
      for (const n of nonCompliant) {
        const [lo, la] = pos(n);
        const r = 0.7;
        for (let i = -2; i <= 2; i++) {
          const off = i * 0.28 * r;
          hatchData.push({ path: [[lo - r + off, la - r], [lo + r + off, la + r]] });
        }
      }
      out.push(
        new PathLayer({
          id: "fefo-hatch",
          data: hatchData,
          getPath: ((d: any) => d.path) as any,
          getColor: [245, 185, 68, 150],
          getWidth: 1,
          widthUnits: "pixels",
          updateTriggers: { getPath: morph },
        })
      );
    }

    // ── Line health radial mini-bars ──────────────────────────────────────
    if (primary === "line") {
      const plants = NODES.filter((n) => n.kind === "PLANT");
      const committedBars: { path: number[][] }[] = [];
      const actualBars: { path: number[][]; v: number }[] = [];
      for (const p of plants) {
        const [lo, la] = pos(p);
        const rates = nodeMetrics(p.id).lineRates;
        rates.forEach((lr, i) => {
          const ang = -Math.PI / 2 + (i / Math.max(1, rates.length)) * Math.PI * 2;
          committedBars.push({ path: radialBar(lo, la, ang, 1.1) });
          actualBars.push({ path: radialBar(lo, la, ang, 1.1 * (lr.actual / lr.committed)), v: lr.actual / lr.committed });
        });
      }
      out.push(
        new PathLayer({ id: "line-committed", data: committedBars, getPath: ((d: any) => d.path) as any, getColor: [255, 255, 255, 40], getWidth: 2, widthUnits: "pixels", updateTriggers: { getPath: morph } }),
        new PathLayer({
          id: "line-actual",
          data: actualBars,
          getPath: ((d: any) => d.path) as any,
          getColor: (d: any) => {
            const [r, g, b] = riskRamp(1 - d.v);
            return [r, g, b, 255];
          },
          getWidth: 3,
          widthUnits: "pixels",
          updateTriggers: { getPath: morph },
        })
      );
    }

    // ── node glow ─────────────────────────────────────────────────────────
    out.push(
      new ScatterplotLayer({
        id: "node-glow",
        data: NODES,
        getPosition: (d: any) => pos(d),
        getRadius: (d: any) => {
          const v = nodeVal(d);
          const pulse = v > 0.7 ? 1 + 0.12 * Math.sin(t * 0.08) : 1;
          return (14 + v * 20) * pulse;
        },
        radiusUnits: "pixels",
        getFillColor: (d: any) => {
          if (dimmedByTier(d) || (dimNonPlants && d.kind !== "PLANT")) return [120, 130, 150, 10];
          const [r, g, b] = colorFor(nodeVal(d));
          return [r, g, b, 40];
        },
        updateTriggers: {
          getPosition: morph,
          getRadius: [t, primary, solveStage, activeScenarioId],
          getFillColor: [primary, isolatedTier, solveStage, activeScenarioId, dimNonPlants],
        },
      })
    );

    // critical ring pulse (only when risk-type primary)
    if (!BLUE_LAYERS.includes(primary)) {
      const critNodes = NODES.filter((n) => nodeVal(n) >= 0.78 && !(dimNonPlants && n.kind !== "PLANT"));
      out.push(
        new ScatterplotLayer({
          id: "crit-rings",
          data: critNodes,
          getPosition: (d: any) => pos(d),
          getRadius: () => 16 + ((t * 0.5) % 40),
          radiusUnits: "pixels",
          stroked: true,
          filled: false,
          getLineColor: () => [255, 59, 107, Math.max(0, 180 - ((t * 0.5) % 40) * 4)],
          lineWidthMinPixels: 1.5,
          updateTriggers: { getPosition: morph, getRadius: t, getLineColor: t },
        })
      );
    }

    // secondary layer → ring around nodes (no color blend)
    if (secondary && NODE_LAYERS.includes(secondary)) {
      out.push(
        new ScatterplotLayer({
          id: "secondary-ring",
          data: NODES.filter((n) => (secondary === "line" ? n.kind === "PLANT" : true)),
          getPosition: (d: any) => pos(d),
          getRadius: 13,
          radiusUnits: "pixels",
          stroked: true,
          filled: false,
          getLineColor: (d: any) => {
            const v = layerMetricValue(d, secondary);
            const [r, g, b] = BLUE_LAYERS.includes(secondary) ? blueRamp(v) : riskRamp(v);
            return [r, g, b, 200];
          },
          lineWidthMinPixels: 2,
          updateTriggers: { getPosition: morph, getLineColor: secondary },
        })
      );
    }

    // blast halo
    if (scenario && solveStage !== "done") {
      const epi = NODE_BY_ID[scenario.epicenter];
      if (epi) {
        const prog = (t * 0.6) % 120;
        out.push(
          new ScatterplotLayer({
            id: "blast-halo",
            data: [epi],
            getPosition: (d: any) => pos(d),
            getRadius: () => 20 + prog,
            radiusUnits: "pixels",
            stroked: true,
            filled: false,
            getLineColor: [255, 59, 107, Math.max(0, 160 - prog * 1.3)],
            lineWidthMinPixels: 2,
            updateTriggers: { getPosition: morph, getRadius: t, getLineColor: t },
          })
        );
      }
    }

    // ── nodes (shaped icons) ──────────────────────────────────────────────
    if (atlas) {
      out.push(
        new IconLayer({
          id: "nodes",
          data: NODES,
          iconAtlas: atlas.image as any,
          iconMapping: atlas.mapping as any,
          getIcon: (d: any) => d.kind,
          getPosition: (d: any) => pos(d),
          getSize: (d: any) => {
            let base = d.kind === "PLANT" ? 30 : d.kind === "DC" ? 26 : d.kind === "SUPPLIER" ? 20 : 18;
            base *= 0.8 + Math.min(1, d.throughput / 90000) * 0.6;
            if (primary === "age") base *= 0.8 + (nodeMetrics(d.id).casesAtRisk / MAX_CASES_AT_RISK) * 0.9;
            if (primary === "cost") base *= 0.8 + (nodeMetrics(d.id).costPerCase / MAX_COST_PER_CASE) * 0.7;
            if (primary === "line" && d.kind === "PLANT") base *= 1.4;
            return base;
          },
          sizeUnits: "pixels",
          getColor: (d: any) => {
            if (dimmedByTier(d) || (dimNonPlants && d.kind !== "PLANT")) return [120, 130, 150, 55];
            const [r, g, b] = colorFor(nodeVal(d));
            return [r, g, b, hoveredNodeId === d.id ? 255 : 235];
          },
          pickable: true,
          onHover: (info: any) => {
            setHovered(info.object ? info.object.id : null);
            if (info.object) setPointer({ x: info.x, y: info.y });
          },
          onClick: (info: any) => {
            if (!info.object) return;
            const n: TwinNode = info.object;
            selectNode(n.id);
            flyTo({ longitude: n.lon, latitude: n.lat, zoom: Math.max(5.2, viewState.zoom), pitch: 32, bearing: 0 });
          },
          updateTriggers: {
            getPosition: morph,
            getSize: [primary],
            getColor: [primary, isolatedTier, hoveredNodeId, solveStage, activeScenarioId, dimNonPlants],
          },
        })
      );
    }

    // ── age-risk badges (worst nodes) ─────────────────────────────────────
    if (primary === "age") {
      const worst = [...NODES]
        .filter((n) => n.kind === "DC" || n.kind === "PLANT")
        .sort((a, b) => nodeMetrics(b.id).casesAtRisk - nodeMetrics(a.id).casesAtRisk)
        .slice(0, 5);
      out.push(
        new TextLayer({
          id: "age-badges",
          data: worst,
          getPosition: (d: any) => pos(d),
          getText: (d: any) => `${nodeMetrics(d.id).worstRemaining}d`,
          getSize: 11,
          getColor: [255, 255, 255, 255],
          background: true,
          getBackgroundColor: [255, 59, 107, 230],
          backgroundPadding: [4, 2],
          getPixelOffset: [0, -20],
          fontFamily: "Inter, sans-serif",
          updateTriggers: { getPosition: morph },
        })
      );
    }

    // ── FEFO compliance badges ────────────────────────────────────────────
    if (primary === "fefo") {
      const worst = [...NODES]
        .filter((n) => (n.kind === "DC" || n.kind === "PLANT") && nodeMetrics(n.id).compliancePct < 100)
        .sort((a, b) => nodeMetrics(a.id).compliancePct - nodeMetrics(b.id).compliancePct)
        .slice(0, 6);
      out.push(
        new TextLayer({
          id: "fefo-badges",
          data: worst,
          getPosition: (d: any) => pos(d),
          getText: (d: any) => `${nodeMetrics(d.id).compliancePct}%`,
          getSize: 10,
          getColor: [255, 255, 255, 255],
          background: true,
          getBackgroundColor: [245, 185, 68, 220],
          backgroundPadding: [4, 2],
          getPixelOffset: [0, -20],
          fontFamily: "Inter, sans-serif",
          updateTriggers: { getPosition: morph },
        })
      );
    }

    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atlas, frame, morph, activeLayers, isolatedTier, activeScenarioId, solveStage, hoveredNodeId, severed, stressed, newFlows]);

  return (
    <div className="absolute inset-0">
      <DeckGL
        views={new MapView({ repeat: false })}
        viewState={viewState}
        controller={{ dragRotate: true, touchRotate: true, inertia: 250 }}
        onViewStateChange={({ viewState: vs }: any) => {
          setViewState(vs);
          setCamera({ longitude: vs.longitude, latitude: vs.latitude, zoom: vs.zoom, pitch: vs.pitch, bearing: vs.bearing });
        }}
        layers={layers as any}
        getCursor={({ isHovering }: any) => (isHovering ? "pointer" : "grab")}
        style={{ background: "transparent" }}
      />
      {hoveredNodeId && <NodeTooltip nodeId={hoveredNodeId} x={pointer.x} y={pointer.y} primaryLayer={primary} />}
    </div>
  );
}
