"use client";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { CountUp } from "@/components/primitives";
import { TWIN_VERSION } from "@/lib/types";
import { SCENARIO_BY_ID } from "@/data/scenarios";
import { WEEK_LABELS } from "@/data/forecast";
import { NODE_BY_ID } from "@/data/network";

function Kpi({ label, value, decimals = 0, prefix = "", suffix = "", tone }: { label: string; value: number; decimals?: number; prefix?: string; suffix?: string; tone?: string }) {
  return (
    <div className="px-3.5 border-l border-stroke-faint first:border-l-0">
      <div className="label whitespace-nowrap">{label}</div>
      <div className="text-[18px] font-semibold leading-tight" style={{ color: tone }}>
        <CountUp value={value} decimals={decimals} prefix={prefix} suffix={suffix} />
      </div>
    </div>
  );
}

export default function TopBar() {
  const kpi = useStore((s) => s.currentKpi());
  const activeScenarioId = useStore((s) => s.activeScenarioId);
  const presenterMode = useStore((s) => s.presenterMode);
  const enterPresenter = useStore((s) => s.enterPresenter);
  const exitPresenter = useStore((s) => s.exitPresenter);
  const clockWeek = useStore((s) => s.clockWeek);
  const screen = useStore((s) => s.activeScreen);
  const closeScreen = useStore((s) => s.closeScreen);
  const scn = activeScenarioId ? SCENARIO_BY_ID[activeScenarioId] : null;

  const screenLabel = screen
    ? screen.kind === "plan"
      ? "Plan room"
      : NODE_BY_ID[screen.id ?? ""]?.code ?? screen.id ?? ""
    : null;

  const fillTone = kpi.fillRate < 94 ? "var(--risk-high)" : kpi.fillRate < 96 ? "var(--risk-med)" : "var(--risk-low)";

  return (
    <div className="absolute top-0 left-0 right-0 z-30 h-14 px-4 flex items-center gap-4 glass !rounded-none !border-x-0 !border-t-0">
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-[7px] grid place-items-center" style={{ background: "linear-gradient(135deg,#4DE1C1,#2bbda0)", boxShadow: "0 0 16px var(--accent-glow)" }}>
          <span className="text-[13px] font-bold text-void">◆</span>
        </div>
        <span className="text-[15px] font-semibold tracking-tight">ONECHAIN</span>
      </div>

      <div className="flex items-center gap-2 pl-3 border-l border-stroke-faint">
        <span className="w-1.5 h-1.5 rounded-full bg-accent breathe" />
        <span className="label !text-text-low">{TWIN_VERSION}</span>
        <span className="label !text-text-low">· {WEEK_LABELS[clockWeek]}</span>
      </div>

      {screen ? (
        <div className="pl-3 border-l border-stroke-faint flex items-center gap-1.5 text-[12px]">
          <button onClick={closeScreen} className="text-text-mid hover:text-accent transition-colors">Network</button>
          <span className="text-text-low">›</span>
          <span className="text-text-hi font-medium">{screenLabel}</span>
          {screen.sub && (
            <>
              <span className="text-text-low">›</span>
              <span className="text-accent font-medium">{screen.sub}</span>
            </>
          )}
        </div>
      ) : (
        <div className="pl-3 border-l border-stroke-faint">
          <div className="label !text-text-low">Scenario</div>
          <div className="text-[12px] font-medium" style={{ color: scn ? "var(--risk-high)" : "var(--text-mid)" }}>
            {scn ? scn.name : "Baseline · steady state"}
          </div>
        </div>
      )}

      <div className="flex-1 flex items-center justify-end">
        <div className="flex items-center">
          <Kpi label="Fill rate" value={kpi.fillRate} decimals={1} suffix="%" tone={fillTone} />
          <Kpi label="Proj. waste" value={kpi.projectedWasteCases} suffix=" cs" tone="var(--text-hi)" />
          <Kpi label="Waste $" value={kpi.projectedWasteDollars / 1000} prefix="$" suffix="k" tone="var(--text-hi)" />
          <Kpi label="Freight" value={kpi.freightCost / 1_000_000} decimals={2} prefix="$" suffix="M" tone="var(--text-hi)" />
          <Kpi label="Expedite" value={kpi.expediteCost / 1000} prefix="$" suffix="k" tone={kpi.expediteCost > 400000 ? "var(--risk-high)" : "var(--text-hi)"} />
        </div>
      </div>

      <div className="flex items-center gap-2 pl-3 border-l border-stroke-faint">
        <Link href="/atlas" className="text-[12px] text-text-mid hover:text-accent transition-colors px-2 py-1 rounded-md hover:bg-white/5">
          Capability Atlas ↗
        </Link>
        <button
          onClick={() => (presenterMode ? exitPresenter() : enterPresenter())}
          className="text-[12px] px-2.5 py-1 rounded-md border transition-colors"
          style={{
            borderColor: presenterMode ? "var(--accent)" : "var(--stroke)",
            color: presenterMode ? "var(--accent)" : "var(--text-mid)",
            background: presenterMode ? "rgba(77,225,193,0.08)" : "transparent",
          }}
        >
          {presenterMode ? "● Presenter" : "Present (P)"}
        </button>
      </div>
    </div>
  );
}
