import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#12100d",
          900: "#181510",
          850: "#1d1a14",
          800: "#242019",
          700: "#2f2a21",
          600: "#3d372c",
          500: "#57503f",
        },
        stone2: {
          400: "#a89f8d",
          300: "#c4bca9",
          200: "#ddd6c4",
          100: "#efe9da",
        },
        bronze: {
          600: "#8a6a3b",
          500: "#a8813f",
          400: "#c49a4a",
          300: "#d9b568",
          200: "#e9d1a0",
        },
        olive: {
          500: "#7d8250",
          400: "#9aa06a",
        },
        terra: {
          600: "#a4442e",
          500: "#c2563a",
          400: "#d97757",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.25)",
        modal: "0 8px 40px rgba(0,0,0,0.6)",
      },
    },
  },
  plugins: [],
};
export default config;
