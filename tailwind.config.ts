import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        void: "#06070A",
        deep: "#0B0D12",
        panel: "#11141B",
        "stroke-faint": "rgba(255,255,255,0.06)",
        stroke: "rgba(255,255,255,0.12)",
        "text-hi": "#E8ECF4",
        "text-mid": "#9BA6B8",
        "text-low": "#5C6678",
        accent: "#4DE1C1",
        "accent-glow": "rgba(77,225,193,0.35)",
        "risk-low": "#3DD68C",
        "risk-med": "#F5B944",
        "risk-high": "#FF6B5A",
        "risk-crit": "#FF3B6B",
        flow: "#6AA9FF",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        glass: "14px",
      },
      backdropBlur: {
        glass: "24px",
      },
      transitionTimingFunction: {
        entrance: "cubic-bezier(0.22, 1, 0.36, 1)",
        state: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      boxShadow: {
        glass:
          "inset 0 1px 0 rgba(255,255,255,0.08), 0 24px 48px -12px rgba(0,0,0,0.6)",
      },
    },
  },
  plugins: [],
};

export default config;
