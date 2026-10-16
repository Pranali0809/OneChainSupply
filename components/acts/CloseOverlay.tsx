"use client";
import { useStore } from "@/lib/store";
import { AnimatePresence, motion } from "framer-motion";
import { CountUp } from "@/components/primitives";
import { LEDGER_STATS } from "@/data/ledger";

export default function CloseOverlay() {
  const show = useStore((s) => s.closeOverlay);
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0 z-20 grid place-items-center pointer-events-none"
          style={{ background: "radial-gradient(60% 50% at 50% 50%, rgba(6,7,10,0.55), rgba(6,7,10,0.1))" }}
        >
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-[10px] grid place-items-center" style={{ background: "linear-gradient(135deg,#4DE1C1,#2bbda0)", boxShadow: "0 0 28px var(--accent-glow)" }}>
                <span className="text-void font-bold text-[18px]">◆</span>
              </div>
              <span className="text-[32px] font-semibold tracking-tight">ONECHAIN</span>
            </div>
            <div className="text-[18px] text-text-mid max-w-[620px] mx-auto leading-snug">
              A digital twin of the supply chain that predicts what will go wrong, decides what to do
              about it across every function at once, proves why, and learns from the outcome.
            </div>
            <div className="flex items-center justify-center gap-10 mt-8">
              <Stat value={LEDGER_STATS.total} label="decisions coordinated" />
              <Stat value={3120} label="cases of waste avoided" suffix="" />
              <Stat value={11.5} label="planner-hours returned" decimals={1} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Stat({ value, label, suffix = "", decimals = 0 }: { value: number; label: string; suffix?: string; decimals?: number }) {
  return (
    <div>
      <div className="text-[40px] font-semibold tnum text-accent leading-none">
        <CountUp value={value} suffix={suffix} decimals={decimals} duration={1.2} />
      </div>
      <div className="label mt-1">{label}</div>
    </div>
  );
}
