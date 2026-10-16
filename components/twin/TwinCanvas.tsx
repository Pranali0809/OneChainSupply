"use client";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import DeckGL from "@deck.gl/react";
import { MapView, FlyToInterpolator } from "@deck.gl/core";
import { GeoJsonLayer, ArcLayer, IconLayer, ScatterplotLayer } from "@deck.gl/layers";
import { useStore } from "@/lib/store";
import { NODES, LANES, NODE_BY_ID } from "@/data/network";
import { buildIconAtlas } from "@/lib/icon-atlas";
import { riskRamp, COLORS } from "@/lib/palette";
import { nodeLayerValue, laneLayerValue } from "@/lib/layers";
import { ontologyPos } from "@/lib/ontology";
import { SCENARIO_BY_ID } from "@/data/scenarios";
import { SOLVE_BY_SCENARIO } from "@/data/solves";
import usStates from "@/data/us-states.geo.json";
import { TwinNode } from "@/lib/types";
import NodeTooltip from "./NodeTooltip";

const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

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

  useEffect(() => {
    setAtlas(buildIconAtlas());
  }, []);

  // Animation loop: drives flow particles, pulses, and the ontology morph.
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

  // Camera flyTo when store bumps the nonce.
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
  const solved = activeScenarioId && (solveStage === "reveal" || solveStage === "done");
  const newFlows = useMemo(() => {
    if (!solved || !activeScenarioId) return new Set<string>();
    return new Set(
      SOLVE_BY_SCENARIO[activeScenarioId]?.flows.filter((f) => f.isNew).map((f) => f.laneId) ?? []
    );
  }, [solved, activeScenarioId]);

  const primaryNodeLayer = activeLayers.find((l) =>
    ["age", "service", "fefo", "line", "inventory", "uncertainty", "cost"].includes(l)
  );
  const laneLayerActive = activeLayers.includes("lane");

  // effective displayed risk for a node (layer value + scenario delta − recovery)
  const effRisk = useCallback(
    (n: TwinNode) => {
      let base = primaryNodeLayer ? nodeLayerValue(n, primaryNodeLayer) : n.composite;
      const d = deltaByNode[n.id] ?? 0;
      base += d;
      if (solveStage === "done" && d > 0) base -= d * 0.85;
      return Math.max(0, Math.min(1, base));
    },
    [primaryNodeLayer, deltaByNode, solveStage]
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

  const posById = useCallback(
    (id: string): [number, number] => {
      const n = NODE_BY_ID[id];
      return n ? pos(n) : [0, 0];
    },
    [pos]
  );

  // ── basemap (memoized — the expensive parse) ────────────────────────────
  const basemap = useMemo(
    () =>
      new GeoJsonLayer({
        id: "us-basemap",
        data: usStates as any,
        stroked: true,
        filled: true,
        getFillColor: [16, 20, 28, 220],
        getLineColor: [255, 255, 255, 18],
        lineWidthMinPixels: 1,
        pickable: false,
      }),
    []
  );

  const dimmed = (n: TwinNode) =>
    isolatedTier &&
    (() => {
      const v = effRisk(n);
      const tier = v < 0.4 ? "low" : v < 0.7 ? "med" : v < 0.85 ? "high" : "crit";
      return tier !== isolatedTier;
    })();

  const layers = useMemo(() => {
    const basemapAlpha = Math.round(220 * (1 - morph * 0.75));
    const bm = new GeoJsonLayer({
      id: "us-basemap",
      data: usStates as any,
      stroked: true,
      filled: true,
      getFillColor: [16, 20, 28, basemapAlpha],
      getLineColor: [255, 255, 255, Math.round(18 * (1 - morph * 0.8))],
      lineWidthMinPixels: 1,
      pickable: false,
      updateTriggers: { getFillColor: Math.round(morph * 20), getLineColor: Math.round(morph * 20) },
    });

    // lanes (arcs) — color by layer, scenario state, solve reveal
    const laneData = LANES.filter((l) => !severed.has(l.id));
    const lanes = new ArcLayer({
      id: "lanes",
      data: laneData,
      getSourcePosition: (d: any) => posById(d.from),
      getTargetPosition: (d: any) => posById(d.to),
      getSourceColor: (d: any) => laneColor(d, false),
      getTargetColor: (d: any) => laneColor(d, true),
      getHeight: (d: any) => (morph > 0.5 ? 0.08 : Math.min(1.1, d.volume / 9000)),
      getWidth: (d: any) => (newFlows.has(d.id) ? 3.4 : stressed.has(d.id) ? 2.2 : 1.1),
      greatCircle: morph < 0.5,
      pickable: true,
      autoHighlight: true,
      highlightColor: [77, 225, 193, 120],
      onClick: (info: any) => info.object && selectLane(info.object.id),
      updateTriggers: {
        getSourcePosition: morph,
        getTargetPosition: morph,
        getSourceColor: [activeLayers.join(), solveStage, activeScenarioId],
        getTargetColor: [activeLayers.join(), solveStage, activeScenarioId],
        getWidth: [solveStage, activeScenarioId],
        getHeight: morph > 0.5,
        greatCircle: morph < 0.5,
      },
    });

    function laneColor(d: any, target: boolean): [number, number, number, number] {
      if (newFlows.has(d.id)) return [...COLORS.accent, 230] as any;
      if (stressed.has(d.id)) return [245, 185, 68, target ? 210 : 120];
      if (morph > 0.5) return [120, 140, 170, 90]; // typed edges in ontology
      if (laneLayerActive) {
        const v = laneLayerValue(d, "lane");
        const [r, g, b] = riskRamp(v);
        return [r, g, b, target ? 210 : 60];
      }
      const u = d.utilization;
      const [r, g, b] = u > 0.9 ? [245, 185, 68] : COLORS.flow;
      return [r, g, b, target ? 200 : 50];
    }

    // severed lanes — broken arc + red terminus marker
    const severedLanes = new ArcLayer({
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
    });
    const severedMarkers = new ScatterplotLayer({
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
    });

    // flow particles — animated dots marching along active lanes
    const particleData: { position: [number, number]; color: [number, number, number, number]; r: number }[] = [];
    const flowLanes = laneData.filter((l) => l.utilization > 0.55 || newFlows.has(l.id) || stressed.has(l.id));
    const speed = 0.00025;
    for (const l of flowLanes) {
      const a = posById(l.from);
      const b = posById(l.to);
      const count = newFlows.has(l.id) ? 4 : 2;
      for (let k = 0; k < count; k++) {
        const phase = (t * speed * (newFlows.has(l.id) ? 1.8 : 1) + k / count) % 1;
        const p: [number, number] = [lerp(a[0], b[0], phase), lerp(a[1], b[1], phase)];
        const col: [number, number, number, number] = newFlows.has(l.id)
          ? [...COLORS.accent, 255] as any
          : stressed.has(l.id)
          ? [245, 185, 68, 220]
          : [...COLORS.flow, 220] as any;
        particleData.push({ position: p, color: col, r: newFlows.has(l.id) ? 2.6 : 1.8 });
      }
    }
    const particles = new ScatterplotLayer({
      id: "flow-particles",
      data: particleData,
      getPosition: (d: any) => d.position,
      getFillColor: (d: any) => d.color,
      getRadius: (d: any) => d.r,
      radiusUnits: "pixels",
      updateTriggers: { getPosition: t },
    });

    // node glow
    const glow = new ScatterplotLayer({
      id: "node-glow",
      data: NODES,
      getPosition: (d: any) => pos(d),
      getRadius: (d: any) => {
        const v = effRisk(d);
        const pulse = v > 0.7 ? 1 + 0.12 * Math.sin(t * 0.08) : 1;
        return (14 + v * 20) * pulse;
      },
      radiusUnits: "pixels",
      getFillColor: (d: any) => {
        if (dimmed(d)) return [120, 130, 150, 12];
        const [r, g, b] = riskRamp(effRisk(d));
        return [r, g, b, 40];
      },
      updateTriggers: { getPosition: morph, getRadius: [t, solveStage, activeScenarioId], getFillColor: [activeLayers.join(), isolatedTier, solveStage, activeScenarioId] },
    });

    // critical ring pulse
    const critNodes = NODES.filter((n) => effRisk(n) >= 0.78);
    const rings = new ScatterplotLayer({
      id: "crit-rings",
      data: critNodes,
      getPosition: (d: any) => pos(d),
      getRadius: () => 16 + ((t * 0.5) % 40),
      radiusUnits: "pixels",
      stroked: true,
      filled: false,
      getLineColor: () => {
        const a = Math.max(0, 180 - ((t * 0.5) % 40) * 4);
        return [255, 59, 107, a];
      },
      lineWidthMinPixels: 1.5,
      updateTriggers: { getPosition: morph, getRadius: t, getLineColor: t },
    });

    // nodes (shaped icons)
    const nodeIcons = atlas
      ? new IconLayer({
          id: "nodes",
          data: NODES,
          iconAtlas: atlas.image as any,
          iconMapping: atlas.mapping as any,
          getIcon: (d: any) => d.kind,
          getPosition: (d: any) => pos(d),
          getSize: (d: any) => {
            const base = d.kind === "PLANT" ? 30 : d.kind === "DC" ? 26 : d.kind === "SUPPLIER" ? 20 : 18;
            return base * (0.8 + Math.min(1, d.throughput / 90000) * 0.6);
          },
          sizeUnits: "pixels",
          getColor: (d: any) => {
            if (dimmed(d)) return [120, 130, 150, 60];
            const [r, g, b] = riskRamp(effRisk(d));
            const hl = hoveredNodeId === d.id ? 255 : 235;
            return [r, g, b, hl];
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
            getColor: [activeLayers.join(), isolatedTier, hoveredNodeId, solveStage, activeScenarioId],
          },
        })
      : null;

    // blast-radius halo during a live scenario
    const haloLayers: any[] = [];
    if (scenario && solveStage !== "done") {
      const epi = NODE_BY_ID[scenario.epicenter];
      if (epi) {
        const prog = (t * 0.6) % 120;
        haloLayers.push(
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

    return [
      bm,
      lanes,
      severedLanes,
      severedMarkers,
      particles,
      glow,
      rings,
      ...haloLayers,
      nodeIcons,
    ].filter(Boolean);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    atlas,
    frame,
    morph,
    activeLayers,
    isolatedTier,
    activeScenarioId,
    solveStage,
    hoveredNodeId,
    severed,
    stressed,
    newFlows,
  ]);

  void basemap;

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
      {hoveredNodeId && <NodeTooltip nodeId={hoveredNodeId} x={pointer.x} y={pointer.y} />}
    </div>
  );
}
