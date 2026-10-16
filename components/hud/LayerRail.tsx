"use client";
import { useStore } from "@/lib/store";
import { LAYERS, LAYER_BY_ID } from "@/lib/layers";
import { countAbove } from "@/lib/layer-metrics";
import { AnimatePresence, motion } from "framer-motion";

const RAMP_CSS: Record<string, string> = {
  risk: "linear-gradient(90deg,#3DD68C,#F5B944,#FF6B5A,#FF3B6B)",
  blue: "linear-gradient(90deg,#1A365D,#78BEFF)",
  flow: "linear-gradient(90deg,#1b2740,#6AA9FF)",
};

export default function LayerRail() {
  const active = useStore((s) => s.activeLayers);
  const toggle = useStore((s) => s.toggleLayer);
  const mode = useStore((s) => s.mode);
  const toggleMode = useStore((s) => s.toggleMode);

  const primary = active[0];
  const primaryDef = primary ? LAYER_BY_ID[primary] : null;
  const showChip = primaryDef && primary !== "flows";

  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex items-start gap-2">
      <div className="flex flex-col gap-1.5">
        <div className="glass p-1.5 flex flex-col gap-1">
          {LAYERS.map((l) => {
            const on = active.includes(l.id);
            return (
              <button
                key={l.id}
                onClick={() => toggle(l.id)}
                className="group relative w-9 h-9 rounded-[9px] grid place-items-center transition-all"
                style={{
                  background: on ? "rgba(77,225,193,0.14)" : "transparent",
                  color: on ? "var(--accent)" : "var(--text-low)",
                  boxShadow: on ? "inset 0 0 0 1px rgba(77,225,193,0.4)" : "none",
                }}
              >
                <span className="text-[16px] leading-none">{l.short}</span>
                {/* rich rail tooltip */}
                <div className="absolute left-11 top-0 w-[232px] p-2.5 rounded-lg glass opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-text-hi">{l.label}</span>
                    <kbd className="px-1 rounded bg-white/5 text-[10px] text-text-mid tnum">{l.key}</kbd>
                  </div>
                  <div className="text-[11px] text-text-mid mt-1 leading-snug">{l.meaning}</div>
                  <div className="h-1.5 rounded-full my-1.5" style={{ background: RAMP_CSS[l.ramp] }} />
                  <div className="text-[11px] text-text-low leading-snug">{l.encoding}</div>
                </div>
                {on && <span className="absolute -right-0.5 top-1 w-1 h-1 rounded-full bg-accent" />}
              </button>
            );
          })}
        </div>

        <button
          onClick={toggleMode}
          title="Toggle ontology view · O"
          className="glass w-12 h-11 rounded-[12px] grid place-items-center transition-all"
          style={{
            color: mode === "ontology" ? "var(--accent)" : "var(--text-low)",
            boxShadow: mode === "ontology" ? "inset 0 0 0 1px rgba(77,225,193,0.4)" : undefined,
          }}
        >
          <span className="text-[17px] leading-none">{mode === "ontology" ? "⊹" : "◎"}</span>
        </button>
      </div>

      {/* active-layer key chip */}
      <AnimatePresence>
        {showChip && primaryDef && (
          <motion.div
            key={primaryDef.id}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.2 }}
            className="glass p-2.5 w-[188px] mt-0"
          >
            <div className="label">{primaryDef.label}</div>
            <div className="h-2 rounded-full my-1.5" style={{ background: RAMP_CSS[primaryDef.ramp] }} />
            <div className="text-[10px] text-text-low leading-snug">{primaryDef.encoding}</div>
            {["age", "service", "fefo", "line", "inventory", "uncertainty", "cost"].includes(primaryDef.id) && (
              <div className="mt-1.5 text-[11px] text-text-mid tnum">
                <span className="text-accent">{countAbove(primaryDef.id, primaryDef.ramp === "blue" ? 0.6 : 0.6)}</span>{" "}
                {primaryDef.id === "fefo" ? "nodes below 100%" : "nodes above 0.60"}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
