import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "bg-primary": "#0F172A",
        "bg-card": "#1E293B",
        "border-card": "#334155",
        "text-primary": "#F1F5F9",
        "text-secondary": "#94A3B8",
        "kpi-red": "#EF4444",
        "kpi-orange": "#F97316",
        "kpi-green": "#22C55E",
        "kpi-gold": "#EAB308",
        accent: "#6366F1",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
