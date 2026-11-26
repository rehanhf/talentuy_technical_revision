import type { Config } from "tailwindcss";

/**
 * Design tokens TalentPulse.
 * Palet ditulis sebagai CSS variable (kanal RGB) di globals.css sehingga dapat diganti
 * setelah brand guideline resmi PT Siprama Cakrawala tersedia, tanpa
 * menyentuh komponen.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "rgb(var(--tp-canvas) / <alpha-value>)",
        surface: "rgb(var(--tp-surface) / <alpha-value>)",
        "surface-muted": "rgb(var(--tp-surface-muted) / <alpha-value>)",
        sidebar: "rgb(var(--tp-sidebar) / <alpha-value>)",
        "sidebar-hover": "rgb(var(--tp-sidebar-hover) / <alpha-value>)",
        primary: {
          DEFAULT: "rgb(var(--tp-primary) / <alpha-value>)",
          soft: "rgb(var(--tp-primary-soft) / <alpha-value>)",
          strong: "rgb(var(--tp-primary-strong) / <alpha-value>)",
        },
        secondary: "rgb(var(--tp-secondary) / <alpha-value>)",
        ink: "rgb(var(--tp-text) / <alpha-value>)",
        muted: "rgb(var(--tp-text-muted) / <alpha-value>)",
        line: "rgb(var(--tp-border) / <alpha-value>)",
        // `strong` adalah varian teks yang memenuhi kontras WCAG AA.
        positive: {
          DEFAULT: "rgb(var(--tp-positive) / <alpha-value>)",
          strong: "rgb(var(--tp-positive-strong) / <alpha-value>)",
        },
        warning: {
          DEFAULT: "rgb(var(--tp-warning) / <alpha-value>)",
          strong: "rgb(var(--tp-warning-strong) / <alpha-value>)",
        },
        negative: {
          DEFAULT: "rgb(var(--tp-negative) / <alpha-value>)",
          strong: "rgb(var(--tp-negative-strong) / <alpha-value>)",
        },
        neutral: {
          DEFAULT: "rgb(var(--tp-neutral) / <alpha-value>)",
          strong: "rgb(var(--tp-neutral-strong) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        // Body minimum 14px pada desktop (bagian 12 dokumen).
        base: ["0.875rem", { lineHeight: "1.45rem" }],
        sm: ["0.875rem", { lineHeight: "1.35rem" }],
        xs: ["0.75rem", { lineHeight: "1.1rem" }],
      },
      borderRadius: {
        card: "14px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(16, 24, 40, 0.04)",
        raised: "0 12px 32px rgba(16, 24, 40, 0.12)",
        drawer: "-12px 0 40px rgba(16, 24, 40, 0.14)",
      },
      keyframes: {
        "slide-in": {
          from: { transform: "translateX(16px)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "slide-in": "slide-in 180ms ease-out",
        "fade-in": "fade-in 160ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
