"use client";
import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { CAPABILITIES, PILLARS, ARCH_LAYERS, Capability, AtlasStatus } from "@/data/atlas";
import { Chip } from "@/components/primitives";
import MicroViz from "./MicroViz";

const statusTone: Record<AtlasStatus, "low" | "accent" | "med"> = {
  "Live in demo": "low",
  Modelled: "accent",
  Designed: "med",
};

export default function AtlasClient() {
  const [sel, setSel] = useState<Capability | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const liveCount = CAPABILITIES.filter((c) => c.status === "Live in demo").length;

  return (
    <div className="h-screen w-full bg-void text-text-hi overflow-y-auto">
      {/* header */}
      <div className="sticky top-0 z-20 glass !rounded-none !border-x-0 !border-t-0 px-6 h-14 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="text-text-mid group-hover:text-accent transition-colors">←</span>
          <div className="w-6 h-6 rounded-[7px] grid place-items-center" style={{ background: "linear-gradient(135deg,#4DE1C1,#2bbda0)" }}>
            <span className="text-[13px] font-bold text-void">◆</span>
          </div>
          <span className="text-[15px] font-semibold">ONECHAIN</span>
        </Link>
        <span className="label !text-text-low">/ Capability Atlas</span>
        <div className="flex-1" />
        <span className="label">{CAPABILITIES.length} capabilities · {liveCount} live in demo · 5 pillars</span>
      </div>

      <div className="max-w-[1280px] mx-auto px-6 py-8">
        <h1 className="text-[28px] font-semibold tracking-tight">Total supply chain coverage</h1>
        <p className="text-[14px] text-text-mid mt-1 max-w-[720px]">
          Everything ONECHAIN does across the five pillars. What runs in the seven-minute demo is marked
          <span className="text-risk-low"> Live</span>; the rest is <span className="text-accent">Modelled</span> or
          <span className="text-risk-med"> Designed</span> on the same twin. Hover a card for its mechanism; click for the objects it consumes and the decision it produces.
        </p>

        {/* gallery grouped by pillar */}
        {PILLARS.map((pillar) => (
          <section key={pillar} className="mt-8">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-0.5 h-5 bg-accent rounded-full" />
              <h2 className="text-[16px] font-semibold">{pillar}</h2>
              <span className="label !text-text-low">{CAPABILITIES.filter((c) => c.pillar === pillar).length}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {CAPABILITIES.filter((c) => c.pillar === pillar).map((c) => (
                <motion.button
                  key={c.id}
                  onClick={() => setSel(c)}
                  onMouseEnter={() => setHover(c.id)}
                  onMouseLeave={() => setHover(null)}
                  initial={{ opacity: 0, y: 6 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                  className="glass p-3.5 text-left hover:border-accent/40 transition-colors group"
                >
                  <div className="h-14 mb-2.5 rounded-lg bg-white/[0.02] border border-stroke-faint overflow-hidden">
                    <MicroViz kind={c.micro} play={hover === c.id} />
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-[13px] font-semibold leading-tight">{c.name}</h3>
                    <Chip tone={statusTone[c.status]}>{c.status === "Live in demo" ? "Live" : c.status}</Chip>
                  </div>
                  <p className="text-[12px] text-text-mid mt-1 leading-snug">{c.outcome}</p>
                </motion.button>
              ))}
            </div>
          </section>
        ))}

        {/* architecture strip */}
        <ArchitectureStrip />

        {/* industry 4.0 */}
        <Industry40 />

        <div className="h-16" />
      </div>

      {/* detail sheet */}
      <AnimatePresence>{sel && <DetailSheet cap={sel} onClose={() => setSel(null)} />}</AnimatePresence>
    </div>
  );
}

function DetailSheet({ cap, onClose }: { cap: Capability; onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 grid place-items-center p-6" style={{ background: "rgba(6,7,10,0.6)", backdropFilter: "blur(3px)" }} onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} className="glass p-5 w-[560px] max-w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Chip tone="accent">{cap.pillar}</Chip>
              <Chip tone={statusTone[cap.status]}>{cap.status}</Chip>
            </div>
            <h2 className="text-[18px] font-semibold mt-1.5 leading-tight">{cap.name}</h2>
          </div>
          <button onClick={onClose} className="text-text-low hover:text-text-hi text-[18px]">×</button>
        </div>
        <div className="h-20 my-3 rounded-lg bg-white/[0.02] border border-stroke-faint overflow-hidden">
          <MicroViz kind={cap.micro} />
        </div>
        <p className="text-[13px] text-text-hi">{cap.outcome}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <div className="label mb-1.5">Consumes from the twin</div>
            <div className="flex flex-wrap gap-1.5">{cap.inputs.map((i) => <Chip key={i}>{i}</Chip>)}</div>
          </div>
          <div>
            <div className="label mb-1.5">Model family</div>
            <Chip tone="accent">{cap.family}</Chip>
          </div>
        </div>
        <div className="mt-3 rounded-lg bg-white/[0.03] border border-stroke-faint p-3">
          <div className="label mb-1">Decision produced</div>
          <div className="text-[13px] text-text-hi">{cap.decision}</div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ArchitectureStrip() {
  const [hover, setHover] = useState<string | null>(null);
  const active = ARCH_LAYERS.find((l) => l.id === hover);
  return (
    <section className="mt-12">
      <div className="flex items-center gap-3 mb-3">
        <span className="w-0.5 h-5 bg-accent rounded-full" />
        <h2 className="text-[16px] font-semibold">Platform architecture</h2>
        <span className="label !text-text-low">hover a layer to see which demo moments depended on it</span>
      </div>
      <div className="glass p-4">
        <div className="flex flex-col gap-1.5">
          {ARCH_LAYERS.map((l, i) => {
            const on = hover === l.id;
            return (
              <motion.div
                key={l.id}
                onMouseEnter={() => setHover(l.id)}
                onMouseLeave={() => setHover(null)}
                className="relative rounded-lg border px-4 py-2.5 flex items-center gap-4 cursor-default transition-colors"
                style={{
                  borderColor: on ? "var(--accent)" : "var(--stroke-faint)",
                  background: on ? "rgba(77,225,193,0.07)" : `rgba(255,255,255,${0.02 + (ARCH_LAYERS.length - i) * 0.004})`,
                }}
              >
                <span className="label !text-text-low w-6 tnum">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-[14px] font-medium w-[200px]">{l.name}</span>
                <span className="text-[12px] text-text-mid flex-1">{l.blurb}</span>
                <div className="flex gap-1">
                  {l.beats.map((b) => (
                    <span key={b} className="w-5 h-5 rounded-md grid place-items-center text-[10px] tnum border" style={{ borderColor: on ? "var(--accent)" : "var(--stroke-faint)", color: on ? "var(--accent)" : "var(--text-low)" }}>
                      {b}
                    </span>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
        {active && (
          <div className="mt-2 text-[12px] text-text-mid">
            <span className="text-accent">{active.name}</span> powered beats {active.beats.join(", ")} of the demo.
          </div>
        )}
      </div>
    </section>
  );
}

function Industry40() {
  return (
    <section className="mt-12">
      <div className="flex items-center gap-3 mb-3">
        <span className="w-0.5 h-5 bg-risk-med rounded-full" />
        <h2 className="text-[16px] font-semibold">Industry 4.0 — edge to twin</h2>
        <Chip tone="med">Designed, not Live</Chip>
      </div>
      <div className="glass p-5">
        <div className="flex items-center justify-between gap-2">
          {[
            { t: "Line & warehouse sensors", s: "PLC, scales, vision, temp" },
            { t: "OPC-UA / MQTT gateways", s: "protocol normalization" },
            { t: "Local aggregation", s: "edge buffer + store-forward" },
            { t: "One-way boundary", s: "egress-only to cloud" },
            { t: "Asset twin", s: "feeds Make + resilience" },
          ].map((n, i, arr) => (
            <div key={n.t} className="flex items-center gap-2 flex-1">
              <div className="rounded-lg border border-stroke-faint bg-white/[0.03] p-2.5 flex-1">
                <div className="text-[12px] font-medium text-text-hi leading-tight">{n.t}</div>
                <div className="label !text-text-low mt-0.5">{n.s}</div>
              </div>
              {i < arr.length - 1 && (
                <motion.span className="text-accent text-[14px]" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}>
                  {i === 2 ? "⇥" : "→"}
                </motion.span>
              )}
            </div>
          ))}
        </div>
        <p className="text-[12px] text-text-mid mt-3">
          The one-way boundary (⇥) is deliberate: telemetry flows up into the asset twin, but cloud decisions never
          reach back onto the plant floor automatically. We label this <span className="text-risk-med">Designed</span> — the
          edge schematic is specified, not yet wired to live gateways.
        </p>
      </div>
    </section>
  );
}
