import { definePreset } from 'unocss'

/**
 * HyprDoc Design System Preset v2: "Avant-Garde Studio"
 */
export const presetHyprdoc = definePreset(() => {
  return {
    name: 'preset-hyprdoc',
    theme: {
      fontFamily: {
        sans: "var(--font-sans)",
        display: "var(--font-display)",
        mono: "var(--font-mono)",
      },
      colors: {
        // Semantic mapping to variables
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        "card-foreground": "var(--card-foreground)",
        popover: "var(--popover)",
        "popover-foreground": "var(--popover-foreground)",
        primary: "var(--primary)",
        "primary-foreground": "var(--primary-foreground)",
        secondary: "var(--secondary)",
        "secondary-foreground": "var(--secondary-foreground)",
        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",
        destructive: "var(--destructive)",
        "destructive-foreground": "var(--destructive-foreground)",
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        sidebar: "var(--sidebar)",
        "sidebar-foreground": "var(--sidebar-foreground)",
        "sidebar-border": "var(--sidebar-border)",
        "canvas-bg": "var(--canvas-bg)",
        document: "var(--document)",
        "surface-1": "var(--surface-1)",
        "surface-2": "var(--surface-2)",
        "surface-3": "var(--surface-3)",
        "status-info": "var(--status-info)",
        "status-info-soft": "var(--status-info-soft)",
        "status-success": "var(--status-success)",
        "status-success-soft": "var(--status-success-soft)",
        "status-warning": "var(--status-warning)",
        "status-warning-soft": "var(--status-warning-soft)",
        "status-danger": "var(--status-danger)",
        "status-danger-soft": "var(--status-danger-soft)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      // Sophisticated Animation Curves
      animation: {
        keyframes: {
            "enter": "{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}",
            "exit": "{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(10px)}}"
        },
        durations: {
            "enter": "0.4s",
            "exit": "0.3s"
        },
        timingFns: {
            "enter": "cubic-bezier(0.16, 1, 0.3, 1)", // Sweet Spring
            "exit": "ease-in"
        }
      },
    },
    shortcuts: [
      {
        // === LAYOUT PRIMITIVES ===
        "flex-center": "flex items-center justify-center",
        "flex-col-center": "flex flex-col items-center justify-center",
        "absolute-center": "absolute inset-0 m-auto",
        "full-size": "w-full h-full",
        
        // === STUDIO PANELS (SOLID, THICK BORDERS) ===
        "studio-panel": "bg-card border-2 border-border",
        "studio-panel-secondary": "bg-secondary border-2 border-border",
        "studio-button": "bg-card hover:bg-muted border-2 border-border transition-colors",

        // === TYPOGRAPHY ===
        "heading-hero": "font-display font-bold text-5xl md:text-7xl tracking-tighter leading-[0.9] text-balance",
        "heading-section": "font-display font-bold text-3xl md:text-4xl tracking-tight text-balance",
        "text-reading": "font-sans text-lg leading-relaxed text-muted-foreground",

        // === INTERACTION ===
        "hover-lift": "transition-transform duration-300 hover:-translate-y-0.5",
        "click-squish": "active:scale-95 transition-transform",
      },
    ],
    rules: [
        // Useful for optical alignment
        ['text-balance', { 'text-wrap': 'balance' }],
        ['text-pretty', { 'text-wrap': 'pretty' }],
    ]
  }
})
