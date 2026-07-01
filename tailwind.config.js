import tailwindcssAnimate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "hsl(var(--bg) / <alpha-value>)",
        surface: "hsl(var(--surface) / <alpha-value>)",
        "surface-2": "hsl(var(--surface-2) / <alpha-value>)",
        border: "hsl(var(--border) / <alpha-value>)",
        accent: "hsl(var(--accent) / <alpha-value>)",
        "accent-2": "hsl(var(--accent-2) / <alpha-value>)",
        text: "hsl(var(--text) / <alpha-value>)",
        "text-muted": "hsl(var(--text-muted) / <alpha-value>)",
        danger: "hsl(var(--danger) / <alpha-value>)",
        // App-mode: stati semantici
        success: "hsl(var(--success) / <alpha-value>)",
        warning: "hsl(var(--warning) / <alpha-value>)",
        info: "hsl(var(--info) / <alpha-value>)",
        // App-mode: palette dati (grafici/progressi)
        "chart-1": "hsl(var(--chart-1) / <alpha-value>)",
        "chart-2": "hsl(var(--chart-2) / <alpha-value>)",
        "chart-3": "hsl(var(--chart-3) / <alpha-value>)",
        "chart-4": "hsl(var(--chart-4) / <alpha-value>)",
      },
      ringColor: {
        DEFAULT: "hsl(var(--accent))",
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
        full: "9999px",
      },
      boxShadow: {
        base: "0 4px 24px rgba(0,0,0,0.4)",
        "glow-neon": "0 0 16px rgba(57,255,20,0.35)",
        "glow-soft": "0 0 8px rgba(57,255,20,0.2)",
      },
      fontFamily: {
        display: ["Impact", "Arial Black", "system-ui", "sans-serif"],
        body: ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
      fontSize: {
        hero: ["clamp(2.5rem, 8vw, 4.5rem)", { lineHeight: "1.05", letterSpacing: "-0.02em" }],
        display: ["clamp(1.75rem, 4vw, 2.25rem)", { lineHeight: "1.15", letterSpacing: "-0.01em" }],
      },
      spacing: {
        section: "6rem", // 96px — padding verticale sezioni desktop
      },
      backgroundImage: {
        "neon-gradient": "linear-gradient(135deg, hsl(var(--accent)), hsl(var(--accent-2)))",
      },
      keyframes: {
        "neon-breathe": {
          "0%, 100%": { boxShadow: "0 0 8px rgba(57,255,20,0.2)" },
          "50%": { boxShadow: "0 0 20px rgba(57,255,20,0.45)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "neon-breathe": "neon-breathe 2.5s ease-in-out infinite",
        shimmer: "shimmer 1.5s infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
