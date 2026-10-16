"use client";
import { useStore } from "@/lib/store";
import { LAYERS } from "@/lib/layers";
import { motion } from "framer-motion";

export default function LayerRail() {
  const active = useStore((s) => s.activeLayers);
  const toggle = useStore((s) => s.toggleLayer);
  const mode = useStore((s) => s.mode);
  const toggleMode = useStore((s) => s.toggleMode);

  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1.5">
      <div className="glass p-1.5 flex flex-col gap-1">
        {LAYERS.map((l) => {
          const on = active.includes(l.id);
          return (
            <button
              key={l.id}
              onClick={() => toggle(l.id)}
              title={`${l.label}  ·  ${l.key}`}
              className="group relative w-9 h-9 rounded-[9px] grid place-items-center transition-all"
              style={{
                background: on ? "rgba(77,225,193,0.14)" : "transparent",
                color: on ? "var(--accent)" : "var(--text-low)",
                boxShadow: on ? "inset 0 0 0 1px rgba(77,225,193,0.4)" : "none",
              }}
            >
              <span className="text-[16px] leading-none">{l.short}</span>
              <span className="absolute left-11 whitespace-nowrap px-2 py-1 rounded-md glass text-[11px] text-text-hi opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30">
                {l.label} <span className="text-text-low">· {l.key}</span>
              </span>
              {on && (
                <motion.span layoutId={`dot-${l.id}`} className="absolute -right-0.5 top-1 w-1 h-1 rounded-full bg-accent" />
              )}
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
  );
}
