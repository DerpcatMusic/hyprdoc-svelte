export const TOKENS = {
  COLORS: {
    SIMULATION_BADGE: "amber-500",
    SIMULATION_BORDER: "amber-500/50",
    ERROR: "destructive",
    SUCCESS: "green-500",
    DEFAULT_SIGNER: "#000000",
  },
  LAYOUT: {
    HEADER_HEIGHT: "3.5rem", // 14
    FOOTER_HEIGHT_DESKTOP: "5rem", // 20
    FOOTER_HEIGHT_MOBILE: "6rem", // 24
  },
  ANIMATION: {
    DURATION_FAST: 0.2,
    DURATION_MEDIUM: 0.3,
    DURATION_SLOW: 0.5,
  },
  LABELS: {
    SIMULATION_MODE: "Simulation Mode",
    SIGNING_AS: "Signing As",
    PREPARING: "Preparing Document...",
    REVIEWING: "Reviewing Document",
    ALL_SET: "You're All Set",
    READY_MSG: "Document ready to sign & seal.",
    REQ_BADGE: "REQ",
  },
} as const;
