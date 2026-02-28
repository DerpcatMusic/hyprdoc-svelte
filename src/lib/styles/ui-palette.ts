export interface UiColorPreset {
  name: string;
  color: string;
}

export const HYPR_BRAND_ACCENT = "#9FE870";
export const HYPR_BRAND_ACCENT_HOVER = "#8ad65c";
export const HYPR_DEFAULT_TEXT_COLOR = "#000000";
export const HYPR_DEFAULT_PARTY_COLOR = "#3b82f6";

export const TRACK_CHANGE_COLORS = {
  insertion: "#22c55e",
  deletion: "#ef4444",
  author: "#6366f1",
} as const;

export const EDITOR_COLOR_PRESETS: UiColorPreset[] = [
  { name: "White", color: "#ffffff" },
  { name: "Light Gray", color: "#f3f4f6" },
  { name: "Gray", color: "#9ca3af" },
  { name: "Black", color: "#000000" },
  { name: "Red", color: "#ff4d4d" },
  { name: "Orange", color: "#ff9f43" },
  { name: "Yellow", color: "#feca57" },
  { name: "Green", color: "#1dd1a1" },
  { name: "Azure", color: "#00d2d3" },
  { name: "Blue", color: "#2e86de" },
  { name: "Purple", color: "#5f27cd" },
  { name: "Pink", color: "#ff9ff3" },
];

export const EDITOR_HIGHLIGHT_PRESETS: UiColorPreset[] = [
  { name: "Red", color: "#ff4d4d" },
  { name: "Orange", color: "#ff9f43" },
  { name: "Yellow", color: "#feca57" },
  { name: "Green", color: "#1dd1a1" },
  { name: "Azure", color: "#00d2d3" },
  { name: "Blue", color: "#2e86de" },
  { name: "Purple", color: "#5f27cd" },
  { name: "Pink", color: "#ff9ff3" },
];

export const UI_COLOR_PICKER_PRESETS: UiColorPreset[] = [
  { name: "Black", color: "#000000" },
  { name: "White", color: "#ffffff" },
  { name: "Red", color: "#ef4444" },
  { name: "Orange", color: "#f97316" },
  { name: "Amber", color: "#f59e0b" },
  { name: "Lime", color: "#84cc16" },
  { name: "Green", color: "#22c55e" },
  { name: "Emerald", color: "#10b981" },
  { name: "Cyan", color: "#06b6d4" },
  { name: "Sky", color: "#0ea5e9" },
  { name: "Blue", color: "#3b82f6" },
  { name: "Indigo", color: "#6366f1" },
  { name: "Violet", color: "#8b5cf6" },
  { name: "Fuchsia", color: "#d946ef" },
  { name: "Rose", color: "#f43f5e" },
  { name: "Gray", color: "#808080" },
  { name: "Neutral", color: "#525252" },
  { name: "Charcoal", color: "#171717" },
];
