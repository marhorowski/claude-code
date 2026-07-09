import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0b0c0f",
          900: "#131519",
          850: "#1e2127",
          800: "#262a31",
          700: "#343a44",
          600: "#454c58",
          500: "#5d6572",
        },
        stone2: {
          400: "#9aa3af",
          300: "#c2c9d2",
          200: "#dee2e8",
          100: "#f4f6f9",
        },
        bronze: {
          600: "#8a6a3b",
          500: "#b2883a",
          400: "#cfa04b",
          300: "#e3ba67",
          200: "#f0d69f",
        },
        aegean: {
          600: "#3f66ad",
          500: "#6189d1",
          400: "#82a5e0",
          300: "#a9c2ec",
        },
        jade: {
          600: "#2b8258",
          500: "#3aa76f",
          400: "#5cc38b",
          300: "#8adbae",
        },
        olive: {
          500: "#7d8250",
          400: "#9aa06a",
        },
        terra: {
          600: "#a4442e",
          500: "#d4663d",
          400: "#e58562",
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
