"use client";
import { useStore } from "@/lib/store";
import { SOLVE_BY_SCENARIO, solveDeltas } from "@/data/solves";
import { SCENARIO_BY_ID } from "@/data/scenarios";
import { AnimatePresence, motion } from "framer-motion";
import { CountUp } from "@/components/primitives";

const OPTIMIZERS = ["Deployment", "Repositioning", "Truck Build", "Raw Material Order"];

export default function SolveOverlay() {
  const scenarioId = useStore((s) => s.activeScenarioId);
  const stage = useStore((s) => s.solveStage);
  const startSolve = useStore((s) => s.startSolve);

  if (!scenarioId) return null;
  const plan = SOLVE_BY_SCENARIO[scenarioId];
  if (!plan) return null;

  const showRun = stage === "idle";

  return (
    <>
      {/* Run trigger */}
      <AnimatePresence>
        {showRun && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            onClick={() => startSolve()}
            className="absolute left-1/2 -translate-x-1/2 bottom-28 z-20 px-5 py-2.5 rounded-xl text-[14px] font-semibold flex items-center gap-2"
            style={{ background: "linear-gradient(135deg,#4DE1C1,#2bbda0)", color: "#06070A", boxShadow: "0 0 28px var(--accent-glow)" }}
          >
            ⟐ Run coordinated solve <span className="opacity-60 text-[12px]">S</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Stage 1 — optimizer claim rail */}
      <AnimatePresence>
        {(stage === "claim" || stage === "coordinate") && (
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            className="absolute left-20 top-1/2 -translate-y-1/2 z-20 glass p-3 w-[220px]"
          >
            <div className="label mb-2">
              {stage === "claim" ? "Optimizers claiming" : "Coordinating claims"}
            </div>
            <div className="flex flex-col gap-1.5">
              {OPTIMIZERS.map((o, i) => {
                const claims = plan.claims.filter((c) => c.optimizer === o);
                const contested = claims.some((c) => c.contested);
                return (
                  <motion.div
                    key={o}
                    initial={{ opacity: 0.3 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.12 }}
                    className="rounded-lg border p-2 flex items-center justify-between"
                    style={{
                      borderColor: stage === "claim" && contested ? "var(--risk-crit)" : "var(--stroke-faint)",
                      background: stage === "coordinate" ? "rgba(77,225,193,0.06)" : "rgba(255,255,255,0.02)",
                    }}
                  >
                    <div>
                      <div className="text-[12px] text-text-hi">{o}</div>
                      <div className="label !text-text-low">{claims.reduce((s, c) => s + c.pallets, 0)} pallets</div>
                    </div>
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        background: stage === "coordinate" ? "var(--accent)" : contested ? "var(--risk-crit)" : "var(--flow)",
                        boxShadow: `0 0 8px ${stage === "coordinate" ? "var(--accent)" : contested ? "var(--risk-crit)" : "var(--flow)"}`,
                      }}
                    />
                  </motion.div>
                );
              })}
            </div>
            {stage === "claim" && (
              <div className="label !text-risk-crit mt-2">⚠ 2 optimizers contesting the same pallets</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stage 2 — objective readout */}
      <AnimatePresence>
        {stage === "coordinate" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute left-1/2 -translate-x-1/2 bottom-28 z-20 glass px-4 py-3 flex items-center gap-5"
          >
            <ObjTicker label="Total cost" from={4_200_000} to={3_640_000} prefix="$" scale={1_000_000} suffix="M" decimals={2} />
            <ObjTicker label="Service" from={91.2} to={96.1} suffix="%" decimals={1} up />
            <ObjTicker label="Waste" from={24960} to={21840} suffix=" cs" />
            <GapTicker />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stage 3 — before / after reveal */}
      <AnimatePresence>
        {(stage === "reveal" || stage === "done") && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-1/2 -translate-x-1/2 bottom-24 z-20 glass p-4 w-[760px]"
          >
            <BeforeAfter scenarioId={scenarioId} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function ObjTicker({ label, from, to, prefix = "", suffix = "", scale = 1, decimals = 0, up = false }: { label: string; from: number; to: number; prefix?: string; suffix?: string; scale?: number; decimals?: number; up?: boolean }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="text-[16px] font-semibold tnum" style={{ color: up ? "var(--risk-low)" : "var(--accent)" }}>
        <CountUp value={to / scale} prefix={prefix} suffix={suffix} decimals={decimals} duration={2} />
      </div>
    </div>
  );
}

function GapTicker() {
  return (
    <div className="pl-5 border-l border-stroke-faint">
      <div className="label">Solver gap</div>
      <div className="text-[16px] font-semibold tnum text-accent">
        <CountUp value={0.0} decimals={3} duration={2} />
      </div>
    </div>
  );
}

function BeforeAfter({ scenarioId }: { scenarioId: string }) {
  const scn = SCENARIO_BY_ID[scenarioId];
  const plan = SOLVE_BY_SCENARIO[scenarioId];
  const d = solveDeltas(scenarioId);
  const rows = [
    { label: "Fill rate", before: `${scn.kpiAfter.fillRate.toFixed(1)}%`, after: `${plan.kpi.fillRate.toFixed(1)}%`, delta: `+${d.fillRate.toFixed(1)} pt`, good: true },
    { label: "Projected waste", before: `${scn.kpiAfter.projectedWasteCases.toLocaleString()} cs`, after: `${plan.kpi.projectedWasteCases.toLocaleString()} cs`, delta: `−${d.wasteCases.toLocaleString()} cs`, good: true },
    { label: "Waste $", before: `$${(scn.kpiAfter.projectedWasteDollars / 1000).toFixed(0)}k`, after: `$${(plan.kpi.projectedWasteDollars / 1000).toFixed(0)}k`, delta: `−$${(d.wasteDollars / 1000).toFixed(0)}k`, good: true },
    { label: "Freight cost", before: `$${(scn.kpiAfter.freightCost / 1e6).toFixed(2)}M`, after: `$${(plan.kpi.freightCost / 1e6).toFixed(2)}M`, delta: `−$${(d.freight / 1000).toFixed(0)}k`, good: true },
    { label: "Working capital", before: `$${(scn.kpiAfter.workingCapital / 1e6).toFixed(2)}M`, after: `$${(plan.kpi.workingCapital / 1e6).toFixed(2)}M`, delta: `−$${(d.workingCapital / 1e6).toFixed(2)}M`, good: true },
    { label: "Expedite cost", before: `$${(scn.kpiAfter.expediteCost / 1000).toFixed(0)}k`, after: `$${(plan.kpi.expediteCost / 1000).toFixed(0)}k`, delta: `−$${(d.expedite / 1000).toFixed(0)}k`, good: true },
  ];
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-0.5 h-5 bg-accent rounded-full" />
          <span className="text-[15px] font-semibold">Coordinated plan — one solve, not six</span>
        </div>
        <span className="label !text-text-low">{plan.flows.filter((f) => f.isNew).length} lanes re-routed · disrupted → solved</span>
      </div>
      <div className="grid grid-cols-6 gap-2">
        {rows.map((r) => (
          <div key={r.label} className="rounded-lg bg-white/[0.03] border border-stroke-faint p-2.5">
            <div className="label">{r.label}</div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="tnum text-[11px] text-text-low line-through">{r.before}</span>
            </div>
            <div className="tnum text-[15px] font-semibold text-text-hi">{r.after}</div>
            <div className="tnum text-[11px] mt-0.5" style={{ color: r.good ? "var(--risk-low)" : "var(--risk-high)" }}>{r.delta}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-col gap-1">
        {plan.tradeoffs.map((t, i) => (
          <div key={i} className="flex items-start gap-2 text-[12px] text-text-mid">
            <span className="text-accent mt-0.5">▸</span> {t}
          </div>
        ))}
      </div>
    </div>
  );
}
