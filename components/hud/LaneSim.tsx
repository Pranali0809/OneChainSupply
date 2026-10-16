"use client";
import { useState } from "react";
import { Lane } from "@/lib/types";
import { CountUp } from "@/components/primitives";
import { motion } from "framer-motion";
import { NODE_BY_ID } from "@/data/network";

export default function LaneSim({ lane }: { lane: Lane }) {
  const [closed, setClosed] = useState(false);
  const to = NODE_BY_ID[lane.to];
  const delta = {
    fillRate: -2.1,
    wasteCases: +640,
    expedite: +86000,
  };
  return (
    <div className="flex flex-col gap-3">
      <div className="label">Perturb this lane — preview before commit</div>
      <button
        onClick={() => setClosed((c) => !c)}
        className="text-left rounded-lg border p-2.5 transition-all"
        style={{
          borderColor: closed ? "var(--risk-high)" : "var(--stroke-faint)",
          background: closed ? "rgba(255,107,90,0.06)" : "rgba(255,255,255,0.02)",
        }}
      >
        <div className="text-[13px] text-text-hi">{closed ? "Lane closed — reopen" : "Close this lane (sever)"}</div>
        <div className="label !text-text-low mt-0.5">Forces re-route to next-cheapest reliable lane into {to?.name}</div>
      </button>
      {closed && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-stroke-faint bg-white/[0.03] p-3">
          <div className="label mb-2">Instant KPI preview · downstream of {to?.name}</div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Tile label="Fill rate" value={delta.fillRate} suffix=" pt" good={false} decimals={1} />
            <Tile label="Waste" value={delta.wasteCases} suffix=" cs" good={false} />
            <Tile label="Expedite" value={delta.expedite / 1000} prefix="$" suffix="k" good={false} />
          </div>
        </motion.div>
      )}
    </div>
  );
}

function Tile({ label, value, prefix = "", suffix = "", good, decimals = 0 }: { label: string; value: number; prefix?: string; suffix?: string; good: boolean; decimals?: number }) {
  const color = good ? "var(--risk-low)" : "var(--risk-high)";
  return (
    <div className="rounded-md bg-white/[0.03] p-2">
      <div className="label">{label}</div>
      <div className="text-[15px] font-semibold tnum" style={{ color }}>
        {value > 0 ? "+" : ""}
        <CountUp value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
      </div>
    </div>
  );
}
