"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { AnimatePresence, motion } from "framer-motion";
import { NODES, LANES, NODE_BY_ID } from "@/data/network";
import { MATERIALS } from "@/data/materials";
import { BATCHES_BY_MATERIAL } from "@/data/inventory";
import { LEDGER } from "@/data/ledger";

interface Item {
  id: string;
  kind: "node" | "material" | "lane" | "decision";
  title: string;
  subtitle: string;
  glyph: string;
}

const INDEX: Item[] = [
  ...NODES.map((n) => ({ id: n.id, kind: "node" as const, title: `${n.name}, ${n.state}`, subtitle: `${n.kind} · ${n.code}`, glyph: n.kind === "PLANT" ? "⬡" : n.kind === "DC" ? "●" : n.kind === "SUPPLIER" ? "▲" : "■" })),
  ...MATERIALS.map((m) => ({ id: m.code, kind: "material" as const, title: m.code, subtitle: m.desc, glyph: "▦" })),
  ...LANES.map((l) => ({ id: l.id, kind: "lane" as const, title: l.id, subtitle: `${NODE_BY_ID[l.from]?.name} → ${NODE_BY_ID[l.to]?.name}`, glyph: "≋" })),
  ...LEDGER.map((d) => ({ id: d.id, kind: "decision" as const, title: d.id, subtitle: d.title, glyph: "⟐" })),
];

function score(item: Item, q: string): number {
  const h = (item.title + " " + item.subtitle).toLowerCase();
  if (!q) return 0;
  if (item.title.toLowerCase() === q) return 1000;
  if (item.title.toLowerCase().startsWith(q)) return 500;
  if (h.includes(q)) return 100 - h.indexOf(q);
  return -1;
}

export default function CommandBar() {
  const open = useStore((s) => s.commandBarOpen);
  const setOpen = useStore((s) => s.setCommandBar);
  const flyTo = useStore((s) => s.flyTo);
  const selectNode = useStore((s) => s.selectNode);
  const selectLane = useStore((s) => s.selectLane);
  const runNlq = useStore((s) => s.runNlq);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const results = useMemo(() => {
    const lq = q.trim().toLowerCase();
    if (!lq) return INDEX.filter((i) => i.kind === "node").slice(0, 8);
    return INDEX.map((i) => ({ i, s: score(i, lq) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 9)
      .map((x) => x.i);
  }, [q]);

  const select = (item: Item) => {
    setOpen(false);
    if (item.kind === "node") {
      const n = NODE_BY_ID[item.id];
      selectNode(n.id);
      flyTo({ longitude: n.lon, latitude: n.lat, zoom: 5.6, pitch: 32, bearing: 0 });
    } else if (item.kind === "lane") {
      selectLane(item.id);
    } else if (item.kind === "material") {
      const holders = (BATCHES_BY_MATERIAL[item.id] || []).map((b) => b.nodeId);
      const first = holders.find((id) => NODE_BY_ID[id]);
      if (first) {
        const n = NODE_BY_ID[first];
        selectNode(n.id);
        flyTo({ longitude: n.lon, latitude: n.lat, zoom: 5, pitch: 30, bearing: 0 });
      }
    } else if (item.kind === "decision") {
      runNlq(`who approved decision ${item.id}?`);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-40 grid place-items-start justify-center pt-[16vh]"
          style={{ background: "rgba(6,7,10,0.5)", backdropFilter: "blur(3px)" }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            className="glass w-[560px] max-w-[90vw] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-stroke-faint">
              <span className="text-accent text-[16px]">⌘</span>
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setActive(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(results.length - 1, a + 1)); }
                  if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
                  if (e.key === "Enter" && results[active]) select(results[active]);
                  if (e.key === "Escape") setOpen(false);
                }}
                placeholder="Search every object — 4471188, Joliet, LN-, DEC-…"
                className="flex-1 bg-transparent outline-none text-[15px] text-text-hi placeholder:text-text-low"
              />
              <span className="label !text-text-low">esc</span>
            </div>
            <div className="max-h-[360px] overflow-y-auto py-1.5">
              {results.map((r, i) => (
                <button
                  key={r.kind + r.id}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => select(r)}
                  className="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors"
                  style={{ background: i === active ? "rgba(77,225,193,0.08)" : "transparent" }}
                >
                  <span className="text-text-low w-4 text-center">{r.glyph}</span>
                  <div className="flex-1">
                    <div className="text-[13px] text-text-hi">{r.title}</div>
                    <div className="label !text-text-low">{r.subtitle}</div>
                  </div>
                  <span className="label !text-text-low">{r.kind}</span>
                </button>
              ))}
              {!results.length && <div className="px-4 py-6 text-center text-[13px] text-text-low">No objects match “{q}”.</div>}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
