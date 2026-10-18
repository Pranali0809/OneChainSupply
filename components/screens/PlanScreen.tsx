"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { BusinessUnit } from "@/lib/types";
import {
  PLAN_CUSTOMERS, FAMILIES, DEFAULT_HANDLES, balancedHandles, computePlan, promoReadiness,
  Handles, NOW_WEEK, TOTAL_WEEKS, WEEK_LABELS, BIAS_ACCURACY, PLAN_BASELINE_FILL,
} from "@/data/planroom";
import { Chip } from "@/components/primitives";

const W = 1040, H = 300, padL = 12, padR = 22, padT = 16, padB = 28;
const plotW = W - padL - padR;
const plotH = H - padT - padB;
const step = plotW / (TOTAL_WEEKS - 1);

export default function PlanScreen() {
  const close = useStore((s) => s.closeScreen);
  const commit = useStore((s) => s.commitDecision);

  const [custId, setCustId] = useState(PLAN_CUSTOMERS[0].code);
  const [family, setFamily] = useState<BusinessUnit>("PET");
  const [handles, setHandles] = useState<Handles>({ ...DEFAULT_HANDLES, promo: { ...DEFAULT_HANDLES.promo } });
  const [biasOn, setBiasOn] = useState(false);
  const [balanceGain, setBalanceGain] = useState<string | null>(null);
  const [committedId, setCommittedId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const plan = computePlan(custId, family, handles, biasOn);
  const basePlan = useMemo(() => computePlan(custId, family, DEFAULT_HANDLES), [custId, family]);
  const readiness = promoReadiness(custId, family, handles);

  const yMax = useMemo(() => Math.max(...plan.rows.map((r) => r.p90)) * 1.12, [plan]);
  const x = useCallback((w: number) => padL + w * step, []);
  const y = useCallback((v: number) => padT + plotH - (v / yMax) * plotH, [yMax]);

  // ── pointer-driven handle dragging (no transform conflicts) ──────────────
  const dragKind = useRef<null | "cap" | "safety" | "promoMove" | "promoLift">(null);
  const grabWeekOffset = useRef(0);
  const begin = (kind: typeof dragKind.current, e: React.PointerEvent) => {
    dragKind.current = kind;
    if (kind === "promoMove") {
      const rect = svgRef.current!.getBoundingClientRect();
      const wk = weekAt(e.clientX, rect);
      grabWeekOffset.current = wk - handles.promo.start;
    }
    e.preventDefault();
  };
  const weekAt = (clientX: number, rect: DOMRect) => {
    const relX = ((clientX - rect.left) / rect.width) * W - padL;
    return Math.max(0, Math.min(TOTAL_WEEKS - 1, Math.round(relX / step)));
  };
  const valAt = (clientY: number, rect: DOMRect) => {
    const relY = ((clientY - rect.top) / rect.height) * H - padT;
    return Math.max(0, (1 - relY / plotH)) * yMax;
  };
  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!dragKind.current || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      setBalanceGain(null);
      if (dragKind.current === "cap") {
        const relY = ((e.clientY - rect.top) / rect.height) * H - padT;
        const pct = 1.3 - (relY / plotH) * 0.5; // top=1.3, bottom=0.8
        setHandles((h) => ({ ...h, capacityPct: +Math.max(0.8, Math.min(1.3, pct)).toFixed(3) }));
      } else if (dragKind.current === "safety") {
        const relY = ((e.clientY - rect.top) / rect.height) * H - padT;
        const wk = (1 - relY / plotH) * 6;
        setHandles((h) => ({ ...h, safetyWeeks: Math.max(0, Math.min(6, Math.round(wk))) }));
      } else if (dragKind.current === "promoMove") {
        const wk = weekAt(e.clientX, rect) - grabWeekOffset.current;
        const width = handles.promo.end - handles.promo.start;
        const start = Math.max(NOW_WEEK + 1, Math.min(TOTAL_WEEKS - 1 - width, wk));
        setHandles((h) => ({ ...h, promo: { ...h.promo, start, end: start + width } }));
      } else if (dragKind.current === "promoLift") {
        const v = valAt(e.clientY, rect);
        const baseAtStart = plan.rows[handles.promo.start].demand / (1 + handles.promo.pct);
        const pct = Math.max(0, Math.min(0.5, v / Math.max(1, baseAtStart) - 1));
        setHandles((h) => ({ ...h, promo: { ...h.promo, pct: +pct.toFixed(2) } }));
      }
    };
    const up = () => (dragKind.current = null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [handles, plan, yMax]);

  // ── paths ────────────────────────────────────────────────────────────────
  const fanPath = useMemo(() => {
    const top = plan.rows.map((r) => `${x(r.week)},${y(r.p90)}`).join(" L");
    const bot = [...plan.rows].reverse().map((r) => `${x(r.week)},${y(r.p10)}`).join(" L");
    return `M${top} L${bot} Z`;
  }, [plan, x, y]);
  const line = (sel: (r: typeof plan.rows[number]) => number | undefined) =>
    plan.rows.filter((r) => sel(r) != null).map((r, i) => `${i ? "L" : "M"}${x(r.week)},${y(sel(r)!)}`).join(" ");

  const doBalance = () => {
    const before = plan.fillRate;
    const beforeCuts = plan.cuts;
    const best = balancedHandles();
    setHandles(best);
    const after = computePlan(custId, family, best, biasOn);
    setBalanceGain(`Fill ${(before * 100).toFixed(1)}% → ${(after.fillRate * 100).toFixed(1)}% (+${((after.fillRate - before) * 100).toFixed(1)} pt), cuts −${(beforeCuts - after.cuts).toLocaleString()} cs`);
  };

  const doCommit = () => {
    const fillDelta = +((plan.fillRate - basePlan.fillRate) * 100).toFixed(1);
    const cutsDelta = basePlan.cuts - plan.cuts;
    const wcDelta = plan.workingCapital - basePlan.workingCapital;
    const cust = PLAN_CUSTOMERS.find((c) => c.code === custId)!;
    const entry = commit({
      objectId: "PLAN-ROOM",
      objectLabel: `S&OP · ${cust.name} · ${family}`,
      title: `S&OP plan — ${cust.name} / ${family} (fill ${(plan.fillRate * 100).toFixed(1)}%)`,
      expectedValue: Math.round(Math.max(0, cutsDelta) * 92 * 0.4 + 40000),
      status: "executed",
      kpi: { fillRate: fillDelta, workingCapital: wcDelta, projectedWasteCases: -Math.round(plan.excess * 0.1) },
      rationale: `Balanced ${cust.name}/${family}: fill ${(plan.fillRate * 100).toFixed(1)}%, cuts ${plan.cuts.toLocaleString()} cs, WC $${(plan.workingCapital / 1e6).toFixed(2)}M. ${biasOn ? "Bias correction applied." : ""}`,
      actor: "ONECHAIN · plan room",
    });
    setCommittedId(entry.id);
  };

  const cust = PLAN_CUSTOMERS.find((c) => c.code === custId)!;
  const nowX = x(NOW_WEEK);

  return (
    <div className="max-w-[1180px] mx-auto">
      {/* header + chips */}
      <div className="flex items-start justify-between">
        <div>
          <div className="label !text-accent">Plan room · S&OP time canvas</div>
          <h1 className="text-[26px] font-semibold tracking-tight mt-0.5">Supply ↔ demand balance</h1>
          <p className="text-[13px] text-text-mid mt-0.5">26 weeks history + 13 forward · drag the handles to rebalance</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="label">Projected fill</div>
            <div className="tnum text-[20px] font-semibold" style={{ color: plan.fillRate >= 0.96 ? "var(--risk-low)" : plan.fillRate >= 0.93 ? "var(--risk-med)" : "var(--risk-high)" }}>
              {(plan.fillRate * 100).toFixed(1)}%
            </div>
          </div>
          <button onClick={close} className="text-text-low hover:text-text-hi text-[13px] flex items-center gap-1.5">
            Exit <kbd className="px-1 rounded bg-white/5 text-[10px]">Esc</kbd>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-3">
        {PLAN_CUSTOMERS.map((c) => (
          <button key={c.code} onClick={() => { setCustId(c.code); setBalanceGain(null); }} className="px-2.5 py-1 rounded-full text-[12px] transition-colors" style={custId === c.code ? { background: "rgba(77,225,193,0.14)", color: "var(--accent)", boxShadow: "inset 0 0 0 1px rgba(77,225,193,0.4)" } : { background: "rgba(255,255,255,0.04)", color: "var(--text-mid)", border: "1px solid var(--stroke-faint)" }}>
            {c.name}
          </button>
        ))}
        <span className="w-px h-5 bg-stroke-faint mx-1" />
        {FAMILIES.map((f) => (
          <button key={f} onClick={() => { setFamily(f); setBalanceGain(null); }} className="px-2.5 py-1 rounded-full text-[12px] transition-colors" style={family === f ? { background: "rgba(106,169,255,0.14)", color: "var(--flow)", boxShadow: "inset 0 0 0 1px rgba(106,169,255,0.4)" } : { background: "rgba(255,255,255,0.04)", color: "var(--text-mid)", border: "1px solid var(--stroke-faint)" }}>
            {f}
          </button>
        ))}
      </div>

      {/* the time canvas */}
      <div className="mt-3 rounded-2xl border border-stroke-faint bg-[#080a0f] p-3 relative select-none">
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ touchAction: "none" }}>
          {/* history / forward split */}
          <rect x={nowX} y={padT} width={W - padR - nowX} height={plotH} fill="rgba(106,169,255,0.03)" />
          {/* cut + excess shading (forward) */}
          {plan.rows.filter((r) => r.week > NOW_WEEK).map((r) => (
            <g key={r.week}>
              {r.cut > 0 && <rect x={x(r.week) - step / 2} y={y(r.demand)} width={step} height={Math.max(0, y(r.supply) - y(r.demand))} fill="rgba(255,59,107,0.28)" />}
              {r.excess > 0 && <rect x={x(r.week) - step / 2} y={y(r.supply)} width={step} height={Math.max(0, y(r.p90) - y(r.supply))} fill="rgba(245,185,68,0.22)" />}
            </g>
          ))}
          {/* fan */}
          <path d={fanPath} fill="rgba(106,169,255,0.12)" />
          {/* p50 */}
          <path d={line((r) => r.demand)} fill="none" stroke="var(--text-mid)" strokeWidth={1.2} strokeDasharray="3 3" />
          {/* actual */}
          <path d={line((r) => r.actual)} fill="none" stroke="#9BA6B8" strokeWidth={1.2} opacity={0.7} />
          {/* supply */}
          <path d={line((r) => r.supply)} fill="none" stroke="var(--accent)" strokeWidth={2} />
          {/* promo band */}
          <rect
            x={x(handles.promo.start) - step / 2}
            y={padT}
            width={(handles.promo.end - handles.promo.start) * step + step}
            height={plotH}
            fill="rgba(77,225,193,0.07)"
            stroke="rgba(77,225,193,0.4)"
            strokeDasharray="4 3"
            onPointerDown={(e) => begin("promoMove", e)}
            style={{ cursor: "grab" }}
          />
          {/* now line */}
          <line x1={nowX} y1={padT} x2={nowX} y2={padT + plotH} stroke="var(--accent)" strokeWidth={1} strokeDasharray="2 2" opacity={0.6} />
          <text x={nowX + 3} y={padT + 10} fill="var(--accent)" style={{ fontSize: 9 }}>now · {WEEK_LABELS[NOW_WEEK]}</text>
          {/* week ticks */}
          {[0, 8, 16, NOW_WEEK, 32, 38].map((w) => (
            <text key={w} x={x(w)} y={H - 8} fill="var(--text-low)" textAnchor="middle" style={{ fontSize: 9 }}>{WEEK_LABELS[w]}</text>
          ))}
        </svg>

        {/* draggable knobs (HTML over SVG) */}
        <Knob label={`Capacity ${Math.round(handles.capacityPct * 100)}%`} leftPct={(x(TOTAL_WEEKS - 1) / W) * 100} topPct={(y(plan.rows[TOTAL_WEEKS - 1].supply) / H) * 100} color="var(--accent)" onDown={(e) => begin("cap", e)} />
        <Knob label={`Safety ${handles.safetyWeeks}w`} leftPct={(padL / W) * 100} topPct={((padT + plotH * (1 - handles.safetyWeeks / 6)) / H) * 100} color="#6AA9FF" onDown={(e) => begin("safety", e)} />
        <Knob label={`Promo +${Math.round(handles.promo.pct * 100)}%`} leftPct={(x(handles.promo.start) / W) * 100} topPct={(y(plan.rows[handles.promo.start].demand) / H) * 100} color="var(--accent)" onDown={(e) => begin("promoLift", e)} />
      </div>

      {/* readouts + actions */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_1fr] gap-4 mt-4">
        <div className="rounded-xl border border-stroke-faint bg-white/[0.02] p-4">
          <div className="label mb-2">Live readout — {cust.name} / {family}</div>
          <div className="grid grid-cols-3 gap-2">
            <Metric label="Fill rate" value={`${(plan.fillRate * 100).toFixed(1)}%`} tone={plan.fillRate >= 0.96 ? "ok" : plan.fillRate >= 0.93 ? "warn" : "bad"} />
            <Metric label="Cuts" value={`${plan.cuts.toLocaleString()} cs`} tone={plan.cuts > basePlan.cuts ? "bad" : "ok"} />
            <Metric label="Working cap." value={`$${(plan.workingCapital / 1e6).toFixed(2)}M`} />
          </div>
          <div className="mt-2 text-[11px] text-text-low">
            Default {cust.name}/{family} fill {(basePlan.fillRate * 100).toFixed(1)}%{custId === PLAN_CUSTOMERS[0].code && family === "PET" ? ` — matches KPI strip ${PLAN_BASELINE_FILL}%` : ""}.
          </div>
          <button onClick={doBalance} className="mt-3 px-3 py-1.5 rounded-lg text-[12px] font-semibold" style={{ background: "rgba(77,225,193,0.14)", color: "var(--accent)" }}>Balance ⚡</button>
          {balanceGain && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[12px] text-accent mt-2">{balanceGain}</motion.div>}
        </div>

        {/* promo readiness + bias toggle */}
        <div className="rounded-xl border border-stroke-faint bg-white/[0.02] p-4">
          <div className="label mb-2">Promotion readiness · wk {WEEK_LABELS[handles.promo.start]}–{WEEK_LABELS[handles.promo.end]}</div>
          <div className="flex items-center gap-2">
            <Chip tone={readiness.ready ? "low" : "crit"}>{readiness.ready ? "ready" : "at-risk"}</Chip>
            <Chip tone={readiness.supplyOk ? "low" : "high"}>supply {readiness.supplyOk ? "ok" : "short"}</Chip>
            <Chip tone={readiness.freshnessOk ? "low" : "high"}>freshness ≥{readiness.freshnessDays}d {readiness.freshnessOk ? "ok" : "fail"}</Chip>
          </div>
          <div className="label mt-4 mb-2">Forecast bias correction (Beat 7)</div>
          <button onClick={() => setBiasOn((b) => !b)} disabled={family !== "PET"} className="px-3 py-1.5 rounded-lg text-[12px] font-medium disabled:opacity-40" style={{ background: biasOn ? "rgba(77,225,193,0.14)" : "rgba(255,255,255,0.04)", color: biasOn ? "var(--accent)" : "var(--text-mid)", border: "1px solid var(--stroke-faint)" }}>
            {biasOn ? "✓ −6.4% PET DRY ADULT applied" : "Apply −6.4% correction"}
          </button>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <Metric label="Accuracy (before)" value={`${(BIAS_ACCURACY.before * 100).toFixed(1)}%`} />
            <Metric label={biasOn ? "Accuracy (now)" : "Accuracy (with)"} value={`${(BIAS_ACCURACY.after * 100).toFixed(1)}%`} tone="ok" />
          </div>
          {family !== "PET" && <div className="text-[11px] text-text-low mt-1.5">Correction applies to PET DRY ADULT family.</div>}
        </div>

        {/* commit */}
        <div className="rounded-xl border p-4" style={{ borderColor: "rgba(77,225,193,0.3)", background: "rgba(77,225,193,0.04)" }}>
          <div className="label !text-accent">Commit S&OP plan</div>
          <div className="text-[12px] text-text-mid mt-1">Writes a ledger entry, updates the twin forecast state and the KPI strip (fill rate, working capital).</div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <Metric label="Fill Δ" value={`${((plan.fillRate - basePlan.fillRate) * 100 >= 0 ? "+" : "")}${((plan.fillRate - basePlan.fillRate) * 100).toFixed(1)} pt`} tone={plan.fillRate >= basePlan.fillRate ? "ok" : "bad"} />
            <Metric label="WC Δ" value={`${plan.workingCapital - basePlan.workingCapital >= 0 ? "+" : "−"}$${Math.abs((plan.workingCapital - basePlan.workingCapital) / 1e6).toFixed(2)}M`} />
          </div>
          <div className="flex items-center gap-3 mt-3">
            <button onClick={doCommit} className="px-4 py-2 rounded-lg text-[13px] font-semibold" style={{ background: "rgba(77,225,193,0.16)", color: "var(--accent)", boxShadow: "inset 0 0 0 1px rgba(77,225,193,0.4)" }}>Commit to twin</button>
            {committedId && <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="text-[12px] text-text-mid">Committed <span className="text-accent tnum">{committedId}</span> · <kbd className="px-1 rounded bg-white/5 text-[10px]">R</kbd> resets.</motion.span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Knob({ label, leftPct, topPct, color, onDown }: { label: string; leftPct: number; topPct: number; color: string; onDown: (e: React.PointerEvent) => void }) {
  return (
    <div className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-auto" style={{ left: `${leftPct}%`, top: `${topPct}%` }}>
      <div onPointerDown={onDown} className="w-3.5 h-3.5 rounded-full cursor-ns-resize" style={{ background: color, boxShadow: `0 0 10px ${color}`, border: "2px solid #080a0f" }} />
      <span className="text-[10px] px-1.5 py-0.5 rounded-md whitespace-nowrap" style={{ background: "rgba(8,10,15,0.85)", color }}>{label}</span>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "ok" | "bad" | "warn" }) {
  const color = tone === "bad" ? "var(--risk-high)" : tone === "warn" ? "var(--risk-med)" : tone === "ok" ? "var(--risk-low)" : "var(--text-hi)";
  return (
    <div className="rounded-md bg-white/[0.03] p-2">
      <div className="label">{label}</div>
      <div className="tnum text-[14px] font-semibold" style={{ color }}>{value}</div>
    </div>
  );
}
