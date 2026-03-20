import type { Config } from "tailwindcss";

/**
 * Tailwind CSS preset compartido — Colores institucionales UPDS
 *
 * Paleta institucional:
 *  - Azul Marino (primary)   : #002B5C — color principal, headers, botones primarios
 *  - Celeste (secondary)     : #4A90D9 — acentos, enlaces, badges
 *  - Azul Claro (accent)     : #A3C4F3 — fondos suaves, hover states, cards
 *  - Blanco (background)     : #FFFFFF — fondo general, texto sobre oscuro
 *
 * Se integra con Shadcn UI via CSS variables (ver globals.css).
 */
const uiPreset: Config = {
  content: [],
  theme: {
    extend: {
      colors: {
        /* ── Colores institucionales UPDS ── */
        upds: {
          navy: {
            DEFAULT: "#002B5C",
            50: "#E6EEF7",
            100: "#C0D4EA",
            200: "#8AADD4",
            300: "#5486BE",
            400: "#2E68AC",
            500: "#002B5C",
            600: "#002450",
            700: "#001C3D",
            800: "#00142B",
            900: "#000D1C",
          },
          sky: {
            DEFAULT: "#4A90D9",
            50: "#EDF4FC",
            100: "#D4E5F8",
            200: "#B0CFF1",
            300: "#8BB9EA",
            400: "#6AA5E2",
            500: "#4A90D9",
            600: "#2A74C1",
            700: "#205A96",
            800: "#17406B",
            900: "#0E2740",
          },
          light: {
            DEFAULT: "#A3C4F3",
            50: "#F5F8FE",
            100: "#E8F0FC",
            200: "#D1E2F9",
            300: "#BAD3F6",
            400: "#A3C4F3",
            500: "#7EADEF",
            600: "#5996EB",
            700: "#347FE7",
            800: "#1B69D4",
            900: "#1553A9",
          },
          white: "#FFFFFF",
        },

        /* ── Shadcn UI semantic tokens (CSS variables) ── */
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default uiPreset;
