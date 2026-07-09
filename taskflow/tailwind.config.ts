import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0f0d0a",
          900: "#161310",
          850: "#201b15",
          800: "#2a231b",
          700: "#3a3226",
          600: "#4d4334",
          500: "#685b48",
        },
        stone2: {
          400: "#a2988a",
          300: "#c9c1b2",
          200: "#e4ded3",
          100: "#f7f4ef",
        },
        bronze: {
          600: "#b06d1f",
          500: "#d18a2c",
          400: "#f0a83d",
          300: "#f6bf68",
          200: "#fbdba4",
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
        glow: "0 0 24px rgba(240,168,61,0.25), 0 2px 8px rgba(0,0,0,0.4)",
      },
    },
  },
  plugins: [],
};
export default config;
