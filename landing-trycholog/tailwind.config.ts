import type { Config } from "tailwindcss";

// The visual system for this landing page lives in app/globals.css as CSS custom
// properties (design tokens) so both light and dark themes stay in one place.
// Tailwind is enabled for utility classes; the tokens below expose the palette
// to utilities as well (e.g. text-clay, bg-card).
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        "bg-2": "var(--bg-2)",
        card: "var(--card)",
        ink: "var(--ink)",
        "ink-soft": "var(--ink-soft)",
        line: "var(--line)",
        green: "var(--green)",
        "green-2": "var(--green-2)",
        "green-deep": "var(--green-deep)",
        gold: "var(--gold)",
        "gold-2": "var(--gold-2)",
      },
      fontFamily: {
        display: ['"Playfair Display"', "Georgia", "serif"],
        body: ['"Lora"', "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
export default config;
