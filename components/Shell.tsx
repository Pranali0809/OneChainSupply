"use client";
import dynamic from "next/dynamic";
import TopBar from "./hud/TopBar";
import LayerRail from "./hud/LayerRail";
import Legend from "./hud/Legend";
import TwinClock from "./hud/TwinClock";
import CaptionBar from "./hud/CaptionBar";
import Keyboard from "./hud/Keyboard";
import Inspector from "./hud/Inspector";
import ScenarioRail from "./hud/ScenarioRail";
import CommandBar from "./hud/CommandBar";
import HelpOverlay from "./hud/HelpOverlay";
import SolveOverlay from "./acts/SolveOverlay";
import NlqBar from "./acts/NlqBar";
import LoopView from "./acts/LoopView";
import GhostPanels from "./acts/GhostPanels";
import CloseOverlay from "./acts/CloseOverlay";
import PresenterControls from "./acts/PresenterControls";
import ScreenHost from "./screens/ScreenHost";
import Autopilot from "./demo/Autopilot";

const TwinCanvas = dynamic(() => import("./twin/TwinCanvas"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-items-center text-text-low">
      <span className="label">initializing twin…</span>
    </div>
  ),
});

export default function Shell() {
  return (
    <main className="relative w-screen h-screen overflow-hidden bg-void">
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(130% 90% at 50% 10%, rgba(30,40,56,0.35), rgba(6,7,10,0) 55%), radial-gradient(100% 80% at 50% 110%, rgba(77,225,193,0.06), rgba(6,7,10,0) 50%)",
        }}
      />
      <TwinCanvas />
      <ScreenHost />
      <TopBar />
      <LayerRail />
      <Legend />
      <TwinClock />
      <ScenarioRail />
      <Inspector />
      <SolveOverlay />
      <NlqBar />
      <LoopView />
      <GhostPanels />
      <CloseOverlay />
      <CaptionBar />
      <PresenterControls />
      <CommandBar />
      <HelpOverlay />
      <Autopilot />
      <Keyboard />
    </main>
  );
}
