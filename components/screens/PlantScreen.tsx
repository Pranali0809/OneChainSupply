"use client";
import { useMemo, useState } from "react";
import { Reorder, AnimatePresence, motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { NODE_BY_ID } from "@/data/network";
import {
  getPlant,
  plantLineRisk,
  changeoverForSequence,
  optimizeSequence,
  PlantOrder,
  PlantLine,
  Machine,
} from "@/data/plant";
import { Chip } from "@/components/primitives";
import { riskRampHex } from "@/lib/palette";

const CASE_MARGIN = 7; // $ contribution per extra case
const FAM_COLOR: Record<string, string> = { PET: "#4DE1C1", CEREAL: "#F5B944", SNACKS: "#6AA9FF" };

function downtime(m: Machine) {
  const unplanned = Math.round((20 - Math.min(20, m.rulDays)) * 9000 + 70000);
  const planned = Math.round(unplanned * 0.28);
  return { unplanned, planned };
}

export default function PlantScreen({ id }: { id: string }) {
  const node = NODE_BY_ID[id];
  const plant = getPlant(id);
  const close = useStore((s) => s.closeScreen);
  const commit = useStore((s) => s.commitDecision);
  const advanceClock = useStore((s) => s.setClockWeek);
  const clockWeek = useStore((s) => s.clockWeek);

  const [sequence, setSequence] = useState<PlantOrder[]>(plant ? [...plant.sequence] : []);
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const [scheduled, setScheduled] = useState<Set<string>>(new Set());
  const [maintTarget, setMaintTarget] = useState<{ line: PlantLine; machine: Machine } | null>(null);
  const [selectedLine, setSelectedLine] = useState<string>(plant?.lines[0]?.id ?? "");
  const [optimizeGain, setOptimizeGain] = useState<number | null>(null);
  const [committedId, setCommittedId] = useState<string | null>(null);

  const matrix = plant?.changeover;

  const currentChangeover = useMemo(
    () => (matrix ? changeoverForSequence(sequence, matrix) : 0),
    [sequence, matrix]
  );
  if (!node || !plant || !matrix) return null;

  const rateCsPerMin = plant.rateCsPerHr / 60;
  const minutesSaved = plant.baselineChangeoverMin - currentChangeover;
  const casesGained = Math.round(minutesSaved * rateCsPerMin);
  const newWeekly = plant.totalWeeklyCases + casesGained;

  // effective per-line state with failures / maintenance
  const effLine = (l: PlantLine) => {
    const lineFailed = l.machines.some((m) => failed.has(m.id));
    const lineScheduled = l.machines.some((m) => scheduled.has(m.id));
    const actualRate = lineFailed ? Math.round(l.actualRate * 0.5) : l.actualRate;
    const risk = Math.max(0, Math.min(1, l.risk + (lineFailed ? 0.22 : 0) - (lineScheduled ? 0.08 : 0)));
    return { actualRate, risk, lineFailed };
  };

  const newPlantLineRisk = Math.max(...plant.lines.map((l) => effLine(l).risk));
  const lineRiskDelta = +(newPlantLineRisk - plantLineRisk(id)).toFixed(3);

  const sel = plant.lines.find((l) => l.id === selectedLine)!;
  const visionLine = plant.lines.find((l) => l.machines.some((m) => m.kind === "vision"));

  const avgRate = plant.rateCsPerHr / plant.lines.length;

  const doOptimize = () => {
    const before = currentChangeover;
    const best = optimizeSequence(sequence, matrix);
    setSequence(best);
    setOptimizeGain(before - changeoverForSequence(best, matrix));
  };

  const runToFailure = (line: PlantLine, m: Machine) => {
    setFailed((s) => new Set(s).add(m.id));
    setMaintTarget(null);
    advanceClock(Math.min(38, clockWeek + 2)); // clock advances to the failure
  };
  const scheduleMaint = (m: Machine) => {
    setScheduled((s) => new Set(s).add(m.id));
    setMaintTarget(null);
  };

  const doCommit = () => {
    const wasteDelta = -Math.round(casesGained * 0.15) + failed.size * 420;
    const fillDelta = +(Math.min(0.5, casesGained / 9000) - failed.size * 0.4).toFixed(1);
    const ev = Math.round(casesGained * CASE_MARGIN + scheduled.size * 18000 - failed.size * 60000);
    const entry = commit({
      objectId: id,
      objectLabel: `${node.code} · ${node.name}`,
      title: `Plant plan — re-sequence (${minutesSaved >= 0 ? "−" : "+"}${Math.abs(minutesSaved)}m changeover)${failed.size ? " + failure" : scheduled.size ? " + maintenance" : ""}`,
      expectedValue: ev,
      status: "executed",
      kpi: { projectedWasteCases: wasteDelta, projectedWasteDollars: wasteDelta * 92, fillRate: fillDelta },
      nodeRiskDelta: { nodeId: id, delta: lineRiskDelta },
      rationale: `Weekly cases ${newWeekly.toLocaleString()} (${casesGained >= 0 ? "+" : ""}${casesGained.toLocaleString()} from ${Math.abs(minutesSaved)}m changeover saved). Line risk → ${newPlantLineRisk.toFixed(2)}.`,
      actor: "ONECHAIN · plant floor",
    });
    setCommittedId(entry.id);
  };

  return (
    <div className="max-w-[1180px] mx-auto">
      {/* header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="label !text-accent">Plant floor · live twin</div>
          <motion.h1
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: "left center" }}
            className="text-[26px] font-semibold tracking-tight mt-0.5"
          >
            {node.name}, {node.state}
          </motion.h1>
          <p className="text-[13px] text-text-mid mt-0.5">
            {node.code} · {plant.lines.length} lines · {plant.totalWeeklyCases.toLocaleString()} cs/wk nameplate · {node.businessUnits.join(" · ")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="label">Plant line risk</div>
            <div className="tnum text-[20px] font-semibold" style={{ color: riskRampHex(newPlantLineRisk) }}>{newPlantLineRisk.toFixed(2)}</div>
          </div>
          <button onClick={close} className="text-text-low hover:text-text-hi text-[13px] flex items-center gap-1.5">
            Exit <kbd className="px-1 rounded bg-white/5 text-[10px]">Esc</kbd>
          </button>
        </div>
      </div>

      {/* floor schematic */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        className="mt-5 rounded-2xl border border-stroke-faint bg-[#080a0f] p-4"
        style={{ transformOrigin: "center top" }}
      >
        <div className="label mb-2">Top-down floor schematic — product flows at actual line rate</div>
        <div className="flex flex-col gap-3">
          {plant.lines.map((l) => {
            const e = effLine(l);
            const dur = Math.max(1.6, 3.4 * (avgRate / Math.max(1, e.actualRate)));
            const on = selectedLine === l.id;
            return (
              <button
                key={l.id}
                onClick={() => setSelectedLine(l.id)}
                className="relative rounded-xl border px-3 py-2 text-left transition-colors"
                style={{ borderColor: on ? "var(--accent)" : "var(--stroke-faint)", background: on ? "rgba(77,225,193,0.04)" : "transparent" }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[13px] font-semibold">{l.id}</span>
                  {e.lineFailed && <Chip tone="crit">line down</Chip>}
                  <span className="label !text-text-low tnum">{e.actualRate} / {l.committedRate} cs/hr · OEE {(l.oee * 100).toFixed(0)}%</span>
                </div>
                {/* conveyor */}
                <div className="relative h-11">
                  <div className="absolute left-2 right-2 top-1/2 -translate-y-1/2 h-[3px] rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} />
                  {/* flow tiles */}
                  {[0, 1, 2, 3].map((k) => (
                    <span
                      key={k}
                      className="conv-tile w-2.5 h-2.5 rounded-[3px]"
                      style={{ background: FAM_COLOR[plant.sequence[0]?.family ?? "PET"], animationDuration: `${dur}s`, animationDelay: `${(dur / 4) * k}s`, boxShadow: "0 0 8px rgba(106,169,255,0.6)" }}
                    />
                  ))}
                  {/* machines in order */}
                  <div className="absolute inset-0 flex items-center justify-between px-1">
                    {l.machines.map((m) => {
                      const isFailed = failed.has(m.id);
                      const isSched = scheduled.has(m.id);
                      const risk = isFailed ? 1 : isSched ? Math.max(0, m.risk - 0.25) : m.risk;
                      const degraded = risk > 0.6 || isFailed;
                      return (
                        <span
                          key={m.id}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            setSelectedLine(l.id);
                            setMaintTarget({ line: l, machine: m });
                          }}
                          title={`${m.name} · RUL ${m.rulDays}d · risk ${risk.toFixed(2)}`}
                          className={`relative z-10 grid place-items-center rounded-md cursor-pointer ${degraded ? "machine-degraded" : ""}`}
                          style={{ width: 58, height: 26, background: "#0c0f16", border: `1px solid ${riskRampHex(risk)}`, color: riskRampHex(risk) }}
                        >
                          <span className="text-[9px] font-medium leading-none">{m.name.split(" ")[0]}</span>
                          {m.rulDays < 20 && !isSched && !isFailed && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-risk-crit breathe" />}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* interaction panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        {/* sequence reorder */}
        <div className="rounded-xl border border-stroke-faint bg-white/[0.02] p-4">
          <div className="flex items-center justify-between">
            <div className="label">Weekly production sequence — drag to re-sequence</div>
            <button onClick={doOptimize} className="px-2.5 py-1 rounded-lg text-[12px] font-medium" style={{ background: "rgba(77,225,193,0.14)", color: "var(--accent)" }}>
              Optimize ⚡
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 my-3">
            <Readout label="Changeover" value={`${currentChangeover}m`} tone={minutesSaved > 0 ? "good" : minutesSaved < 0 ? "bad" : "flat"} />
            <Readout label="Weekly cases" value={newWeekly.toLocaleString()} tone={casesGained > 0 ? "good" : casesGained < 0 ? "bad" : "flat"} />
            <Readout label="Rate" value={`${plant.rateCsPerHr.toLocaleString()} cs/hr`} tone="flat" />
          </div>
          <div className="text-[11px] text-text-low mb-2">
            cases gained = minutes saved × rate ⇒ <span className="tnum text-text-mid">{minutesSaved} × {rateCsPerMin.toFixed(1)}/min = {casesGained >= 0 ? "+" : ""}{casesGained.toLocaleString()} cs</span>
          </div>
          <AnimatePresence>
            {optimizeGain != null && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-[12px] text-accent mb-2">
                Optimized → {optimizeGain >= 0 ? "saved" : "cost"} {Math.abs(optimizeGain)}m changeover, {(optimizeGain * rateCsPerMin >= 0 ? "+" : "")}{Math.round(optimizeGain * rateCsPerMin).toLocaleString()} cs.
              </motion.div>
            )}
          </AnimatePresence>
          <Reorder.Group axis="y" values={sequence} onReorder={(v) => { setSequence(v); setOptimizeGain(null); }} className="flex flex-col gap-1 max-h-[218px] overflow-y-auto pr-1">
            {sequence.map((o, i) => (
              <Reorder.Item key={o.id} value={o} className="flex items-center gap-2 rounded-lg border border-stroke-faint bg-[#0c0f16] px-2.5 py-1.5 cursor-grab active:cursor-grabbing">
                <span className="label !text-text-low tnum w-5">{i + 1}</span>
                <span className="w-2 h-2 rounded-full" style={{ background: FAM_COLOR[o.family] }} />
                <span className="text-[12px] text-text-hi flex-1 truncate">{o.desc}</span>
                <span className="label !text-text-low">{o.qtyCases.toLocaleString()} cs</span>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </div>

        {/* right column: OEE + vision + commit */}
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-stroke-faint bg-white/[0.02] p-4">
            <div className="label mb-2">{sel.id} — OEE = availability × performance × quality</div>
            <div className="flex items-center gap-2">
              <OeeFactor label="Availability" v={sel.availability} />
              <span className="text-text-low">×</span>
              <OeeFactor label="Performance" v={sel.performance} />
              <span className="text-text-low">×</span>
              <OeeFactor label="Quality" v={sel.quality} />
              <span className="text-text-low">=</span>
              <div className="text-center">
                <div className="label">OEE</div>
                <div className="tnum text-[18px] font-semibold text-accent">{(sel.oee * 100).toFixed(1)}%</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <Mini label="Yield" value={`${sel.yieldPct}%`} />
              <Mini label="Energy" value={`${sel.energyPerCase} kWh/cs`} />
              <Mini label="Line risk" value={effLine(sel).risk.toFixed(2)} color={riskRampHex(effLine(sel).risk)} />
            </div>
          </div>

          {/* vision station */}
          {visionLine && (
            <VisionStrip line={visionLine} />
          )}

          {/* commit */}
          <div className="rounded-xl border p-4" style={{ borderColor: "rgba(77,225,193,0.3)", background: "rgba(77,225,193,0.04)" }}>
            <div className="flex items-center justify-between">
              <div className="label !text-accent">Commit plant plan</div>
              <span className="label !text-text-low">line risk Δ {lineRiskDelta >= 0 ? "+" : ""}{lineRiskDelta.toFixed(2)}</span>
            </div>
            <div className="text-[12px] text-text-mid mt-1">
              Updates risk.ts line risk, the map Line-health layer, the KPI strip and the decision ledger.
            </div>
            <div className="flex items-center gap-3 mt-3">
              <button onClick={doCommit} className="px-4 py-2 rounded-lg text-[13px] font-semibold" style={{ background: "rgba(77,225,193,0.16)", color: "var(--accent)", boxShadow: "inset 0 0 0 1px rgba(77,225,193,0.4)" }}>
                Commit to twin
              </button>
              {committedId && (
                <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="text-[12px] text-text-mid">
                  Committed <span className="text-accent tnum">{committedId}</span> — press <kbd className="px-1 rounded bg-white/5 text-[10px]">R</kbd> to reset.
                </motion.span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* maintenance modal */}
      <AnimatePresence>
        {maintTarget && (
          <MaintModal
            line={maintTarget.line}
            machine={maintTarget.machine}
            onSchedule={() => scheduleMaint(maintTarget.machine)}
            onRunToFailure={() => runToFailure(maintTarget.line, maintTarget.machine)}
            onClose={() => setMaintTarget(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function Readout({ label, value, tone }: { label: string; value: string; tone: "good" | "bad" | "flat" }) {
  const color = tone === "good" ? "var(--risk-low)" : tone === "bad" ? "var(--risk-high)" : "var(--text-hi)";
  return (
    <div className="rounded-lg bg-white/[0.03] p-2.5">
      <div className="label">{label}</div>
      <div className="tnum text-[16px] font-semibold" style={{ color }}>{value}</div>
    </div>
  );
}

function OeeFactor({ label, v }: { label: string; v: number }) {
  return (
    <div className="text-center flex-1">
      <div className="label">{label}</div>
      <div className="tnum text-[15px] font-semibold text-text-hi">{(v * 100).toFixed(1)}%</div>
    </div>
  );
}

function Mini({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-md bg-white/[0.03] p-2">
      <div className="label">{label}</div>
      <div className="tnum text-[13px] font-semibold" style={{ color: color ?? "var(--text-hi)" }}>{value}</div>
    </div>
  );
}

function VisionStrip({ line }: { line: PlantLine }) {
  const rejectRate = +((1 - line.quality) * 100).toFixed(1);
  const total = 18;
  // deterministic defect positions from quality
  const defects = useMemo(() => {
    const count = Math.max(1, Math.round((total * rejectRate) / 100) + 1);
    const set = new Set<number>();
    let seed = Math.round(line.quality * 10000);
    while (set.size < count) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      set.add(seed % total);
    }
    return set;
  }, [line.quality, rejectRate]);
  return (
    <div className="rounded-xl border border-stroke-faint bg-white/[0.02] p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="label">Vision station — {line.id} inline inspection</div>
        <span className="tnum text-[13px] font-semibold" style={{ color: rejectRate > 2 ? "var(--risk-high)" : "var(--risk-low)" }}>{rejectRate}% reject</span>
      </div>
      <div className="relative h-9 overflow-hidden rounded-lg bg-[#080a0f] border border-stroke-faint">
        {Array.from({ length: total }).map((_, i) => {
          const bad = defects.has(i);
          const dur = 6;
          return (
            <span
              key={i}
              className="conv-tile grid place-items-center rounded-[3px]"
              style={{
                width: 16,
                height: 16,
                background: bad ? "rgba(255,59,107,0.18)" : "rgba(106,169,255,0.14)",
                border: `1px solid ${bad ? "var(--risk-crit)" : "rgba(106,169,255,0.5)"}`,
                animationDuration: `${dur}s`,
                animationDelay: `${(dur / total) * i}s`,
              }}
            >
              {bad && <span className="text-[9px]" style={{ color: "var(--risk-crit)" }}>✕</span>}
            </span>
          );
        })}
      </div>
      <div className="label !text-text-low mt-1.5">Flagged cases diverted to rework — no manual re-check.</div>
    </div>
  );
}

function MaintModal({ line, machine, onSchedule, onRunToFailure, onClose }: { line: PlantLine; machine: Machine; onSchedule: () => void; onRunToFailure: () => void; onClose: () => void }) {
  const { planned, unplanned } = downtime(machine);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-center p-6" style={{ background: "rgba(6,7,10,0.7)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="glass p-5 w-[460px]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="label !text-accent">{line.id} · {machine.name}</div>
          <Chip tone={machine.rulDays < 20 ? "crit" : "med"}>RUL {machine.rulDays}d</Chip>
        </div>
        <div className="text-[14px] text-text-hi mt-1">Remaining useful life is {machine.rulDays < 20 ? "critically low" : "within policy"}.</div>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <button onClick={onSchedule} className="rounded-xl border p-3 text-left hover:border-accent/50 transition-colors" style={{ borderColor: "var(--stroke-faint)" }}>
            <div className="text-[13px] font-semibold text-text-hi">Schedule maintenance window</div>
            <div className="label !text-text-low mt-1">Planned downtime cost</div>
            <div className="tnum text-[18px] font-semibold text-risk-low">${(planned / 1000).toFixed(0)}k</div>
          </button>
          <button onClick={onRunToFailure} className="rounded-xl border p-3 text-left hover:border-risk-high/60 transition-colors" style={{ borderColor: "var(--stroke-faint)" }}>
            <div className="text-[13px] font-semibold text-text-hi">Run to failure</div>
            <div className="label !text-text-low mt-1">Expected unplanned cost</div>
            <div className="tnum text-[18px] font-semibold text-risk-high">${(unplanned / 1000).toFixed(0)}k</div>
          </button>
        </div>
        <div className="text-[11px] text-text-low mt-3">Run-to-failure advances the twin clock to the failure, slows the line, and raises line risk.</div>
      </motion.div>
    </motion.div>
  );
}
