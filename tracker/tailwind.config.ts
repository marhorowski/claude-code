import type { Config } from "tailwindcss";

// Kolory wyłącznie z tokenów TrifectaOS (globals.css).
const channel = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  // Na dotyku „hover” nie zostaje przyklejony do ostatnio dotkniętego kafelka.
  future: { hoverOnlyWhenSupported: true },
  theme: {
    extend: {
      colors: {
        page: channel("page"),
        card: channel("card"),
        soft: channel("soft"),
        ink: { DEFAULT: channel("ink"), 2: channel("ink-2") },
        muted: channel("muted"),
        accent: channel("accent"),
        "accent-dark": channel("accent-dark"),
        "on-accent": channel("on-accent"),
        brown: channel("brown"),
        money: channel("money"),
        up: channel("up"),
        down: channel("down"),
        god: channel("god"),
        warn: channel("warn"),
        line: "var(--line)",
        "line-strong": "var(--line-strong)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        display: ["var(--font-manrope)", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      boxShadow: { card: "var(--shadow-card)", pop: "var(--shadow-pop)" },
    },
  },
  plugins: [],
};
export default config;
