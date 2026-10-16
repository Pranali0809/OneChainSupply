"use client";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useRef, ReactNode } from "react";
import { riskRampHex, riskTier, riskTierColor } from "@/lib/palette";

const ENTRANCE = [0.22, 1, 0.36, 1] as const;

export function GlassPanel({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: ENTRANCE, delay }}
      className={`glass ${className}`}
    >
      {children}
    </motion.div>
  );
}

// Numbers count up — they never swap. Tabular figures, fixed width.
export function CountUp({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  className = "",
  duration = 0.48,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  duration?: number;
}) {
  const mv = useMotionValue(value);
  const ref = useRef<HTMLSpanElement>(null);
  const rounded = useTransform(mv, (v) => {
    const f = Math.pow(10, decimals);
    const n = Math.round(v * f) / f;
    return prefix + n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
  });
  useEffect(() => {
    const controls = animate(mv, value, { duration, ease: [0.4, 0, 0.2, 1] });
    return controls.stop;
  }, [value, duration, mv]);
  useEffect(() => {
    return rounded.on("change", (v) => {
      if (ref.current) ref.current.textContent = v;
    });
  }, [rounded]);
  return (
    <span ref={ref} className={`tnum ${className}`}>
      {prefix + value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix}
    </span>
  );
}

export function Sparkline({
  values,
  width = 96,
  height = 26,
  color = "var(--accent)",
  fill = true,
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
}) {
  if (!values.length) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y] as const;
  });
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${d} L${width},${height} L0,${height} Z`;
  return (
    <svg width={width} height={height} className="overflow-visible">
      {fill && <path d={area} fill={color} opacity={0.1} />}
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={2} fill={color} />
    </svg>
  );
}

export function RiskGauge({
  value,
  label,
  showValue = true,
}: {
  value: number;
  label?: string;
  showValue?: boolean;
}) {
  const color = riskRampHex(value);
  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between items-baseline mb-1">
          <span className="label">{label}</span>
          {showValue && (
            <span className="tnum text-[13px]" style={{ color }}>
              {value.toFixed(2)}
            </span>
          )}
        </div>
      )}
      <div className="h-[6px] rounded-full bg-white/5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value * 100}%` }}
          transition={{ duration: 0.6, ease: ENTRANCE }}
          style={{ background: color, boxShadow: `0 0 10px ${color}` }}
          className="h-full rounded-full"
        />
      </div>
    </div>
  );
}

export function Chip({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "low" | "med" | "high" | "crit";
}) {
  const map: Record<string, string> = {
    neutral: "bg-white/5 text-text-mid border-white/10",
    accent: "bg-accent/10 text-accent border-accent/30",
    low: "bg-[#3DD68C]/12 text-[#3DD68C] border-[#3DD68C]/30",
    med: "bg-[#F5B944]/12 text-[#F5B944] border-[#F5B944]/30",
    high: "bg-[#FF6B5A]/12 text-[#FF6B5A] border-[#FF6B5A]/30",
    crit: "bg-[#FF3B6B]/12 text-[#FF3B6B] border-[#FF3B6B]/30",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-[2px] rounded-full border text-[10px] uppercase tracking-[0.06em] font-medium ${map[tone]}`}
    >
      {children}
    </span>
  );
}

export function RiskDot({ value, size = 8 }: { value: number; size?: number }) {
  return (
    <span
      className="inline-block rounded-full"
      style={{ width: size, height: size, background: riskRampHex(value), boxShadow: `0 0 8px ${riskRampHex(value)}` }}
    />
  );
}

export function tierChipTone(value: number): "low" | "med" | "high" | "crit" {
  return riskTier(value);
}

export { riskTierColor };
