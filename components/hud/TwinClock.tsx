"use client";
import { useStore } from "@/lib/store";
import { WEEK_LABELS, NOW_WEEK, TOTAL_WEEKS } from "@/data/forecast";

export default function TwinClock() {
  const week = useStore((s) => s.clockWeek);
  const setWeek = useStore((s) => s.setClockWeek);
  const isForward = week > NOW_WEEK;
  const isPast = week < NOW_WEEK;

  return (
    <div className="absolute right-4 bottom-4 z-20 glass p-3 w-[360px]">
      <div className="flex items-center justify-between mb-2">
        <span className="label">Twin clock · 39-week horizon</span>
        <span className="tnum text-[13px] font-semibold" style={{ color: isForward ? "var(--flow)" : isPast ? "var(--text-mid)" : "var(--accent)" }}>
          {WEEK_LABELS[week]} {week === NOW_WEEK ? "· now" : isForward ? "· forecast" : "· actual"}
        </span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={0}
          max={TOTAL_WEEKS - 1}
          value={week}
          onChange={(e) => setWeek(Number(e.target.value))}
          className="w-full appearance-none bg-transparent cursor-pointer twin-range"
        />
        {/* now marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-[2px] h-3 bg-accent pointer-events-none"
          style={{ left: `${(NOW_WEEK / (TOTAL_WEEKS - 1)) * 100}%` }}
        />
      </div>
      <div className="flex justify-between mt-1.5 label !text-text-low">
        <span>{WEEK_LABELS[0]}</span>
        <span className="!text-accent">now</span>
        <span>{WEEK_LABELS[TOTAL_WEEKS - 1]}</span>
      </div>
      <style jsx>{`
        .twin-range {
          height: 4px;
          border-radius: 4px;
          background: linear-gradient(
            to right,
            rgba(155, 166, 184, 0.3) 0%,
            rgba(155, 166, 184, 0.3) ${(NOW_WEEK / (TOTAL_WEEKS - 1)) * 100}%,
            rgba(106, 169, 255, 0.25) ${(NOW_WEEK / (TOTAL_WEEKS - 1)) * 100}%,
            rgba(106, 169, 255, 0.25) 100%
          );
        }
        .twin-range::-webkit-slider-thumb {
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: var(--accent);
          box-shadow: 0 0 12px var(--accent-glow);
          cursor: pointer;
        }
        .twin-range::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border: none;
          border-radius: 50%;
          background: var(--accent);
          box-shadow: 0 0 12px var(--accent-glow);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
