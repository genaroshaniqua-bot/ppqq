import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        ink: "var(--color-text)",
        muted: "var(--color-muted)",
        line: "var(--color-border)",
        card: "var(--color-card)",
        primary: "var(--color-primary)",
        pink: "var(--color-pink)",
        blue: "var(--color-blue)",
        purple: "var(--color-purple)",
        lime: "var(--color-lime)",
        danger: "var(--color-danger)"
      },
      borderRadius: {
        card: "var(--radius-card)",
        pill: "var(--radius-pill)",
        small: "var(--radius-small)"
      },
      boxShadow: {
        soft: "0 24px 70px rgba(18, 16, 22, 0.08)",
        lift: "0 18px 42px rgba(50, 196, 182, 0.2)"
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
        editorial: ["var(--font-editorial)", "serif"],
        brand: ["var(--font-brand)", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"]
      }
    }
  },
  plugins: []
};

export default config;
