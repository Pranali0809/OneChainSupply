import { LayerId } from "./layers";

export interface CameraState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

export type CanvasMode = "geo" | "ontology";

export interface Beat {
  id: number;
  title: string;
  caption: string;
  timecode: string;
  camera: CameraState;
  layers: LayerId[];
  mode: CanvasMode;
  // overlays this beat summons
  ghostPanels?: boolean; // Beat 2 legacy-tool conflict
  unifiedCard?: boolean; // Beat 2 resolve
  inspector?: { nodeId?: string; batchId?: string; tab?: string };
  scenario?: string; // Beat 4 fires this disruption
  solve?: boolean; // Beat 5 runs the solve
  nlq?: string; // Beat 6 auto-types this query
  loop?: boolean; // Beat 7 loop/attribution view
  close?: boolean; // Beat 8 close overlay
}

// Framed on continental US with Canada and Mexico visible for context.
export const US_OVERVIEW: CameraState = {
  longitude: -98,
  latitude: 38,
  zoom: 3.0,
  pitch: 0,
  bearing: 0,
};

// Beat 8 pulls back to the whole of North America.
export const NA_OVERVIEW: CameraState = {
  longitude: -100,
  latitude: 34,
  zoom: 2.6,
  pitch: 0,
  bearing: 0,
};

const JOLIET: CameraState = {
  longitude: -88.9,
  latitude: 41.2,
  zoom: 5.4,
  pitch: 35,
  bearing: -12,
};

const MIDWEST: CameraState = {
  longitude: -93,
  latitude: 39.5,
  zoom: 4.4,
  pitch: 25,
  bearing: 0,
};

export const BEATS: Beat[] = [
  {
    id: 1,
    title: "Cold open",
    timecode: "0:00",
    caption: "Northfield Foods. 9 plants, 14 DCs, 2,400 live batches. One twin.",
    camera: US_OVERVIEW,
    layers: ["flows"],
    mode: "geo",
  },
  {
    id: 2,
    title: "The problem",
    timecode: "0:35",
    caption: "Three tools. Three answers. One batch.",
    camera: { ...US_OVERVIEW, zoom: 3.7 },
    layers: ["flows"],
    mode: "geo",
    ghostPanels: true,
    unifiedCard: true,
  },
  {
    id: 3,
    title: "Interrogate the twin",
    timecode: "1:20",
    caption: "Not a report. A queryable object model.",
    camera: JOLIET,
    layers: ["age"],
    mode: "geo",
    inspector: { nodeId: "DC-JOL", batchId: "B-4471188-26W38-COV", tab: "Risk" },
  },
  {
    id: 4,
    title: "Break it",
    timecode: "2:40",
    caption: "The twin feels it in 4 seconds. Today this takes a planner two days.",
    camera: MIDWEST,
    layers: ["lane", "service"],
    mode: "geo",
    scenario: "SCN-CARRIER",
  },
  {
    id: 5,
    title: "The coordinated solve",
    timecode: "3:40",
    caption: "One plan. Not six.",
    camera: MIDWEST,
    layers: ["flows", "service"],
    mode: "geo",
    scenario: "SCN-CARRIER",
    solve: true,
  },
  {
    id: 6,
    title: "Ask why",
    timecode: "5:00",
    caption: "Prove it. Drivers, constraints, the next-best alternative.",
    camera: JOLIET,
    layers: ["flows"],
    mode: "geo",
    scenario: "SCN-CARRIER",
    nlq: "why did we reposition 1,840 cases from Joliet to Reed City instead of donating them?",
  },
  {
    id: 7,
    title: "Close the loop",
    timecode: "6:00",
    caption: "The system learns from its own mistakes. This is the part that compounds.",
    camera: { ...US_OVERVIEW, zoom: 3.5 },
    layers: ["flows"],
    mode: "geo",
    loop: true,
  },
  {
    id: 8,
    title: "The close",
    timecode: "6:50",
    caption: "One twin. Every decision. Proven.",
    camera: NA_OVERVIEW,
    layers: ["flows"],
    mode: "geo",
    close: true,
  },
];

export const BEAT_COUNT = BEATS.length;
