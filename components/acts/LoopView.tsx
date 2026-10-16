"use client";
import { useStore } from "@/lib/store";
import { AnimatePresence, motion } from "framer-motion";
import { ATTRIBUTION, ATTRIBUTION_TOTAL_CASES, BIAS_CORRECTION } from "@/data/attribution";
import { CountUp } from "@/components/primitives";

export default function LoopView() {
  const open = useStore((s) => s.loopOpen);
  const setOpen = useStore((s) => s.setLoop);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-30 grid place-items-center p-8"
          style={{ background: "rgba(6,7,10,0.55)", backdropFilter: "blur(2px)" }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="glass p-5 w-[980px] max-w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="w-0.5 h-5 bg-accent rounded-full" />
                <span className="text-[16px] font-semibold">Close the loop — realized waste → attribution → correction</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-text-low hover:text-text-hi text-[18px]">×</button>
            </div>
            <div className="label !text-text-low mb-3">Last quarter · {ATTRIBUTION_TOTAL_CASES.toLocaleString()} cs realized waste attributed to driver</div>

            <div className="flex items-stretch gap-4">
              <Sankey />
              <BiasCard />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Sankey() {
  const W = 560;
  const H = 300;
  const total = ATTRIBUTION_TOTAL_CASES;
  const gap = 8;
  const usableH = H - gap * (ATTRIBUTION.length - 1);
  let y = 0;
  const bands = ATTRIBUTION.map((b) => {
    const h = (b.cases / total) * usableH;
    const band = { ...b, y, h };
    y += h + gap;
    return band;
  });

  const sinkX = W * 0.62;
  const sinkW = 18;
  const leftW = 150;

  return (
    <svg width={W} height={H} className="overflow-visible flex-shrink-0">
      {/* links from each cause to the realized-waste sink */}
      {bands.map((b, i) => {
        const x0 = leftW;
        const x1 = sinkX;
        const yc1 = b.y + b.h / 2;
        const mid = (x0 + x1) / 2;
        const d = `M${x0},${b.y} C${mid},${b.y} ${mid},${yc1 - b.h / 2} ${x1},${yc1 - b.h / 2} L${x1},${yc1 + b.h / 2} C${mid},${yc1 + b.h / 2} ${mid},${b.y + b.h} ${x0},${b.y + b.h} Z`;
        return (
          <motion.path
            key={b.cause}
            d={d}
            fill={b.color}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.16 }}
            transition={{ delay: i * 0.08 }}
          />
        );
      })}

      {/* cause bands (left) */}
      {bands.map((b, i) => (
        <g key={b.cause}>
          <motion.rect
            x={leftW - 8}
            y={b.y}
            width={8}
            height={b.h}
            rx={2}
            fill={b.color}
            initial={{ opacity: 0, x: leftW }}
            animate={{ opacity: 1, x: leftW - 8 }}
            transition={{ delay: i * 0.06 }}
          />
          <text x={leftW - 14} y={b.y + b.h / 2 - 4} textAnchor="end" className="fill-[#E8ECF4]" style={{ fontSize: 12, fontWeight: 600 }}>
            {b.cause}
          </text>
          <text x={leftW - 14} y={b.y + b.h / 2 + 11} textAnchor="end" className="fill-[#9BA6B8]" style={{ fontSize: 11, fontVariantNumeric: "tabular-nums" }}>
            {b.cases.toLocaleString()} cs
          </text>
        </g>
      ))}

      {/* realized waste sink */}
      <rect x={sinkX} y={0} width={sinkW} height={H} rx={3} fill="#FF3B6B" opacity={0.85} />
      <text x={sinkX + sinkW + 10} y={H / 2 - 6} className="fill-[#E8ECF4]" style={{ fontSize: 12, fontWeight: 600 }}>Realized</text>
      <text x={sinkX + sinkW + 10} y={H / 2 + 9} className="fill-[#E8ECF4]" style={{ fontSize: 12, fontWeight: 600 }}>waste</text>

      {/* highlighted link: largest band → correction (exits right) */}
      <motion.path
        d={`M${sinkX + sinkW},${0} C${sinkX + 90},${0} ${sinkX + 90},${bands[0].h} ${W},${bands[0].h} L${W},${0} Z`}
        fill="#4DE1C1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.22 }}
        transition={{ delay: 0.5 }}
      />
      <motion.text
        x={sinkX + sinkW + 64}
        y={bands[0].h / 2}
        className="fill-[#4DE1C1]"
        style={{ fontSize: 11 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        → correction
      </motion.text>
    </svg>
  );
}

function BiasCard() {
  const b = BIAS_CORRECTION;
  const improvement = ((b.accuracyAfter - b.accuracyBefore) * 100).toFixed(1);
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.6 }}
      className="flex-1 rounded-xl border p-4 flex flex-col"
      style={{ borderColor: "rgba(77,225,193,0.3)", background: "rgba(77,225,193,0.05)" }}
    >
      <div className="label !text-accent">Forecast bias correction · live</div>
      <div className="text-[15px] font-semibold text-text-hi mt-1 leading-snug">{b.correctionLabel}</div>
      <div className="text-[12px] text-text-mid mt-1">Derived from {b.sourceCause} ({b.sourceCases.toLocaleString()} cs) · applied {b.appliedCycle}</div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-white/[0.03] p-2.5">
          <div className="label">Accuracy before</div>
          <div className="tnum text-[18px] font-semibold text-text-mid">{(b.accuracyBefore * 100).toFixed(1)}%</div>
        </div>
        <div className="rounded-lg bg-white/[0.03] p-2.5">
          <div className="label">Accuracy now</div>
          <div className="tnum text-[18px] font-semibold text-accent">
            <CountUp value={b.accuracyAfter * 100} decimals={1} suffix="%" />
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className="tnum text-[24px] font-semibold text-risk-low">+{improvement} pt</span>
        <span className="text-[12px] text-text-mid leading-tight">measured accuracy improvement since the correction went live</span>
      </div>
      <div className="mt-auto pt-3 text-[12px] text-text-mid">
        ↳ Projected next-cycle waste reduction: <span className="tnum text-text-hi">{b.wasteReductionCases.toLocaleString()} cs</span>
      </div>
    </motion.div>
  );
}
