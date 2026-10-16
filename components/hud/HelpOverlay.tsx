"use client";
import { useStore } from "@/lib/store";
import { AnimatePresence, motion } from "framer-motion";

const GROUPS: { title: string; keys: [string, string][] }[] = [
  {
    title: "Navigation",
    keys: [
      ["⌘ / Ctrl + K", "Command bar — search every object"],
      ["O", "Toggle geographic ↔ ontology view"],
      ["Click node / lane", "Open the four-tab Inspector"],
      ["Drag / scroll", "Pan, zoom, rotate the twin"],
    ],
  },
  {
    title: "Layers",
    keys: [
      ["1–9", "Toggle a risk / flow layer"],
      ["Legend tiers", "Click to isolate a risk tier"],
      ["Twin clock", "Scrub 39 weeks of history + forecast"],
    ],
  },
  {
    title: "Decisioning",
    keys: [
      ["D", "Inject a disruption scenario"],
      ["S", "Run the coordinated solve"],
      ["N", "Natural-language query bar"],
      ["L", "Loop view — attribution & learning"],
    ],
  },
  {
    title: "Presenter",
    keys: [
      ["P", "Enter / exit presenter mode"],
      ["→ / ←", "Advance / reverse beats"],
      ["Esc", "Exit / close the top overlay"],
      ["?", "This shortcut sheet"],
    ],
  },
];

export default function HelpOverlay() {
  const open = useStore((s) => s.helpOpen);
  const setOpen = useStore((s) => s.setHelp);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-40 grid place-items-center"
          style={{ background: "rgba(6,7,10,0.6)", backdropFilter: "blur(3px)" }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="glass p-5 w-[640px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[16px] font-semibold">Keyboard</span>
              <button onClick={() => setOpen(false)} className="text-text-low hover:text-text-hi text-[18px]">×</button>
            </div>
            <div className="grid grid-cols-2 gap-5">
              {GROUPS.map((g) => (
                <div key={g.title}>
                  <div className="label !text-accent mb-2">{g.title}</div>
                  <div className="flex flex-col gap-1.5">
                    {g.keys.map(([k, d]) => (
                      <div key={k} className="flex items-center gap-2">
                        <kbd className="px-1.5 py-0.5 rounded-md bg-white/5 border border-stroke-faint text-[11px] text-text-hi tnum min-w-[72px] text-center">{k}</kbd>
                        <span className="text-[12px] text-text-mid">{d}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
