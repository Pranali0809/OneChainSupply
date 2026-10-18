import { useStore } from "./store";
import { US_OVERVIEW } from "./choreography";

type S = ReturnType<typeof useStore.getState>;

const JOLIET = { longitude: -88.9, latitude: 41.2, zoom: 5.4, pitch: 35, bearing: -12 };
const MIDWEST = { longitude: -93, latitude: 39.5, zoom: 4.4, pitch: 25, bearing: 0 };
const HERO_QUERY =
  "why did we reposition 1,840 cases from Joliet to Reed City instead of donating them?";

export interface AutoStep {
  id: string;
  note: string; // short, unobtrusive — what a user would be doing
  pre?: (s: S) => void; // open the surface the target lives on
  target?: string; // data-demo attribute the cursor flies to and "clicks"
  action?: (s: S) => void; // the real action the control performs
  hold: number; // ms to dwell before the next step
}

// The driven demo. Every action is the same one the real button calls — the
// cursor just makes it read as someone using the app, not a slideshow.
export const AUTO_STEPS: AutoStep[] = [
  {
    id: "overview",
    note: "Northfield Foods — one living network",
    action: (s) => {
      s.setLayers(["flows"]);
      s.flyTo({ ...US_OVERVIEW });
    },
    hold: 2600,
  },
  {
    id: "age-layer",
    note: "Turn on the age-risk layer",
    target: "layer-age",
    action: (s) => {
      if (!s.activeLayers.includes("age")) s.toggleLayer("age");
      s.flyTo(JOLIET);
    },
    hold: 2400,
  },
  {
    id: "inspect-batch",
    note: "Interrogate a red batch at Joliet",
    action: (s) => {
      s.selectBatch("B-4471188-26W38-COV", "DC-JOL");
      s.setInspectorTab("Risk");
    },
    hold: 3400,
  },
  {
    id: "open-rail",
    note: "Open the disruption library",
    target: "inject-toggle",
    action: (s) => {
      s.closeInspector();
      s.setScenarioRail(true);
    },
    hold: 1300,
  },
  {
    id: "inject",
    note: "Inject a Midwest carrier shortfall",
    target: "scenario-SCN-CARRIER",
    action: (s) => {
      s.fireScenario("SCN-CARRIER");
      s.setLayers(["lane", "service"]);
    },
    hold: 3800,
  },
  {
    id: "run-solve",
    note: "Run the coordinated solve",
    pre: (s) => s.flyTo(MIDWEST),
    target: "run-solve",
    action: (s) => s.startSolve("SCN-CARRIER"),
    hold: 8400,
  },
  {
    id: "ask-why",
    note: "Ask the twin why",
    pre: (s) => s.setNlq(true),
    target: "nlq-input",
    action: (s) => s.runNlq(HERO_QUERY),
    hold: 5600,
  },
  {
    id: "close-loop",
    note: "Close the loop — attribution & learning",
    action: (s) => {
      s.setNlq(false);
      s.setLoop(true);
    },
    hold: 4600,
  },
  {
    id: "open-dock",
    note: "Drop into the dock to build the truck",
    action: (s) => {
      s.setLoop(false);
      s.selectNode("DC-JOL");
      s.openScreen("dock", "DC-JOL");
    },
    hold: 5600,
  },
  {
    id: "calm",
    note: "Back to a calm, green network",
    action: (s) => {
      s.closeScreen();
      s.clearScenario();
      s.resetSolve();
      s.setLayers(["flows"]);
      s.closeInspector();
      s.flyTo({ ...US_OVERVIEW });
    },
    hold: 3200,
  },
];
