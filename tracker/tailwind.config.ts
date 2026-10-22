import type { Config } from "tailwindcss";

// Kolory wyłącznie z tokenów (globals.css): każdy ma wartość jasną i ciemną.
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
        "on-accent": channel("on-accent"),
        money: channel("money"),
        up: channel("up"),
        down: channel("down"),
        line: "var(--line)",
        "line-strong": "var(--line-strong)",
      },
      boxShadow: { card: "var(--shadow-card)", pop: "var(--shadow-pop)" },
    },
  },
  plugins: [],
};
export default config;
