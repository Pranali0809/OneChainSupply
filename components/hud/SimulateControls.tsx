"use client";
import { useState } from "react";
import { TwinNode, Batch } from "@/lib/types";
import { CountUp, Chip } from "@/components/primitives";
import { motion } from "framer-motion";

interface SimAction {
  id: string;
  label: string;
  detail: string;
  delta: { fillRate: number; wasteCases: number; freight: number };
}

function actionsFor(node: TwinNode, batch: Batch | null): SimAction[] {
  const base: SimAction[] = [];
  if (batch) {
    base.push(
      { id: "hold", label: "Hold batch", detail: `Freeze ${batch.qtyCases.toLocaleString()} cs for FEFO re-slot`, delta: { fillRate: -0.3, wasteCases: -820, freight: 0 } },
      { id: "extend", label: "Extend in-store date", detail: "+7d ISD with customer waiver", delta: { fillRate: +0.4, wasteCases: -1240, freight: 0 } },
      { id: "reposition", label: "Reposition to Reed City", detail: `Move ${batch.qtyCases.toLocaleString()} cs into open demand`, delta: { fillRate: +0.9, wasteCases: -1840, freight: 18200 } }
    );
  }
  base.push(
    { id: "pushcover", label: "Push cover from plant", detail: "Deploy +1 wk safety stock", delta: { fillRate: +1.2, wasteCases: +310, freight: 24600 } },
    { id: "drawdown", label: "Draw down on-hand 9%", detail: "Release aged stock first", delta: { fillRate: -0.6, wasteCases: -1510, freight: -6400 } }
  );
  return base;
}

export default function SimulateControls({ node, batch }: { node: TwinNode; batch: Batch | null }) {
  const [sel, setSel] = useState<SimAction | null>(null);
  const [committed, setCommitted] = useState<string[]>([]);
  const actions = actionsFor(node, batch);

  return (
    <div className="flex flex-col gap-3">
      <div className="label">Perturb this object — preview before commit</div>
      <div className="flex flex-col gap-1.5">
        {actions.map((a) => (
          <button
            key={a.id}
            onMouseEnter={() => setSel(a)}
            onFocus={() => setSel(a)}
            onClick={() => setSel(a)}
            className="text-left rounded-lg border p-2.5 transition-all"
            style={{
              borderColor: sel?.id === a.id ? "var(--accent)" : "var(--stroke-faint)",
              background: sel?.id === a.id ? "rgba(77,225,193,0.06)" : "rgba(255,255,255,0.02)",
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-text-hi">{a.label}</span>
              {committed.includes(a.id) && <Chip tone="low">committed</Chip>}
            </div>
            <div className="label !text-text-low mt-0.5">{a.detail}</div>
          </button>
        ))}
      </div>

      {sel && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-stroke-faint bg-white/[0.03] p-3">
          <div className="label mb-2">Instant KPI preview · {sel.label}</div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <DeltaTile label="Fill rate" value={sel.delta.fillRate} suffix=" pt" good={sel.delta.fillRate >= 0} decimals={1} />
            <DeltaTile label="Waste" value={sel.delta.wasteCases} suffix=" cs" good={sel.delta.wasteCases <= 0} />
            <DeltaTile label="Freight" value={sel.delta.freight} prefix="$" good={sel.delta.freight <= 0} />
          </div>
          <button
            onClick={() => setCommitted((c) => (c.includes(sel.id) ? c : [...c, sel.id]))}
            className="w-full mt-3 py-2 rounded-lg text-[13px] font-medium transition-colors"
            style={{ background: "rgba(77,225,193,0.14)", color: "var(--accent)", boxShadow: "inset 0 0 0 1px rgba(77,225,193,0.4)" }}
          >
            Commit to ledger
          </button>
        </motion.div>
      )}
    </div>
  );
}

function DeltaTile({ label, value, prefix = "", suffix = "", good, decimals = 0 }: { label: string; value: number; prefix?: string; suffix?: string; good: boolean; decimals?: number }) {
  const color = good ? "var(--risk-low)" : "var(--risk-high)";
  const sign = value > 0 ? "+" : "";
  return (
    <div className="rounded-md bg-white/[0.03] p-2">
      <div className="label">{label}</div>
      <div className="text-[15px] font-semibold tnum" style={{ color }}>
        {sign}
        <CountUp value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
      </div>
    </div>
  );
}
