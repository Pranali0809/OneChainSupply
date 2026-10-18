"use client";
import { useMemo, useState } from "react";
import { Reorder, motion, useMotionValue } from "framer-motion";
import { useStore } from "@/lib/store";
import { NODE_BY_ID } from "@/data/network";
import {
  buildPallets,
  PalletTile,
  TRAILER,
  CASES,
  PALLET_COUNT,
  FULL_PALLETS,
  TOTAL_WEIGHT,
  WEIGHT_PER_CASE,
  FREIGHT_LEG,
  EXPECTED_VALUE,
  LANE_ID,
  SECOND_STOP,
  SECOND_STOP_WEIGHT,
} from "@/data/reposition";
import { Chip } from "@/components/primitives";
import { riskRamp } from "@/lib/palette";

const SECOND_IDX_BASE = 1000; // synthetic pallet ids for the co-load
const DETENTION_PER_HR = 140;

function expiryColor(days: number): string {
  const [r, g, b] = riskRamp(Math.max(0, Math.min(1, (60 - days) / 50)));
  return `rgb(${r},${g},${b})`;
}

interface Appt {
  id: string;
  label: string;
  door: number; // 0..7
  start: number; // hour 6..17
  dur: number;
  ours?: boolean;
}

const OTHER_APPTS: Appt[] = [
  { id: "T1", label: "Inbound · PL-COV", door: 0, start: 7, dur: 2 },
  { id: "T2", label: "Inbound · SUP-GRN", door: 1, start: 10, dur: 3 },
  { id: "T3", label: "Outbound · Walcott", door: 2, start: 13, dur: 2 },
  { id: "T4", label: "Inbound · PL-OMA", door: 3, start: 8, dur: 2 },
  { id: "T5", label: "Outbound · Gageton", door: 4, start: 11, dur: 2 },
  { id: "T6", label: "Cross-dock", door: 5, start: 14, dur: 3 },
  { id: "T7", label: "Inbound · SUP-PRO", door: 6, start: 9, dur: 2 },
  { id: "T8", label: "Outbound · Byrne", door: 7, start: 15, dur: 2 },
];

export default function DockScreen({ id }: { id: string }) {
  const node = NODE_BY_ID[id];
  const close = useStore((s) => s.closeScreen);
  const commit = useStore((s) => s.commitDecision);

  const pallets = useMemo(() => buildPallets(), []);
  const palletById = useMemo(() => {
    const m: Record<number, PalletTile> = {};
    pallets.forEach((p) => (m[p.idx] = p));
    return m;
  }, [pallets]);

  const [slots, setSlots] = useState<number[]>([]); // pallet idx in load order (nose→door)
  const [built, setBuilt] = useState(false);
  const [secondStop, setSecondStop] = useState(false);
  const [committedId, setCommittedId] = useState<string | null>(null);

  // dock appointment state (ours)
  const [ours, setOurs] = useState<Appt>({ id: "OUR", label: "Reposition → Reed City", door: 2, start: 9, dur: 2, ours: true });
  const mvX = useMotionValue(0);
  const mvY = useMotionValue(0);

  if (!node) return null;

  // second-stop synthetic pallets (light co-load)
  const secondPallets: PalletTile[] = secondStop
    ? Array.from({ length: SECOND_STOP.pallets }, (_, i) => ({
        idx: SECOND_IDX_BASE + i,
        cases: SECOND_STOP.casesPerPallet,
        weightLb: SECOND_STOP.casesPerPallet * SECOND_STOP.weightPerCase,
        daysToExpiry: 999, // non-perishable co-load → loads at the nose
        partial: false,
      }))
    : [];
  const palletLookup = (idx: number): PalletTile =>
    idx >= SECOND_IDX_BASE ? secondPallets.find((p) => p.idx === idx)! : palletById[idx];

  const fefoCorrect = (): number[] => {
    const all = [...pallets, ...secondPallets];
    return all.sort((a, b) => b.daysToExpiry - a.daysToExpiry || a.idx - b.idx).map((p) => p.idx);
  };

  const autoBuild = () => {
    setSlots(fefoCorrect());
    setBuilt(true);
  };

  // when the second stop toggles, re-fold the co-load into the current build
  const toggleSecondStop = () => {
    const next = !secondStop;
    setSecondStop(next);
    if (built) {
      const base = slots.filter((x) => x < SECOND_IDX_BASE);
      if (next) {
        const extra = Array.from({ length: SECOND_STOP.pallets }, (_, i) => SECOND_IDX_BASE + i);
        setSlots([...extra, ...base]); // co-load at the nose
      } else {
        setSlots(base);
      }
    }
  };

  // FEFO violations: a sooner-dated pallet loaded above (nose-side of) a later-dated one
  const violations = (() => {
    let v = 0;
    for (let i = 0; i < slots.length - 1; i++) {
      if (palletLookup(slots[i]).daysToExpiry < palletLookup(slots[i + 1]).daysToExpiry) v++;
    }
    return v;
  })();

  const loadedPallets = slots.length;
  const loadedCases = slots.reduce((s, idx) => s + palletLookup(idx).cases, 0);
  const loadedWeight = slots.reduce((s, idx) => s + palletLookup(idx).weightLb, 0);
  const cubePct = Math.round((loadedPallets / TRAILER.palletCapacity) * 100);
  const weightPct = Math.round((loadedWeight / TRAILER.weightLimitLb) * 100);
  const freight = FREIGHT_LEG + (secondStop ? SECOND_STOP.accessorial : 0);
  const freightPerCase = loadedCases ? +(freight / loadedCases).toFixed(2) : 0;
  const baseFreightPerCase = +(FREIGHT_LEG / CASES).toFixed(2);

  // dock conflict / detention
  const conflict = OTHER_APPTS.find(
    (a) => a.door === ours.door && ours.start < a.start + a.dur && a.start < ours.start + ours.dur
  );
  const overlapHrs = conflict ? Math.min(conflict.start + conflict.dur, ours.start + ours.dur) - Math.max(conflict.start, ours.start) : 0;
  const detention = Math.round(overlapHrs * DETENTION_PER_HR);

  const COLW = 44;
  const ROWH = 34;

  const onApptDragEnd = () => {
    const dStart = Math.round(mvX.get() / COLW);
    const dDoor = Math.round(mvY.get() / ROWH);
    const newStart = Math.max(6, Math.min(18 - ours.dur, ours.start + dStart));
    const newDoor = Math.max(0, Math.min(7, ours.door + dDoor));
    setOurs({ ...ours, start: newStart, door: newDoor });
    mvX.set(0);
    mvY.set(0);
  };

  const doCommit = () => {
    const entry = commit({
      objectId: "B-4471188-26W38-COV",
      objectLabel: "Batch B-4471188-26W38-COV · Joliet",
      title: "Reposition 1,840 cs Joliet → Reed City",
      expectedValue: EXPECTED_VALUE,
      status: "executed",
      kpi: { freightCost: FREIGHT_LEG },
      laneFlow: LANE_ID,
      rationale: `Truck built FEFO-clean (${violations} violations), 1 TL weight-limited at ${weightPct}%. Recovers case value vs donation; $${(FREIGHT_LEG / 1000).toFixed(1)}k leg freight.`,
      actor: "ONECHAIN · dock",
    });
    setCommittedId(entry.id);
  };

  return (
    <div className="max-w-[1180px] mx-auto">
      {/* header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="label !text-accent">Dock · truck build & load levelling</div>
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
            Reposition {CASES.toLocaleString()} cs · {FULL_PALLETS} full + 1 partial = {PALLET_COUNT} pallets → Reed City · lane {LANE_ID}
          </p>
        </div>
        <button onClick={close} className="text-text-low hover:text-text-hi text-[13px] flex items-center gap-1.5">
          Exit <kbd className="px-1 rounded bg-white/5 text-[10px]">Esc</kbd>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 mt-5">
        {/* trailer */}
        <div className="rounded-2xl border border-stroke-faint bg-[#080a0f] p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="label">53 ft trailer — top-down</div>
            <button onClick={autoBuild} className="px-2.5 py-1 rounded-lg text-[12px] font-medium" style={{ background: "rgba(77,225,193,0.14)", color: "var(--accent)" }}>
              Auto-build FEFO
            </button>
          </div>
          <div className="flex items-center justify-between label !text-text-low mb-1">
            <span>◀ nose</span>
            <span>door ▶</span>
          </div>
          <div className="rounded-xl border-2 border-dashed p-2 min-h-[260px]" style={{ borderColor: "var(--stroke)" }}>
            {!built ? (
              <div className="h-[240px] grid place-items-center text-[12px] text-text-low text-center px-4">
                Empty trailer. Press <span className="text-accent mx-1">Auto-build FEFO</span> to load {PALLET_COUNT} pallets in first-expiry order.
              </div>
            ) : (
              <Reorder.Group axis="y" values={slots} onReorder={setSlots} className="flex flex-col gap-1">
                {slots.map((idx, i) => {
                  const p = palletLookup(idx);
                  const second = idx >= SECOND_IDX_BASE;
                  return (
                    <Reorder.Item
                      key={idx}
                      value={idx}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 1.2) }}
                      className="flex items-center gap-2 rounded-md px-2 py-1 cursor-grab active:cursor-grabbing"
                      style={{ background: "#0c0f16", border: `1px solid ${second ? "rgba(155,166,184,0.4)" : expiryColor(p.daysToExpiry)}` }}
                    >
                      <span className="w-2.5 h-2.5 rounded-[2px]" style={{ background: second ? "#5C6678" : expiryColor(p.daysToExpiry) }} />
                      <span className="text-[11px] text-text-hi flex-1">{second ? `Co-load → ${SECOND_STOP.dcName}` : `Pallet ${i + 1}`}</span>
                      <span className="label !text-text-low tnum">{p.cases} cs</span>
                      <span className="label tnum" style={{ color: second ? "var(--text-low)" : expiryColor(p.daysToExpiry) }}>
                        {second ? "—" : `${p.daysToExpiry}d`}
                      </span>
                    </Reorder.Item>
                  );
                })}
              </Reorder.Group>
            )}
          </div>
          {built && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              <Metric label="Cube" value={`${cubePct}%`} />
              <Metric label="Weight" value={`${weightPct}%`} tone={weightPct > 95 ? "warn" : "ok"} />
              <Metric label="FEFO viol." value={`${violations}`} tone={violations ? "bad" : "ok"} />
            </div>
          )}
        </div>

        {/* right column */}
        <div className="flex flex-col gap-4">
          {/* load levelling */}
          <div className="rounded-xl border border-stroke-faint bg-white/[0.02] p-4">
            <div className="flex items-center justify-between">
              <div className="label">Load levelling</div>
              <button
                onClick={toggleSecondStop}
                disabled={!built}
                className="px-2.5 py-1 rounded-lg text-[12px] font-medium disabled:opacity-40"
                style={{ background: secondStop ? "rgba(77,225,193,0.14)" : "rgba(255,255,255,0.04)", color: secondStop ? "var(--accent)" : "var(--text-mid)", border: "1px solid var(--stroke-faint)" }}
              >
                {secondStop ? "✓ Second stop · DC-KC" : "Add second stop · DC-KC"}
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-3">
              <Metric label="Pallets" value={`${loadedPallets}/${TRAILER.palletCapacity}`} />
              <Metric label="Weight" value={`${Math.round(loadedWeight).toLocaleString()} lb`} />
              <Metric label="Freight" value={`$${(freight / 1000).toFixed(2)}k`} />
              <Metric label="Freight/case" value={`$${freightPerCase.toFixed(2)}`} tone={freightPerCase < baseFreightPerCase ? "ok" : "flat"} />
            </div>
            {secondStop && (
              <div className="text-[11px] text-text-mid mt-2">
                +{SECOND_STOP.pallets} light pallets ({SECOND_STOP.cases} cs, {SECOND_STOP_WEIGHT.toLocaleString()} lb) co-loaded into weight headroom · freight/case {baseFreightPerCase.toFixed(2)} → {freightPerCase.toFixed(2)} (−${(baseFreightPerCase - freightPerCase).toFixed(2)}), one fewer LTL booked.
              </div>
            )}
          </div>

          {/* dock timeline */}
          <div className="rounded-xl border border-stroke-faint bg-white/[0.02] p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="label">Dock schedule — 8 doors × 12 h · drag the Reed City truck</div>
              {conflict ? (
                <Chip tone="crit">conflict · detention ${detention}</Chip>
              ) : (
                <Chip tone="low">no conflict</Chip>
              )}
            </div>
            <div className="flex">
              {/* door labels */}
              <div className="flex flex-col pt-5" style={{ gap: 0 }}>
                {Array.from({ length: 8 }).map((_, d) => (
                  <div key={d} className="label !text-text-low flex items-center" style={{ height: ROWH }}>D{d + 1}</div>
                ))}
              </div>
              <div className="relative flex-1 overflow-x-auto">
                {/* hour headers */}
                <div className="flex" style={{ height: 20 }}>
                  {Array.from({ length: 12 }).map((_, h) => (
                    <div key={h} className="label !text-text-low text-center" style={{ width: COLW }}>{String(6 + h).padStart(2, "0")}</div>
                  ))}
                </div>
                {/* grid */}
                <div className="relative" style={{ width: COLW * 12, height: ROWH * 8 }}>
                  {Array.from({ length: 8 }).map((_, d) =>
                    Array.from({ length: 12 }).map((_, h) => (
                      <div key={`${d}-${h}`} className="absolute border-[0.5px]" style={{ left: h * COLW, top: d * ROWH, width: COLW, height: ROWH, borderColor: "rgba(255,255,255,0.05)" }} />
                    ))
                  )}
                  {/* other appointments */}
                  {OTHER_APPTS.map((a) => {
                    const isConf = conflict?.id === a.id;
                    return (
                      <div
                        key={a.id}
                        className="absolute rounded-md px-1.5 flex items-center overflow-hidden"
                        style={{
                          left: (a.start - 6) * COLW + 2,
                          top: a.door * ROWH + 3,
                          width: a.dur * COLW - 4,
                          height: ROWH - 6,
                          background: isConf ? "rgba(255,59,107,0.18)" : "rgba(106,169,255,0.12)",
                          border: `1px solid ${isConf ? "var(--risk-crit)" : "rgba(106,169,255,0.4)"}`,
                        }}
                      >
                        <span className="text-[9px] text-text-mid truncate">{a.label}</span>
                      </div>
                    );
                  })}
                  {/* our draggable appointment */}
                  <motion.div
                    drag
                    dragMomentum={false}
                    style={{
                      x: mvX,
                      y: mvY,
                      left: (ours.start - 6) * COLW + 2,
                      top: ours.door * ROWH + 3,
                      width: ours.dur * COLW - 4,
                      height: ROWH - 6,
                      background: conflict ? "rgba(255,59,107,0.22)" : "rgba(77,225,193,0.2)",
                      border: `1.5px solid ${conflict ? "var(--risk-crit)" : "var(--accent)"}`,
                    }}
                    onDragEnd={onApptDragEnd}
                    className="absolute rounded-md px-1.5 flex items-center cursor-grab active:cursor-grabbing z-10"
                  >
                    <span className="text-[9px] font-medium truncate" style={{ color: conflict ? "var(--risk-crit)" : "var(--accent)" }}>Reed City TL</span>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>

          {/* commit */}
          <div className="rounded-xl border p-4" style={{ borderColor: "rgba(77,225,193,0.3)", background: "rgba(77,225,193,0.04)" }}>
            <div className="flex items-center justify-between">
              <div className="label !text-accent">Commit shipment</div>
              <span className="label !text-text-low">EV ${(EXPECTED_VALUE / 1000).toFixed(1)}k · freight +${(FREIGHT_LEG / 1000).toFixed(1)}k</span>
            </div>
            <div className="text-[12px] text-text-mid mt-1">
              Adds the shipment to lane {LANE_ID} flow, adjusts freight, writes a ledger entry matching the Beat 6 decision, and updates the KPI strip.
            </div>
            <div className="flex items-center gap-3 mt-3">
              <button onClick={doCommit} disabled={!built} className="px-4 py-2 rounded-lg text-[13px] font-semibold disabled:opacity-40" style={{ background: "rgba(77,225,193,0.16)", color: "var(--accent)", boxShadow: "inset 0 0 0 1px rgba(77,225,193,0.4)" }}>
                Commit to twin
              </button>
              {committedId && (
                <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="text-[12px] text-text-mid">
                  Committed <span className="text-accent tnum">{committedId}</span> — Reed City lane now flowing. Press <kbd className="px-1 rounded bg-white/5 text-[10px]">R</kbd> to reset.
                </motion.span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "ok" | "bad" | "warn" | "flat" }) {
  const color = tone === "bad" ? "var(--risk-high)" : tone === "warn" ? "var(--risk-med)" : tone === "ok" ? "var(--risk-low)" : "var(--text-hi)";
  return (
    <div className="rounded-md bg-white/[0.03] p-2">
      <div className="label">{label}</div>
      <div className="tnum text-[14px] font-semibold" style={{ color }}>{value}</div>
    </div>
  );
}
