"use client";
import { useStore } from "@/lib/store";
import { AnimatePresence, motion } from "framer-motion";
import { NODE_BY_ID } from "@/data/network";
import { atRiskBatches } from "@/data/inventory";
import { Chip } from "@/components/primitives";
import { useState } from "react";
import PlantScreen from "./PlantScreen";

// NOTE: these are deliberate STUBS. The deep-dive screen system — overlay,
// shared-element transition, breadcrumb, commitDecision pipeline, reset — is
// fully wired here; the rich interiors are built in the next pass.

export default function ScreenHost() {
  const screen = useStore((s) => s.activeScreen);
  const close = useStore((s) => s.closeScreen);

  return (
    <AnimatePresence>
      {screen && (
        <motion.div
          key={screen.kind + (screen.id ?? "")}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
          className="absolute left-0 right-0 bottom-0 top-14 z-30"
          style={{ background: "rgba(6,7,10,0.72)", backdropFilter: "blur(6px)" }}
          onClick={close}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-6 glass p-6 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {screen.kind === "plant" && <PlantScreen id={screen.id!} />}
            {screen.kind === "dock" && <DockStub id={screen.id!} />}
            {screen.kind === "plan" && <PlanStub />}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ScreenFrame({ eyebrow, title, subtitle, children }: { eyebrow: string; title: string; subtitle: string; children: React.ReactNode }) {
  const close = useStore((s) => s.closeScreen);
  return (
    <div className="max-w-[1100px] mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <div className="label !text-accent">{eyebrow}</div>
          <h1 className="text-[26px] font-semibold tracking-tight mt-0.5">{title}</h1>
          <p className="text-[13px] text-text-mid mt-0.5">{subtitle}</p>
        </div>
        <button onClick={close} className="text-text-low hover:text-text-hi text-[13px] flex items-center gap-1.5">
          Exit <kbd className="px-1 rounded bg-white/5 text-[10px]">Esc</kbd>
        </button>
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function StubNote() {
  return (
    <div className="mt-6 rounded-xl border border-dashed border-stroke p-4 flex items-center gap-3">
      <span className="text-accent text-[16px]">◴</span>
      <div className="text-[13px] text-text-mid">
        Deep-dive interior is built in the next pass. The screen system — overlay, shared-element transition,
        breadcrumb, <span className="text-text-hi">commitDecision()</span> pipeline, and reset — is live now.
      </div>
    </div>
  );
}

function CommitButton({ label, onCommit }: { label: string; onCommit: () => string }) {
  const [done, setDone] = useState<string | null>(null);
  return (
    <div className="mt-5 flex items-center gap-3">
      <button
        onClick={() => setDone(onCommit())}
        className="px-4 py-2 rounded-lg text-[13px] font-semibold"
        style={{ background: "rgba(77,225,193,0.14)", color: "var(--accent)", boxShadow: "inset 0 0 0 1px rgba(77,225,193,0.4)" }}
      >
        {label}
      </button>
      {done && (
        <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="text-[12px] text-text-mid">
          Committed <span className="text-accent tnum">{done}</span> — KPI strip & ledger updated. Press{" "}
          <kbd className="px-1 rounded bg-white/5 text-[10px]">R</kbd> to reset.
        </motion.span>
      )}
    </div>
  );
}

function DockStub({ id }: { id: string }) {
  const n = NODE_BY_ID[id];
  const commit = useStore((s) => s.commitDecision);
  if (!n) return null;
  const risky = atRiskBatches(id, 0.6).slice(0, 8);
  return (
    <ScreenFrame eyebrow="Dock · truck build" title={`${n.name}, ${n.state}`} subtitle={`${n.code} · ${n.ownership} · ${n.temp} · ${risky.length} at-risk batches staged`}>
      <div className="flex flex-wrap gap-2">
        {risky.map((b) => (
          <div key={b.id} className="rounded-lg border border-stroke-faint bg-white/[0.02] px-3 py-2">
            <div className="text-[12px] text-text-hi tnum">{b.id}</div>
            <div className="label !text-text-low">{b.qtyCases.toLocaleString()} cs · {b.remainingShelfDays}d left</div>
          </div>
        ))}
      </div>
      <StubNote />
      <CommitButton
        label="Commit truck build (demo)"
        onCommit={() =>
          commit({
            objectId: id,
            objectLabel: `${n.code} · ${n.name}`,
            title: "Consolidate 2 partials → 1 full truckload",
            expectedValue: 31000,
            kpi: { freightCost: -24000, fillRate: 0.3 },
            nodeRiskDelta: { nodeId: id, delta: -0.06 },
            rationale: "Load levelling protects freight cost and the service window.",
          }).id
        }
      />
    </ScreenFrame>
  );
}

function PlanStub() {
  const commit = useStore((s) => s.commitDecision);
  return (
    <ScreenFrame eyebrow="Plan room" title="S&OP plan room" subtitle="Balance supply and demand across the network with declared priorities">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {["Service first", "Waste first", "Working capital first"].map((p, i) => (
          <div key={p} className="rounded-xl border border-stroke-faint bg-white/[0.02] p-4">
            <div className="label !text-text-low">Priority {i + 1}</div>
            <div className="text-[15px] font-semibold mt-1">{p}</div>
            <div className="text-[12px] text-text-mid mt-1">Reweights the coordinated solve objective.</div>
          </div>
        ))}
      </div>
      <StubNote />
      <CommitButton
        label="Commit plan priority (demo)"
        onCommit={() =>
          commit({
            objectId: "PLAN-ROOM",
            objectLabel: "S&OP plan room",
            title: "Set quarter priority — waste first",
            expectedValue: 58000,
            kpi: { projectedWasteCases: -260, projectedWasteDollars: -260 * 92, workingCapital: -300000 },
            rationale: "Declared priority reweights the coordinated solve toward waste reduction.",
          }).id
        }
      />
    </ScreenFrame>
  );
}
