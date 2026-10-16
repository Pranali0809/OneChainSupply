"use client";
import { NODE_BY_ID } from "@/data/network";
import { Sparkline, RiskDot } from "@/components/primitives";
import { riskRampHex, blueRampHex } from "@/lib/palette";
import { LayerId } from "@/lib/layers";
import { nodeMetrics } from "@/lib/layer-metrics";

const KIND_LABEL: Record<string, string> = {
  PLANT: "Plant",
  DC: "Distribution Center",
  CUSTOMER_DC: "Customer DC",
  SUPPLIER: "Supplier",
};

const FLAG: Record<string, string> = { US: "🇺🇸", CA: "🇨🇦", MX: "🇲🇽" };

// The metric that leads the tooltip for the active layer.
function leadMetric(nodeId: string, layer: LayerId) {
  const n = NODE_BY_ID[nodeId];
  const m = nodeMetrics(nodeId);
  const risk = (k: string) => n.risks.find((r) => r.kind === k)?.value ?? 0;
  switch (layer) {
    case "age":
      return { label: "Age risk", value: risk("age").toFixed(2), color: riskRampHex(risk("age")), sub: `${m.casesAtRisk.toLocaleString()} cs at risk` };
    case "service":
      return { label: "Service risk", value: risk("service").toFixed(2), color: riskRampHex(risk("service")), sub: "cover vs forecast horizon" };
    case "fefo":
      return { label: "FEFO compliance", value: `${m.compliancePct}%`, color: riskRampHex(1 - m.compliancePct / 100), sub: "first-expiry-first-out" };
    case "line":
      return n.kind === "PLANT"
        ? { label: "Line risk", value: risk("line").toFixed(2), color: riskRampHex(risk("line")), sub: `${m.lineRates.length} lines` }
        : null;
    case "inventory":
      return { label: "Days of supply", value: `${n.daysOfSupply.toFixed(1)}d`, color: riskRampHex(Math.min(1, n.daysOfSupply / 34)), sub: "inventory density" };
    case "uncertainty":
      return { label: "Forecast band", value: `±${Math.round(m.uncertaintyWidth * 100)}%`, color: blueRampHex(m.uncertaintyWidth), sub: "p90 − p10 width" };
    case "cost":
      return { label: "Cost to serve", value: `$${m.costPerCase.toFixed(2)}`, color: blueRampHex(m.costPerCase / 20), sub: "per case" };
    default:
      return null;
  }
}

export default function NodeTooltip({ nodeId, x, y, primaryLayer }: { nodeId: string; x: number; y: number; primaryLayer: LayerId }) {
  const n = NODE_BY_ID[nodeId];
  if (!n) return null;
  const top = [...n.risks].sort((a, b) => b.value - a.value)[0];
  const lead = leadMetric(nodeId, primaryLayer);
  const left = Math.min(x + 16, (typeof window !== "undefined" ? window.innerWidth : 1920) - 250);
  const tooltipTop = Math.min(y + 16, (typeof window !== "undefined" ? window.innerHeight : 1080) - 210);
  return (
    <div className="glass pointer-events-none fixed z-40 w-[232px] p-3" style={{ left, top: tooltipTop }}>
      <div className="flex items-center justify-between">
        <span className="label">{KIND_LABEL[n.kind]}</span>
        <span className="label">{FLAG[n.country]} {n.code}</span>
      </div>
      <div className="mt-0.5 text-[15px] font-semibold text-text-hi leading-tight">
        {n.name}, {n.state}
      </div>

      {/* active-layer metric first */}
      {lead && (
        <div className="mt-2 rounded-lg px-2 py-1.5 flex items-center justify-between" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--stroke-faint)" }}>
          <div>
            <div className="label">{lead.label}</div>
            <div className="label !text-text-low">{lead.sub}</div>
          </div>
          <span className="tnum text-[18px] font-semibold" style={{ color: lead.color }}>{lead.value}</span>
        </div>
      )}

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
      {!lead && (
        <div className="mt-2 flex items-center gap-2">
          <RiskDot value={top.value} />
          <span className="text-[12px] text-text-mid flex-1">{top.label}</span>
          <span className="tnum text-[13px]" style={{ color: riskRampHex(top.value) }}>{top.value.toFixed(2)}</span>
        </div>
      )}
      <div className="mt-2 flex items-center justify-between">
        <span className="label">12-wk</span>
        <Sparkline values={n.sparkline} width={120} height={24} color={riskRampHex(n.composite)} />
      </div>
    </div>
  );
}
