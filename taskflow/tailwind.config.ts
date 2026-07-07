import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#121316",
          900: "#17191d",
          850: "#1c1f24",
          800: "#23262c",
          700: "#2e3239",
          600: "#3c414a",
          500: "#555b66",
        },
        stone2: {
          400: "#9aa0a8",
          300: "#b8bdc4",
          200: "#d5d8dd",
          100: "#eceef1",
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
