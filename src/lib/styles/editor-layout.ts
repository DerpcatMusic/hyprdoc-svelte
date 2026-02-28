export const EDITOR_PANEL_LAYOUT = {
  shell:
    "h-full w-full bg-sidebar flex flex-col overflow-hidden border-l border-border/40",
  header: "p-4 border-b border-border/40 bg-card/50",
  bodyScroll: "flex-1 overflow-y-auto custom-scrollbar",
  bodyPadded: "p-4 space-y-4 pb-20",
  footer: "px-4 py-2 border-t border-border/20 bg-card/30",
  footerMeta:
    "flex items-center justify-between text-[9px] font-medium text-muted-foreground/50 uppercase tracking-wider",
} as const;

export const EDITOR_DOCK_LAYOUT = {
  corporateShell: "h-full rounded-none border-0",
  creativeShell: "m-4 h-[calc(100%-2rem)] rounded-2xl border shadow-xl",
  drawerHeader:
    "flex h-14 shrink-0 items-center justify-between border-b border-border/40 px-4",
  drawerScroll: "flex-1 overflow-y-auto custom-scrollbar pb-20",
  expandedWidth: "w-[22rem]",
  sidebarCollapsedWidth: "w-20",
  propertiesCollapsedWidth: "w-14",
} as const;

export const EDITOR_TOPBAR_LAYOUT = {
  shell:
    "relative flex h-14 w-full shrink-0 items-center justify-between gap-3 border-b border-border/70 bg-card/90 px-4 backdrop-blur-xl supports-[backdrop-filter]:bg-card/80 z-50 transition-colors",
  leftZone: "flex min-w-0 flex-1 items-center gap-2",
  centerZone: "absolute left-1/2 flex -translate-x-1/2 items-center justify-center",
  rightZone: "flex min-w-0 flex-1 items-center justify-end gap-2",
  iconButton:
    "group flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-all hover:border-border hover:bg-muted/70 hover:text-foreground",
  titleInput:
    "h-8 w-40 rounded-lg border border-transparent bg-transparent px-2 font-semibold text-sm outline-none transition-colors hover:border-border/60 hover:bg-muted/50 focus:border-border focus:bg-muted/70 focus:ring-1 focus:ring-ring/20 md:w-60",
  statusPill:
    "hidden xl:inline-flex items-center rounded-full border border-border/70 bg-muted/50 px-2.5 py-1 text-[11px] font-medium text-muted-foreground",
  kindPill:
    "hidden md:inline-flex items-center rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground",
  modeSwitchShell:
    "flex items-center rounded-xl border border-border/70 bg-muted/40 p-1 shadow-sm",
  modeButton:
    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold text-xs transition-all",
  actionGroup: "flex items-center gap-2",
} as const;
