"use client";
import { useStore, RiskTierFilter } from "@/lib/store";

const TIERS: { id: Exclude<RiskTierFilter, null>; label: string; color: string }[] = [
  { id: "low", label: "Low", color: "var(--risk-low)" },
  { id: "med", label: "Medium", color: "var(--risk-med)" },
  { id: "high", label: "High", color: "var(--risk-high)" },
  { id: "crit", label: "Critical", color: "var(--risk-crit)" },
];

const SHAPES = [
  { glyph: "⬡", label: "Plant" },
  { glyph: "●", label: "DC" },
  { glyph: "■", label: "Customer" },
  { glyph: "▲", label: "Supplier" },
];

export default function Legend() {
  const isolated = useStore((s) => s.isolatedTier);
  const setIsolated = useStore((s) => s.setIsolatedTier);
  const mode = useStore((s) => s.mode);

  return (
    <div className="absolute left-4 bottom-4 z-20 glass p-3 w-[210px]">
      <div className="label mb-2">Composite risk — click to isolate</div>
      <div className="flex flex-col gap-1">
        {TIERS.map((t) => {
          const on = isolated === t.id;
          const dim = isolated && !on;
          return (
            <button
              key={t.id}
              onClick={() => setIsolated(t.id)}
              className="flex items-center gap-2 py-0.5 transition-opacity"
              style={{ opacity: dim ? 0.35 : 1 }}
            >
              <span className="w-3 h-3 rounded-full" style={{ background: t.color, boxShadow: `0 0 8px ${t.color}` }} />
              <span className="text-[12px] text-text-mid flex-1 text-left">{t.label}</span>
              {on && <span className="label !text-accent">isolated</span>}
            </button>
          );
        })}
      </div>
      <div className="mt-2.5 pt-2.5 border-t border-stroke-faint">
        <div className="label mb-1.5">{mode === "ontology" ? "Object type" : "Node type"}</div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
          {SHAPES.map((s) => (
            <div key={s.label} className="flex items-center gap-1.5">
              <span className="text-text-low text-[12px] w-3 text-center">{s.glyph}</span>
              <span className="text-[11px] text-text-mid">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
