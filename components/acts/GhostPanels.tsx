"use client";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { AnimatePresence, motion } from "framer-motion";
import { Chip } from "@/components/primitives";

// Beat 2: three legacy tools, three incompatible answers for ONE batch, in
// three different type treatments — then they collapse into one object card.
export default function GhostPanels() {
  const ghost = useStore((s) => s.ghostPanels);
  const unified = useStore((s) => s.unifiedCard);
  // ghost panels show first; after ~2.6s the unified card takes over
  const [collapsed, setCollapsed] = useReveal(ghost && unified, 2600);

  if (!ghost) return null;

  return (
    <div className="absolute inset-0 z-20 pointer-events-none grid place-items-center">
      <AnimatePresence>
        {!collapsed && (
          <div className="relative w-[720px] h-[320px]">
            <Legacy
              x={-220} y={-40} rot={-3}
              title="DemandIQ v3"
              font="font-mono"
              rows={[["Batch", "4471188 / 26W38"], ["Age risk", "0.62"]]}
              accent="#6AA9FF"
              delay={0}
            />
            <Legacy
              x={60} y={30} rot={2.5}
              title="WASTE-WATCH"
              font="font-sans uppercase tracking-wide"
              rows={[["ITEM", "4471188"], ["AGE RISK", "HIGH"]]}
              accent="#F5B944"
              delay={0.15}
            />
            <Legacy
              x={240} y={-20} rot={-1.5}
              title="svc_proj.xlsx"
              font="font-serif"
              rows={[["material", "4471188"], ["risk flag", "Y"]]}
              accent="#FF6B5A"
              delay={0.3}
            />
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {collapsed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="glass p-5 w-[420px] pointer-events-auto"
          >
            <div className="flex items-center justify-between">
              <span className="label !text-accent">ONECHAIN · unified object</span>
              <Chip tone="accent">twin.v41.3</Chip>
            </div>
            <div className="text-[18px] font-semibold mt-1">Batch 4471188-26W38-COV</div>
            <div className="text-[12px] text-text-mid">PET DRY ADULT CHKN 24LB · Joliet DC</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-white/[0.03] p-2.5">
                <div className="label">Age risk</div>
                <div className="tnum text-[20px] font-semibold text-risk-crit">0.91</div>
                <div className="label !text-text-low">one number, every function</div>
              </div>
              <div className="rounded-lg bg-white/[0.03] p-2.5">
                <div className="label">Remaining shelf</div>
                <div className="tnum text-[20px] font-semibold text-text-hi">41d</div>
                <div className="label !text-text-low">vs 60d freshness</div>
              </div>
            </div>
            <div className="mt-3 text-[12px] text-text-mid">
              One object. One definition of risk. Reconciled across demand, waste, and service.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Legacy({ x, y, rot, title, font, rows, accent, delay }: { x: number; y: number; rot: number; title: string; font: string; rows: string[][]; accent: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: y + 10 }}
      animate={{ opacity: 1, y }}
      exit={{ opacity: 0, scale: 0.6, filter: "blur(4px)" }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`absolute left-1/2 top-1/2 w-[220px] rounded-lg border p-3 ${font}`}
      style={{ transform: `translate(calc(-50% + ${x}px), -50%) rotate(${rot}deg)`, background: "rgba(14,16,22,0.92)", borderColor: "rgba(255,255,255,0.1)", boxShadow: "0 16px 40px rgba(0,0,0,0.5)" }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2 h-2 rounded-full" style={{ background: accent }} />
        <span className="text-[12px]" style={{ color: accent }}>{title}</span>
      </div>
      {rows.map((r, i) => (
        <div key={i} className="flex justify-between text-[12px] text-text-mid py-0.5">
          <span>{r[0]}</span>
          <span className="text-text-hi">{r[1]}</span>
        </div>
      ))}
    </motion.div>
  );
}

function useReveal(active: boolean, delay: number): [boolean, (b: boolean) => void] {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!active) {
      setOn(false);
      return;
    }
    const t = setTimeout(() => setOn(true), delay);
    return () => clearTimeout(t);
  }, [active, delay]);
  return [on, setOn];
}
