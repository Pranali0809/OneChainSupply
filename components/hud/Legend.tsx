"use client";
import { useStore, RiskTierFilter } from "@/lib/store";
import { NODES } from "@/data/network";

const TIERS: { id: Exclude<RiskTierFilter, null>; label: string; color: string; lo: number; hi: number }[] = [
  { id: "low", label: "Low", color: "var(--risk-low)", lo: 0, hi: 0.4 },
  { id: "med", label: "Medium", color: "var(--risk-med)", lo: 0.4, hi: 0.7 },
  { id: "high", label: "High", color: "var(--risk-high)", lo: 0.7, hi: 0.85 },
  { id: "crit", label: "Critical", color: "var(--risk-crit)", lo: 0.85, hi: 1.01 },
];

// Composite-risk tier counts (stable — legend reflects composite, not active layer).
const COUNTS: Record<string, number> = TIERS.reduce((acc, t) => {
  acc[t.id] = NODES.filter((n) => n.composite >= t.lo && n.composite < t.hi).length;
  return acc;
}, {} as Record<string, number>);

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
    // offset clear of the layer rail (rail width + 16px) so nothing is overlapped
    <div className="absolute left-[84px] bottom-4 z-20 glass p-3 w-[212px]">
      <div className="label mb-2">Composite risk — click to isolate</div>
      <div className="flex flex-col gap-1">
        {TIERS.map((t) => {
          const on = isolated === t.id;
          const dim = isolated && !on;
          const count = COUNTS[t.id];
          const empty = count === 0;
          return (
            <button
              key={t.id}
              disabled={empty}
              onClick={() => setIsolated(t.id)}
              className="flex items-center gap-2 py-0.5 transition-opacity disabled:cursor-not-allowed"
              style={{ opacity: empty ? 0.4 : dim ? 0.35 : 1 }}
            >
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: t.color, boxShadow: empty ? "none" : `0 0 8px ${t.color}` }} />
              <span className="text-[12px] text-text-mid flex-1 text-left">{t.label}</span>
              {empty ? (
                <span className="label !text-text-low">none right now</span>
              ) : on ? (
                <span className="label !text-accent">isolated</span>
              ) : (
                <span className="tnum text-[12px] text-text-hi">{count}</span>
              )}
            </button>
          );
        })}
      </div>
      {isolated && (
        <button onClick={() => setIsolated(isolated)} className="mt-2 label !text-accent hover:underline">
          clear isolation ✕
        </button>
      )}
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
