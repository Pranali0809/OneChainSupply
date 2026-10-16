"use client";
import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { SUGGESTED_QUERIES } from "@/lib/nlq";
import { AnimatePresence, motion } from "framer-motion";
import { ExplanationCard } from "@/lib/types";
import { NODE_BY_ID } from "@/data/network";
import { Chip } from "@/components/primitives";

export default function NlqBar() {
  const open = useStore((s) => s.nlqOpen);
  const setOpen = useStore((s) => s.setNlq);
  const result = useStore((s) => s.nlqResult);
  const runNlq = useStore((s) => s.runNlq);
  const beatQuery = useStore((s) => (s.presenterMode ? result?.card?.query : undefined));
  const [input, setInput] = useState("");
  const [typed, setTyped] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // auto-type effect when a beat populates a result without input
  useEffect(() => {
    if (result?.card?.query && open) {
      const full = result.card.query;
      setInput(full);
      let i = 0;
      setTyped("");
      const iv = setInterval(() => {
        i++;
        setTyped(full.slice(0, i));
        if (i >= full.length) clearInterval(iv);
      }, 18);
      return () => clearInterval(iv);
    }
  }, [result?.card?.query, open]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div className="absolute inset-x-0 bottom-24 z-30 flex flex-col items-center gap-3 px-4">
      <AnimatePresence>
        {result?.card && <CardView card={result.card} onClose={() => setOpen(false)} />}
        {result?.decisionSummary && <DecisionView d={result.decisionSummary} />}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass w-[680px] max-w-full p-2 flex items-center gap-2">
        <span className="text-accent text-[16px] pl-2">⌕</span>
        <input
          ref={inputRef}
          value={typed || input}
          onChange={(e) => {
            setInput(e.target.value);
            setTyped("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && input.trim()) runNlq(input);
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Ask the twin — why, what-if, which, who, how accurate, exposure…"
          className="flex-1 bg-transparent outline-none text-[14px] text-text-hi placeholder:text-text-low"
        />
        <button onClick={() => input.trim() && runNlq(input)} className="px-3 py-1.5 rounded-lg text-[12px] font-medium" style={{ background: "rgba(77,225,193,0.14)", color: "var(--accent)" }}>
          Ask
        </button>
        <button onClick={() => setOpen(false)} className="text-text-low hover:text-text-hi px-2 text-[16px]">×</button>
      </motion.div>

      {!result && (
        <div className="flex flex-wrap gap-1.5 justify-center max-w-[680px]">
          {SUGGESTED_QUERIES.slice(0, 5).map((q) => (
            <button key={q} onClick={() => runNlq(q)} className="text-[11px] px-2.5 py-1 rounded-full border border-stroke-faint text-text-mid hover:text-accent hover:border-accent/40 transition-colors">
              {q.length > 48 ? q.slice(0, 46) + "…" : q}
            </button>
          ))}
        </div>
      )}
      {void beatQuery}
    </div>
  );
}

function CardView({ card, onClose }: { card: ExplanationCard; onClose: () => void }) {
  const flyTo = useStore((s) => s.flyTo);
  const maxAbs = Math.max(...card.drivers.map((d) => Math.abs(d.contribution)), 0.01);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="glass w-[680px] max-w-full p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="label mb-1">Explanation</div>
          <div className="text-[14px] text-text-hi leading-snug">{card.decision}</div>
        </div>
        {card.expectedValue !== 0 && (
          <div className="text-right">
            <div className="label">Expected value</div>
            <div className="tnum text-[18px] font-semibold" style={{ color: card.expectedValue > 0 ? "var(--risk-low)" : "var(--risk-high)" }}>
              {card.expectedValue > 0 ? "+" : "−"}${Math.abs(card.expectedValue / 1000).toFixed(0)}k
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mt-3">
        {/* drivers waterfall */}
        <div>
          <div className="label mb-1.5">Top drivers — signed contribution</div>
          <div className="flex flex-col gap-1">
            {card.drivers.map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[11px] text-text-mid w-[132px] truncate">{d.label}</span>
                <div className="flex-1 h-2.5 relative">
                  <div className="absolute top-0 bottom-0 left-1/2 w-px bg-stroke-faint" />
                  <div className="absolute top-0 bottom-0 rounded-sm" style={{ background: d.contribution > 0 ? "var(--risk-low)" : "var(--risk-high)", width: `${(Math.abs(d.contribution) / maxAbs) * 48}%`, left: d.contribution > 0 ? "50%" : undefined, right: d.contribution < 0 ? "50%" : undefined }} />
                </div>
                <span className="tnum text-[11px] w-10 text-right" style={{ color: d.contribution > 0 ? "var(--risk-low)" : "var(--risk-high)" }}>
                  {d.contribution > 0 ? "+" : ""}{d.contribution.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* constraints */}
        <div>
          <div className="label mb-1.5">Binding constraints</div>
          <div className="flex flex-col gap-1.5">
            {card.constraints.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.binding ? "var(--risk-high)" : "var(--text-low)" }} />
                <span className="text-[12px] text-text-hi flex-1">{c.name}</span>
                <span className="label !text-text-low">{c.slack}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* next best */}
      <div className="mt-3 rounded-lg border border-stroke-faint bg-white/[0.03] p-2.5 flex items-center justify-between">
        <div>
          <div className="label">Next-best alternative</div>
          <div className="text-[13px] text-text-hi">{card.nextBest.label}</div>
          <div className="text-[11px] text-text-mid mt-0.5">{card.nextBest.whyLost}</div>
        </div>
        <div className="text-right">
          <div className="label">Cost delta</div>
          <div className="tnum text-[15px] font-semibold" style={{ color: "var(--risk-high)" }}>
            {card.nextBest.costDelta <= 0 ? "−" : "+"}${Math.abs(card.nextBest.costDelta / 1000).toFixed(0)}k
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <button
          onClick={() => {
            const id = card.highlightNodeIds[0];
            const n = id ? NODE_BY_ID[id] : null;
            if (n) flyTo({ longitude: n.lon, latitude: n.lat, zoom: 5.4, pitch: 32, bearing: 0 });
          }}
          className="text-[12px] text-accent hover:underline flex items-center gap-1"
        >
          ⌖ Show me on the twin
        </button>
        <div className="flex gap-1.5">
          {card.highlightNodeIds.map((id) => (
            <Chip key={id}>{NODE_BY_ID[id]?.name ?? id}</Chip>
          ))}
        </div>
        <button onClick={onClose} className="label !text-text-low hover:!text-text-hi">close</button>
      </div>
    </motion.div>
  );
}

function DecisionView({ d }: { d: NonNullable<ReturnType<typeof import("@/lib/nlq").runQuery>["decisionSummary"]> }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} className="glass w-[560px] max-w-full p-4">
      <div className="label mb-1">Decision ledger · {d.id}</div>
      <div className="text-[15px] font-semibold text-text-hi">{d.title}</div>
      <div className="text-[12px] text-text-mid mt-0.5">{d.objectLabel}</div>
      <div className="grid grid-cols-4 gap-2 mt-3">
        <Field label="Actor">{d.actor}</Field>
        <Field label="Status"><Chip tone="low">{d.status}</Chip></Field>
        <Field label="Expected">${(d.expectedValue / 1000).toFixed(0)}k</Field>
        <Field label="Realized">{d.realizedValue != null ? `$${(d.realizedValue / 1000).toFixed(0)}k` : "—"}</Field>
      </div>
      <div className="text-[12px] text-text-mid mt-3 leading-snug">{d.rationale}</div>
    </motion.div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="text-[13px] text-text-hi tnum mt-0.5">{children}</div>
    </div>
  );
}
