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
        soft: "0 18px 50px rgba(12, 9, 13, 0.08)",
        lift: "0 16px 36px rgba(84, 197, 183, 0.18)"
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"]
      }
    }
  },
  plugins: []
};

export default config;
