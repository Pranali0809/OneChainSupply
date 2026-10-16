"use client";
import { useStore } from "@/lib/store";
import { BEATS } from "@/lib/choreography";
import { motion } from "framer-motion";

export default function PresenterControls() {
  const presenter = useStore((s) => s.presenterMode);
  const beatIndex = useStore((s) => s.beatIndex);
  const next = useStore((s) => s.nextBeat);
  const prev = useStore((s) => s.prevBeat);
  const exit = useStore((s) => s.exitPresenter);
  if (!presenter) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute left-1/2 -translate-x-1/2 bottom-5 z-30 glass px-2 py-1.5 flex items-center gap-1"
    >
      <button onClick={prev} disabled={beatIndex === 0} className="w-8 h-8 rounded-lg grid place-items-center text-text-mid hover:text-accent disabled:opacity-30 transition-colors">←</button>
      <div className="flex items-center gap-1 px-1">
        {BEATS.map((b, i) => (
          <div key={b.id} className="w-6 h-1 rounded-full transition-colors" style={{ background: i === beatIndex ? "var(--accent)" : i < beatIndex ? "rgba(77,225,193,0.4)" : "rgba(255,255,255,0.1)" }} title={b.title} />
        ))}
      </div>
      <button onClick={next} disabled={beatIndex === BEATS.length - 1} className="w-8 h-8 rounded-lg grid place-items-center text-text-mid hover:text-accent disabled:opacity-30 transition-colors">→</button>
      <div className="px-2 border-l border-stroke-faint">
        <div className="label !text-text-low leading-none">Beat {BEATS[beatIndex].id}/{BEATS.length}</div>
        <div className="text-[12px] text-text-hi leading-tight">{BEATS[beatIndex].title}</div>
      </div>
      <button onClick={exit} className="w-8 h-8 rounded-lg grid place-items-center text-text-low hover:text-risk-high transition-colors" title="Exit presenter (Esc)">⏏</button>
    </motion.div>
  );
}
