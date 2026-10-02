/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./explorer/**/*.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // SecureX Blockchain Explorer palette.
        //
        // Additive and scoped to the dedicated Explorer build
        // (src/explorer/**) — the SecureX application never references these
        // tokens, so the app's own light theme is unaffected by their presence.
        //
        // Every value is a CSS custom property defined in
        // src/explorer/styles/explorer.css, which is what lets one class name
        // (e.g. `bg-explorer-surface`) resolve correctly in BOTH the light and
        // the dark theme. The values are stored as bare RGB channel triplets so
        // Tailwind's opacity modifier (`bg-explorer-surface/80`) keeps working.
        explorer: {
          bg: "rgb(var(--x-bg) / <alpha-value>)",
          surface: "rgb(var(--x-surface) / <alpha-value>)",
          raised: "rgb(var(--x-raised) / <alpha-value>)",
          hover: "rgb(var(--x-hover) / <alpha-value>)",
          border: "rgb(var(--x-border) / <alpha-value>)",
          line: "rgb(var(--x-line) / <alpha-value>)",
          accent: "rgb(var(--x-accent) / <alpha-value>)",
          "accent-alt": "rgb(var(--x-accent-alt) / <alpha-value>)",

          // Fill colours for surfaces that carry white text. Kept separate from
          // `accent` because the brand blue (#3B82F6) only reaches ~3.7:1 against
          // white — fine for borders, glows and gradients, but below WCAG AA for
          // a text label. `accent-solid` is the brand's own darker step so that
          // button labels pass AA in both themes.
          "accent-solid": "rgb(var(--x-accent-solid) / <alpha-value>)",
          "accent-solid-hover": "rgb(var(--x-accent-solid-hover) / <alpha-value>)",
          "on-accent": "var(--x-on-accent)",

          // Foreground variants. The brand blue/purple are tuned for *fills*;
          // as text on a light surface they need a deeper step to clear AA.
          "accent-text": "var(--x-accent-text)",
          "accent-text-hover": "var(--x-accent-text-hover)",
          "accent-alt-text": "var(--x-accent-alt-text)",

          text: "rgb(var(--x-text) / <alpha-value>)",
          subtext: "rgb(var(--x-subtext) / <alpha-value>)",
          faint: "rgb(var(--x-faint) / <alpha-value>)",
        },

        // Semantic status tones. The plain `ok`/`warn`/`bad`/`info` entries are
        // RGB triplets, so a component can tint a surface or a border with an
        // opacity modifier in either theme; the `*-text` companions are the
        // per-theme foreground steps chosen to stay legible on their own tint.
        ok: "rgb(var(--x-ok) / <alpha-value>)",
        "ok-text": "var(--x-ok-text)",
        warn: "rgb(var(--x-warn) / <alpha-value>)",
        "warn-text": "var(--x-warn-text)",
        bad: "rgb(var(--x-bad) / <alpha-value>)",
        "bad-text": "var(--x-bad-text)",
        info: "rgb(var(--x-info) / <alpha-value>)",
        "info-text": "var(--x-info-text)",
        securex: {
          50: "#eef6ff",
          100: "#d9ebff",
          200: "#bbdaff",
          300: "#8cc3ff",
          400: "#55a1ff",
          500: "#2d7bff",
          600: "#1558f5",
          700: "#0e43e1",
          800: "#1238b6",
          900: "#15338f",
          950: "#112057",
        },
        trust: {
          50: "#f0fdf6",
          100: "#dcfce9",
          200: "#bbf7d4",
          300: "#86efb0",
          400: "#4ade83",
          500: "#22c55e",
          600: "#16a34b",
          700: "#15803d",
          800: "#166534",
          900: "#14532c",
          950: "#052e16",
        },
        danger: {
          50: "#fef2f2",
          100: "#fee2e2",
          200: "#fecaca",
          300: "#fca5a5",
          400: "#f87171",
          500: "#ef4444",
          600: "#dc2626",
          700: "#b91c1c",
          800: "#991b1b",
          900: "#7f1d1d",
          950: "#450a0a",
        },
        warning: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
          950: "#451a03",
        },
        neutral: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      borderRadius: {
        securex: "0.5rem",
      },
      boxShadow: {
        securex: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
        "securex-md": "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
        "securex-lg": "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
        "securex-xl": "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
      },
    },
  },
  plugins: [],
};
