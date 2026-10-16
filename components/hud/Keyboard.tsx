"use client";
import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { LAYERS } from "@/lib/layers";

export default function Keyboard() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useStore.getState();
      const target = e.target as HTMLElement;
      const typing = ["INPUT", "TEXTAREA"].includes(target.tagName);

      // Cmd/Ctrl+K — command bar (works even while typing elsewhere)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        s.setCommandBar(!s.commandBarOpen);
        return;
      }
      if (typing) {
        if (e.key === "Escape") (target as HTMLInputElement).blur();
        return;
      }

      switch (e.key) {
        case "p":
        case "P":
          s.presenterMode ? s.exitPresenter() : s.enterPresenter();
          break;
        case "ArrowRight":
          if (s.presenterMode) {
            e.preventDefault();
            s.nextBeat();
          }
          break;
        case "ArrowLeft":
          if (s.presenterMode) {
            e.preventDefault();
            s.prevBeat();
          }
          break;
        case "Escape":
          if (s.commandBarOpen) s.setCommandBar(false);
          else if (s.helpOpen) s.setHelp(false);
          else if (s.nlqOpen) s.setNlq(false);
          else if (s.loopOpen) s.setLoop(false);
          else if (s.scenarioRailOpen) s.setScenarioRail(false);
          else if (s.presenterMode) s.exitPresenter();
          else if (s.selectedNodeId || s.selectedLaneId || s.selectedBatchId) s.closeInspector();
          break;
        case "o":
        case "O":
          s.toggleMode();
          break;
        case "s":
        case "S":
          if (s.activeScenarioId) s.startSolve();
          break;
        case "d":
        case "D":
          s.setScenarioRail(!s.scenarioRailOpen);
          break;
        case "n":
        case "N":
          s.setNlq(!s.nlqOpen);
          break;
        case "l":
        case "L":
          s.setLoop(!s.loopOpen);
          break;
        case "?":
          s.setHelp(!s.helpOpen);
          break;
        default:
          if (/^[1-9]$/.test(e.key)) {
            const layer = LAYERS.find((l) => l.key === e.key);
            if (layer) s.toggleLayer(layer.id);
          }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return null;
}
