"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { AUTO_STEPS } from "@/lib/autopilot";

export default function Autopilot() {
  const autoDemo = useStore((s) => s.autoDemo);
  return autoDemo ? <Runner /> : null;
}

function Runner() {
  const paused = useStore((s) => s.autoPaused);
  const setPaused = useStore((s) => s.setAutoPaused);
  const stop = useStore((s) => s.stopAutoDemo);

  const [stepIndex, setStepIndex] = useState(0);
  const [cursor, setCursor] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const [cursorVisible, setCursorVisible] = useState(false);
  const [clicking, setClicking] = useState(false);
  const [note, setNote] = useState(AUTO_STEPS[0].note);

  // step engine — one cancellable chain per step
  useEffect(() => {
    if (paused) return;
    const step = AUTO_STEPS[stepIndex];
    if (!step) {
      stop();
      return;
    }
    let cancelled = false;
    const timers: number[] = [];
    const sleep = (ms: number) =>
      new Promise<void>((res) => timers.push(window.setTimeout(res, ms)));

    (async () => {
      const s = () => useStore.getState();
      setNote(step.note);
      step.pre?.(s());
      await sleep(160); // let the surface the target lives on render
      if (cancelled) return;

      if (step.target) {
        const el = document.querySelector(`[data-demo="${step.target}"]`) as HTMLElement | null;
        if (el) {
          const r = el.getBoundingClientRect();
          setCursor({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
          setCursorVisible(true);
          await sleep(660); // cursor flies to the control
          if (cancelled) return;
          setClicking(true);
          await sleep(220);
          if (cancelled) return;
          setClicking(false);
        }
      } else {
        setCursorVisible(false);
      }

      step.action?.(s());
      await sleep(step.hold);
      if (cancelled) return;
      setStepIndex((i) => i + 1);
    })();

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [stepIndex, paused, stop]);

  // space = pause/resume, arrows = step, while the demo runs
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA"].includes(t.tagName)) return;
      if (e.key === " ") {
        e.preventDefault();
        setPaused(!useStore.getState().autoPaused);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setStepIndex((i) => Math.min(AUTO_STEPS.length - 1, i + 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setStepIndex((i) => Math.max(0, i - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setPaused]);

  // manual interaction hands control back (pauses) — the demo never fights the user
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("[data-auto-ui]")) return;
      if (!useStore.getState().autoPaused) setPaused(true);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [setPaused]);

  const step = AUTO_STEPS[stepIndex];

  return (
    <>
      {/* simulated cursor */}
      <AnimatePresence>
        {cursorVisible && (
          <motion.div
            className="fixed z-[60] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, left: cursor.x, top: cursor.y }}
            exit={{ opacity: 0 }}
            transition={{ left: { duration: 0.66, ease: [0.22, 1, 0.36, 1] }, top: { duration: 0.66, ease: [0.22, 1, 0.36, 1] }, opacity: { duration: 0.2 } }}
            style={{ left: cursor.x, top: cursor.y }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))" }}>
              <path d="M5 3 L5 19 L9.5 14.5 L12.5 21 L15 20 L12 13.5 L18.5 13.5 Z" fill="#E8ECF4" stroke="#06070A" strokeWidth="1" strokeLinejoin="round" />
            </svg>
            <AnimatePresence>
              {clicking && (
                <motion.span
                  className="absolute -top-1 -left-1 rounded-full"
                  initial={{ width: 8, height: 8, opacity: 0.8 }}
                  animate={{ width: 40, height: 40, opacity: 0, x: -16, y: -16 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  style={{ border: "2px solid var(--accent)" }}
                />
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* subtle driver pill — reads as a guided tour, not a slideshow */}
      <div data-auto-ui className="fixed left-1/2 -translate-x-1/2 bottom-5 z-[60] glass px-2.5 py-1.5 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-accent breathe" />
        <span className="label !text-text-low">Auto demo</span>
        <span className="text-[12px] text-text-hi px-1">{step?.note ?? note}</span>
        <div className="flex items-center gap-0.5 px-1 border-l border-stroke-faint">
          <button onClick={() => setStepIndex((i) => Math.max(0, i - 1))} className="w-6 h-6 grid place-items-center text-text-mid hover:text-accent" title="Back (←)">←</button>
          <button onClick={() => setPaused(!paused)} className="w-6 h-6 grid place-items-center text-text-mid hover:text-accent" title="Pause/resume (Space)">{paused ? "▶" : "⏸"}</button>
          <button onClick={() => setStepIndex((i) => Math.min(AUTO_STEPS.length - 1, i + 1))} className="w-6 h-6 grid place-items-center text-text-mid hover:text-accent" title="Next (→)">→</button>
        </div>
        <div className="flex items-center gap-1 px-1">
          {AUTO_STEPS.map((st, i) => (
            <span key={st.id} className="w-1.5 h-1.5 rounded-full transition-colors" style={{ background: i === stepIndex ? "var(--accent)" : i < stepIndex ? "rgba(77,225,193,0.4)" : "rgba(255,255,255,0.12)" }} />
          ))}
        </div>
        <button onClick={stop} className="w-6 h-6 grid place-items-center text-text-low hover:text-risk-high border-l border-stroke-faint" title="Exit (Esc)">✕</button>
      </div>

      {paused && (
        <div data-auto-ui className="fixed left-1/2 -translate-x-1/2 bottom-16 z-[60] glass px-3 py-1.5 text-[12px] text-text-mid">
          Paused — you have control. Press <kbd className="px-1 rounded bg-white/5 text-[10px]">Space</kbd> or ▶ to resume.
        </div>
      )}
    </>
  );
}
