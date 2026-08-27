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
        ground: "var(--ground)",
        "ground-2": "var(--ground-2)",
        card: "var(--card)",
        ink: "var(--ink)",
        "ink-soft": "var(--ink-soft)",
        line: "var(--line)",
        clay: "var(--clay)",
        "clay-deep": "var(--clay-deep)",
        ochre: "var(--ochre)",
        olive: "var(--olive)",
        rose: "var(--rose)",
        booksy: "var(--booksy)",
      },
      fontFamily: {
        display: ['"Fraunces"', "Georgia", "serif"],
        sans: ['"Mulish"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
