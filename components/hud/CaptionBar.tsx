"use client";
import { useStore } from "@/lib/store";
import { BEATS } from "@/lib/choreography";
import { AnimatePresence, motion } from "framer-motion";

export default function CaptionBar() {
  const presenter = useStore((s) => s.presenterMode);
  const beatIndex = useStore((s) => s.beatIndex);
  if (!presenter) return null;
  const beat = BEATS[beatIndex];
  return (
    <div className="absolute left-0 right-0 bottom-24 z-20 flex justify-center pointer-events-none">
      <AnimatePresence mode="wait">
        <motion.div
          key={beat.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="glass px-4 py-2.5 flex items-center gap-3 max-w-[70vw]"
        >
          <span className="w-0.5 h-5 bg-accent rounded-full" style={{ boxShadow: "0 0 8px var(--accent-glow)" }} />
          <span className="label !text-text-low">{beat.timecode} · Beat {beat.id}</span>
          <span className="text-[15px] text-text-hi">{beat.caption}</span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
