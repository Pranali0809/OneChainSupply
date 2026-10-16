"use client";
import { useStore } from "@/lib/store";
import { AnimatePresence, motion } from "framer-motion";
import { NODE_BY_ID, LANE_BY_ID } from "@/data/network";
import { BATCHES_BY_NODE, atRiskBatches } from "@/data/inventory";
import { MATERIAL_BY_CODE } from "@/data/materials";
import { ledgerForObject } from "@/data/ledger";
import { getNodeForecast } from "@/data/forecast";
import { RiskGauge, Sparkline, Chip, CountUp, tierChipTone } from "@/components/primitives";
import { riskRampHex } from "@/lib/palette";
import { TwinNode, Batch, Lane, RiskScore } from "@/lib/types";
import SimulateControls from "./SimulateControls";
import LaneSim from "./LaneSim";

const TABS = ["State", "Risk", "Decisions", "Simulate"];

export default function Inspector() {
  const nodeId = useStore((s) => s.selectedNodeId);
  const laneId = useStore((s) => s.selectedLaneId);
  const batchId = useStore((s) => s.selectedBatchId);
  const tab = useStore((s) => s.inspectorTab);
  const setTab = useStore((s) => s.setInspectorTab);
  const close = useStore((s) => s.closeInspector);

  const open = !!(nodeId || laneId);
  const node = nodeId ? NODE_BY_ID[nodeId] : null;
  const lane = laneId ? LANE_BY_ID[laneId] : null;
  const batch: Batch | null = batchId
    ? (BATCHES_BY_NODE[node?.id ?? ""] || []).find((b) => b.id === batchId) ?? null
    : null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="absolute right-4 top-[72px] bottom-4 z-20 w-[420px] glass flex flex-col overflow-hidden"
        >
          <Header node={node} lane={lane} onClose={close} />
          {node && <ScreenCtas node={node} />}
          <div className="flex gap-1 px-3 pt-2 border-b border-stroke-faint">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="relative px-2.5 py-1.5 text-[12px] transition-colors"
                style={{ color: tab === t ? "var(--text-hi)" : "var(--text-low)" }}
              >
                {t}
                {tab === t && (
                  <motion.span layoutId="tab-underline" className="absolute left-0 right-0 -bottom-px h-0.5 bg-accent rounded-full" />
                )}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-3.5">
            {node && tab === "State" && <StateTab node={node} />}
            {node && tab === "Risk" && <RiskTab node={node} batch={batch} />}
            {node && tab === "Decisions" && <DecisionsTab objectId={batch?.id ?? node.id} />}
            {node && tab === "Simulate" && <SimulateTab node={node} batch={batch} />}
            {lane && <LaneBody lane={lane} tab={tab} />}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Header({ node, lane, onClose }: { node: TwinNode | null; lane: Lane | null; onClose: () => void }) {
  const title = node ? `${node.name}, ${node.state}` : lane ? lane.id : "";
  const sub = node
    ? { PLANT: "Plant", DC: "Distribution Center", CUSTOMER_DC: "Customer DC", SUPPLIER: "Supplier" }[node.kind]
    : lane
    ? `${lane.mode} lane`
    : "";
  const code = node?.code ?? lane?.id ?? "";
  return (
    <div className="px-3.5 pt-3 pb-2 flex items-start gap-2">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="label">{sub}</span>
          {node && <Chip tone={tierChipTone(node.composite)}>{node.ownership}</Chip>}
          {node && <Chip>{node.temp}</Chip>}
        </div>
        <div className="text-[18px] font-semibold leading-tight mt-0.5">{title}</div>
        <div className="label !text-text-low mt-0.5">{code} · twin.v41.3</div>
      </div>
      <button onClick={onClose} className="text-text-low hover:text-text-hi text-[18px] leading-none px-1">
        ×
      </button>
    </div>
  );
}

// Deep-dive entry points — shown when relevant to the selected object.
function ScreenCtas({ node }: { node: TwinNode }) {
  const openScreen = useStore((s) => s.openScreen);
  const ctas: { label: string; run: () => void }[] = [];
  if (node.kind === "PLANT") ctas.push({ label: "Open plant", run: () => openScreen("plant", node.id) });
  if (node.kind === "DC") ctas.push({ label: "Build truck", run: () => openScreen("dock", node.id) });
  ctas.push({ label: "Open plan room", run: () => openScreen("plan") });
  return (
    <div className="px-3.5 pb-2 flex flex-wrap gap-1.5">
      {ctas.map((c, i) => (
        <button
          key={c.label}
          onClick={c.run}
          className="px-2.5 py-1 rounded-lg text-[12px] font-medium transition-colors"
          style={
            i === 0
              ? { background: "rgba(77,225,193,0.14)", color: "var(--accent)", boxShadow: "inset 0 0 0 1px rgba(77,225,193,0.4)" }
              : { background: "rgba(255,255,255,0.04)", color: "var(--text-mid)", border: "1px solid var(--stroke-faint)" }
          }
        >
          {c.label} ↗
        </button>
      ))}
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-white/[0.03] border border-stroke-faint p-2.5">
      <div className="label">{label}</div>
      <div className="text-[15px] font-semibold text-text-hi mt-0.5 tnum">{children}</div>
    </div>
  );
}

function StateTab({ node }: { node: TwinNode }) {
  const batches = BATCHES_BY_NODE[node.id] || [];
  const fc = getNodeForecast(node.id);
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <Stat label="On hand">{node.onHandCases.toLocaleString()} cs</Stat>
        <Stat label="Days of supply">{node.daysOfSupply.toFixed(1)}d</Stat>
        <Stat label="Throughput / wk">{node.throughput.toLocaleString()} cs</Stat>
        <Stat label="Tracked batches">{batches.length}</Stat>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="label">Business units</span>
        {node.businessUnits.map((b) => (
          <Chip key={b} tone="accent">{b}</Chip>
        ))}
      </div>
      {node.lines && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="label">Lines</span>
          {node.lines.map((l) => (
            <Chip key={l}>{l}</Chip>
          ))}
        </div>
      )}
      {fc && (
        <div className="rounded-lg bg-white/[0.03] border border-stroke-faint p-2.5">
          <div className="label mb-1">Node demand — p50, 39-wk</div>
          <Sparkline values={fc.points.map((p) => p.p50)} width={370} height={40} color="var(--flow)" />
        </div>
      )}
      <div>
        <div className="label mb-1.5">Last 12 state transitions</div>
        <div className="relative pl-3 border-l border-stroke-faint flex flex-col gap-1.5">
          {node.transitions.slice().reverse().map((tr, i) => (
            <div key={i} className="relative">
              <span className="absolute -left-[13px] top-1.5 w-1.5 h-1.5 rounded-full bg-accent/60" />
              <div className="text-[12px] text-text-hi">{tr.label}</div>
              <div className="label !text-text-low">{tr.detail}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RiskTab({ node, batch }: { node: TwinNode; batch: Batch | null }) {
  return (
    <div className="flex flex-col gap-3.5">
      {batch && <BatchCard batch={batch} />}
      {node.risks.map((r) => (
        <RiskRow key={r.kind} r={r} />
      ))}
    </div>
  );
}

function BatchCard({ batch }: { batch: Batch }) {
  const mat = MATERIAL_BY_CODE[batch.materialCode];
  return (
    <div className="rounded-lg border p-3" style={{ borderColor: "rgba(255,59,107,0.3)", background: "rgba(255,59,107,0.05)" }}>
      <div className="flex items-center justify-between">
        <span className="label !text-risk-high">Selected batch</span>
        {batch.fefoFlag && <Chip tone="crit">FEFO flag</Chip>}
      </div>
      <div className="text-[14px] font-semibold mt-0.5">{batch.id}</div>
      <div className="text-[12px] text-text-mid">{mat?.desc}</div>
      <div className="grid grid-cols-3 gap-2 mt-2 text-[12px]">
        <div><div className="label">Qty</div><div className="tnum">{batch.qtyCases.toLocaleString()} cs</div></div>
        <div><div className="label">Remaining</div><div className="tnum" style={{ color: riskRampHex(batch.ageRisk) }}>{batch.remainingShelfDays}d</div></div>
        <div><div className="label">Freshness req</div><div className="tnum">{mat?.customerFreshnessDays}d</div></div>
      </div>
      <div className="mt-2.5">
        <RiskGauge value={batch.ageRisk} label="Age risk" />
      </div>
    </div>
  );
}

function RiskRow({ r }: { r: RiskScore }) {
  const positive = r.drivers.filter((d) => d.contribution > 0);
  const negative = r.drivers.filter((d) => d.contribution < 0);
  const maxAbs = Math.max(...r.drivers.map((d) => Math.abs(d.contribution)), 0.01);
  return (
    <div>
      <RiskGauge value={r.value} label={r.label} />
      <div className="mt-2 flex flex-col gap-1">
        {[...positive, ...negative].map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-[11px] text-text-mid w-[150px] truncate">{d.label}</span>
            <div className="flex-1 h-2 relative">
              <div className="absolute top-0 bottom-0 left-1/2 w-px bg-stroke-faint" />
              <div
                className="absolute top-0 bottom-0 rounded-sm"
                style={{
                  background: d.contribution > 0 ? "var(--risk-high)" : "var(--risk-low)",
                  width: `${(Math.abs(d.contribution) / maxAbs) * 48}%`,
                  left: d.contribution > 0 ? "50%" : undefined,
                  right: d.contribution < 0 ? "50%" : undefined,
                }}
              />
            </div>
            <span className="tnum text-[11px] w-9 text-right" style={{ color: d.contribution > 0 ? "var(--risk-high)" : "var(--risk-low)" }}>
              {d.contribution > 0 ? "+" : ""}{d.contribution.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
      <div className="label !text-text-low mt-1.5">
        ⟢ Flips below {r.threshold.toFixed(2)} — {r.thresholdNote}
      </div>
    </div>
  );
}

function DecisionsTab({ objectId }: { objectId: string }) {
  // re-read when a screen commit appends to the ledger
  useStore((s) => s.twinRevision);
  const entries = ledgerForObject(objectId);
  const statusTone: Record<string, "low" | "med" | "high" | "accent" | "neutral"> = {
    executed: "low",
    approved: "accent",
    recommended: "med",
    overridden: "high",
  };
  if (!entries.length) {
    return <div className="text-[13px] text-text-low">No ledger entries reference this object yet — it is inside its steady-state envelope.</div>;
  }
  return (
    <table className="w-full text-[12px]">
      <thead>
        <tr className="label text-left">
          <th className="pb-2 font-medium">Decision</th>
          <th className="pb-2 font-medium">Status</th>
          <th className="pb-2 font-medium text-right">EV</th>
          <th className="pb-2 font-medium text-right">Realized</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((e) => (
          <tr key={e.id} className="border-t border-stroke-faint align-top">
            <td className="py-2 pr-2">
              <div className="text-text-hi">{e.title}</div>
              <div className="label !text-text-low">{e.id} · {e.actor}</div>
            </td>
            <td className="py-2 pr-2"><Chip tone={statusTone[e.status]}>{e.status}</Chip></td>
            <td className="py-2 text-right tnum text-text-mid">${(e.expectedValue / 1000).toFixed(0)}k</td>
            <td className="py-2 text-right tnum" style={{ color: e.realizedValue != null ? "var(--risk-low)" : "var(--text-low)" }}>
              {e.realizedValue != null ? `$${(e.realizedValue / 1000).toFixed(0)}k` : "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SimulateTab({ node, batch }: { node: TwinNode; batch: Batch | null }) {
  return <SimulateControls node={node} batch={batch} />;
}

function LaneBody({ lane, tab }: { lane: Lane; tab: string }) {
  const from = NODE_BY_ID[lane.from];
  const to = NODE_BY_ID[lane.to];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-[13px] flex-wrap">
        <span className="text-text-hi font-medium">{from?.name}</span>
        <span className="text-text-low">→</span>
        <span className="text-text-hi font-medium">{to?.name}</span>
        {lane.crossBorder && <Chip tone="med">cross-border · customs</Chip>}
      </div>
      {lane.crossBorder && (
        <div className="text-[11px] text-text-mid -mt-1">
          +2 transit days customs dwell · reliability and lane risk carry a customs-delay driver.
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Mode">{lane.mode}</Stat>
        <Stat label="Transit">{lane.transitDays}d</Stat>
        <Stat label="Cost / cwt">${lane.costPerCwt.toFixed(2)}</Stat>
        <Stat label="Volume / wk">{lane.volume.toLocaleString()} cs</Stat>
      </div>
      {(tab === "Risk" || tab === "State") && (
        <>
          <RiskGauge value={1 - lane.reliability} label="Lane risk (1 − reliability)" />
          <RiskGauge value={lane.utilization} label="Utilization" />
        </>
      )}
      {tab === "Decisions" && <DecisionsTab objectId={lane.id} />}
      {tab === "Simulate" && <LaneSim lane={lane} />}
    </div>
  );
}

void atRiskBatches;
void CountUp;
