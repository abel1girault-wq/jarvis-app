import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#0F1117",
          raised: "#161B27",
          card: "#1C2333",
          hover: "#212840",
          border: "#2D3348",
        },
        text: {
          DEFAULT: "#E8EAF0",
          muted: "#8B92A8",
          dim: "#5C6278",
        },
        accent: {
          DEFAULT: "#6366F1",
          hover: "#7C7FFF",
          soft: "#1E2045",
          glow: "#6366F133",
        },
        emerald: {
          soft: "#0F2318",
          DEFAULT: "#34D399",
        },
        rose: {
          soft: "#2A0F12",
          DEFAULT: "#F87171",
        },
        amber: {
          soft: "#2A1A08",
          DEFAULT: "#FBBF24",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease",
        "slide-up": "slideUp 0.3s ease",
        "blink": "blink 1s step-end infinite",
        "spin-slow": "spin 3s linear infinite",
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        blink: { "0%,100%": { opacity: "1" }, "50%": { opacity: "0" } },
      },
    },
  },
  plugins: [],
};
export default config;
