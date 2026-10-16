"use client";
import { NODE_BY_ID } from "@/data/network";
import { Sparkline, RiskDot } from "@/components/primitives";
import { riskRampHex } from "@/lib/palette";

const KIND_LABEL: Record<string, string> = {
  PLANT: "Plant",
  DC: "Distribution Center",
  CUSTOMER_DC: "Customer DC",
  SUPPLIER: "Supplier",
};

export default function NodeTooltip({ nodeId, x, y }: { nodeId: string; x: number; y: number }) {
  const n = NODE_BY_ID[nodeId];
  if (!n) return null;
  const top = [...n.risks].sort((a, b) => b.value - a.value)[0];
  const left = Math.min(x + 16, (typeof window !== "undefined" ? window.innerWidth : 1920) - 250);
  const tooltipTop = Math.min(y + 16, (typeof window !== "undefined" ? window.innerHeight : 1080) - 190);
  return (
    <div
      className="glass pointer-events-none fixed z-40 w-[226px] p-3"
      style={{ left, top: tooltipTop }}
    >
      <div className="flex items-center justify-between">
        <span className="label">{KIND_LABEL[n.kind]}</span>
        <span className="label">{n.code}</span>
      </div>
      <div className="mt-0.5 text-[15px] font-semibold text-text-hi leading-tight">
        {n.name}, {n.state}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-y-1.5 text-[12px]">
        <div>
          <div className="label">On hand</div>
          <div className="tnum text-text-hi">{n.onHandCases.toLocaleString()} cs</div>
        </div>
        <div>
          <div className="label">Days supply</div>
          <div className="tnum text-text-hi">{n.daysOfSupply.toFixed(1)}d</div>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <RiskDot value={top.value} />
        <span className="text-[12px] text-text-mid flex-1">{top.label}</span>
        <span className="tnum text-[13px]" style={{ color: riskRampHex(top.value) }}>
          {top.value.toFixed(2)}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="label">12-wk</span>
        <Sparkline values={n.sparkline} width={120} height={24} color={riskRampHex(n.composite)} />
      </div>
    </div>
  );
}
