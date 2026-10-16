"use client";
import { useStore } from "@/lib/store";
import { SCENARIOS } from "@/data/scenarios";
import { AnimatePresence, motion } from "framer-motion";
import { Chip } from "@/components/primitives";

export default function ScenarioRail() {
  const open = useStore((s) => s.scenarioRailOpen);
  const setOpen = useStore((s) => s.setScenarioRail);
  const fire = useStore((s) => s.fireScenario);
  const active = useStore((s) => s.activeScenarioId);
  const clear = useStore((s) => s.clearScenario);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="absolute right-4 top-[72px] z-20 glass px-3 py-2 text-[12px] flex items-center gap-2 hover:text-accent transition-colors"
        style={{ color: open ? "var(--accent)" : "var(--text-mid)" }}
      >
        <span className="text-[14px]">⚡</span> Inject disruption <span className="label !text-text-low">D</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-4 top-[116px] z-20 w-[340px] glass p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="label">Scenario library</span>
              {active && (
                <button onClick={clear} className="label !text-risk-high hover:underline">clear ✕</button>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {SCENARIOS.map((s) => {
                const on = active === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => fire(s.id)}
                    className="text-left rounded-lg border p-2.5 transition-all"
                    style={{
                      borderColor: on ? "var(--risk-high)" : "var(--stroke-faint)",
                      background: on ? "rgba(255,107,90,0.07)" : "rgba(255,255,255,0.02)",
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] text-text-hi font-medium leading-tight">{s.name}</span>
                      {on && <Chip tone="high">live</Chip>}
                    </div>
                    <div className="label !text-text-low mt-1">
                      {s.severedLanes.length} lanes severed · {s.impactedNodes.length} nodes impacted
                    </div>
                  </button>
                );
              })}
            </div>
            {active && (
              <div className="mt-3 text-[11px] text-text-mid">
                Press <span className="text-accent">S</span> to run the coordinated solve.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
