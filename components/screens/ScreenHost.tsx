"use client";
import { useStore } from "@/lib/store";
import { AnimatePresence, motion } from "framer-motion";
import PlantScreen from "./PlantScreen";
import DockScreen from "./DockScreen";
import PlanScreen from "./PlanScreen";

// Deep-dive screens open as overlays over the persistent twin with a
// shared-element (scale/fade) transition; Esc reverses, R resets.
export default function ScreenHost() {
  const screen = useStore((s) => s.activeScreen);
  const close = useStore((s) => s.closeScreen);

  return (
    <AnimatePresence>
      {screen && (
        <motion.div
          key={screen.kind + (screen.id ?? "")}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
          className="absolute left-0 right-0 bottom-0 top-14 z-30"
          style={{ background: "rgba(6,7,10,0.72)", backdropFilter: "blur(6px)" }}
          onClick={close}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-6 glass p-6 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {screen.kind === "plant" && <PlantScreen id={screen.id!} />}
            {screen.kind === "dock" && <DockScreen id={screen.id!} />}
            {screen.kind === "plan" && <PlanScreen />}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
