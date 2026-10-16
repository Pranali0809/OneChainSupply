"use client";
import { motion } from "framer-motion";
import { Capability } from "@/data/atlas";

const A = "#4DE1C1";
const F = "#6AA9FF";
const R = "#FF6B5A";

// 3-second looping micro-visual per capability archetype.
export default function MicroViz({ kind, play = true }: { kind: Capability["micro"]; play?: boolean }) {
  const rep = play ? Infinity : 0;
  return (
    <svg viewBox="0 0 120 52" className="w-full h-full">
      {kind === "forecast" && <Forecast rep={rep} />}
      {kind === "flow" && <Flow rep={rep} />}
      {kind === "risk" && <Risk rep={rep} />}
      {kind === "sankey" && <Sankey rep={rep} />}
      {kind === "route" && <Route rep={rep} />}
      {kind === "line" && <Line rep={rep} />}
      {kind === "stack" && <Stack rep={rep} />}
      {kind === "pulse" && <Pulse rep={rep} />}
    </svg>
  );
}

const T = { duration: 3, repeatType: "loop" as const, ease: "easeInOut" as const };

function Forecast({ rep }: { rep: number }) {
  return (
    <g>
      <motion.path d="M6,40 Q30,34 54,24 T114,10" fill="none" stroke={F} strokeWidth={1.5}
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ ...T, repeat: rep }} />
      <motion.path d="M54,24 L114,4 L114,20 Z" fill={F} opacity={0.14}
        initial={{ opacity: 0 }} animate={{ opacity: [0, 0.18, 0] }} transition={{ ...T, repeat: rep }} />
      <motion.circle cx={54} cy={24} r={2.5} fill={A}
        animate={{ r: [2, 3.2, 2] }} transition={{ ...T, repeat: rep }} />
    </g>
  );
}
function Flow({ rep }: { rep: number }) {
  return (
    <g>
      <path d="M10,42 C40,42 80,12 110,12" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={1.5} />
      {[0, 0.33, 0.66].map((d, i) => (
        <motion.circle key={i} r={2.4} fill={F}
          animate={{ offsetDistance: ["0%", "100%"] }}
          transition={{ duration: 3, repeat: rep, ease: "linear", delay: d * 3 }}
          style={{ offsetPath: "path('M10,42 C40,42 80,12 110,12')" } as any} />
      ))}
    </g>
  );
}
function Risk({ rep }: { rep: number }) {
  return (
    <g>
      {[0, 1, 2].map((i) => (
        <motion.rect key={i} x={14 + i * 34} y={14} width={22} height={24} rx={3}
          animate={{ fill: [A, i === 1 ? R : A, A] }} transition={{ ...T, repeat: rep, delay: i * 0.3 }} opacity={0.8} />
      ))}
    </g>
  );
}
function Sankey({ rep }: { rep: number }) {
  return (
    <g>
      {[12, 24, 36].map((y, i) => (
        <motion.path key={i} d={`M8,${y} C50,${y} 60,26 100,26`} fill="none" stroke={[R, "#F5B944", F][i]} strokeWidth={4} opacity={0.4}
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ ...T, repeat: rep, delay: i * 0.2 }} />
      ))}
      <rect x={100} y={16} width={6} height={22} rx={2} fill={A} />
    </g>
  );
}
function Route({ rep }: { rep: number }) {
  return (
    <g>
      <circle cx={14} cy={38} r={3} fill={F} />
      <circle cx={106} cy={14} r={3} fill={A} />
      <motion.path d="M14,38 L60,38 L60,14 L106,14" fill="none" stroke={A} strokeWidth={1.5} strokeDasharray="3 3"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ ...T, repeat: rep }} />
    </g>
  );
}
function Line({ rep }: { rep: number }) {
  return (
    <g>
      <rect x={8} y={22} width={104} height={8} rx={4} fill="rgba(255,255,255,0.08)" />
      {[0, 0.5].map((d, i) => (
        <motion.rect key={i} y={20} width={14} height={12} rx={2} fill={i ? A : F}
          animate={{ x: [8, 98] }} transition={{ duration: 3, repeat: rep, ease: "linear", delay: d * 3 }} />
      ))}
    </g>
  );
}
function Stack({ rep }: { rep: number }) {
  return (
    <g>
      {[0, 1, 2, 3].map((i) => (
        <motion.rect key={i} x={40} y={40 - i * 8} width={40} height={6} rx={1} fill={i === 3 ? A : F} opacity={0.7}
          initial={{ opacity: 0, y: 44 - i * 8 }} animate={{ opacity: 0.7, y: 40 - i * 8 }} transition={{ ...T, repeat: rep, delay: i * 0.25 }} />
      ))}
    </g>
  );
}
function Pulse({ rep }: { rep: number }) {
  return (
    <g>
      <circle cx={60} cy={26} r={5} fill={R} />
      {[0, 1].map((i) => (
        <motion.circle key={i} cx={60} cy={26} r={5} fill="none" stroke={R} strokeWidth={1.2}
          animate={{ r: [5, 22], opacity: [0.6, 0] }} transition={{ duration: 3, repeat: rep, ease: "easeOut", delay: i * 1.5 }} />
      ))}
    </g>
  );
}
