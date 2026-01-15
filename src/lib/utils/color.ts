/**
 * Calculates the YIQ contrast to determine if text should be black or white
 * based on the provided background color.
 *
 * @param hexcolor - The background color in HEX format (e.g., #ffffff)
 * @returns '#000000' for light backgrounds, '#ffffff' for dark backgrounds
 */
export const getContrastColor = (hexcolor: string): string => {
  if (!hexcolor) {
    return "#000000";
  }

  // Handle specific CSS variables if passed loosely (fallback)
  if (hexcolor.startsWith("hsl") || hexcolor.startsWith("var")) {
    return "currentColor";
  }

  // Remove hash
  const hex = hexcolor.replace("#", "");

  // Handle short hex (e.g., #fff)
  const fullHex =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex;

  try {
    const r = Number.parseInt(fullHex.slice(0, 2), 16);
    const g = Number.parseInt(fullHex.slice(2, 4), 16);
    const b = Number.parseInt(fullHex.slice(4, 6), 16);

    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
      return "#000000";
    }

    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? "#000000" : "#ffffff";
  } catch {
    return "#000000";
  }
};

/**
 * Returns a semi-transparent version of a hex color for borders/backgrounds
 */
export const hexToRgba = (hex: string, alpha: number): string => {
  const color = hex.replace("#", "");
  const fullHex =
    color.length === 3
      ? color
          .split("")
          .map((c) => c + c)
          .join("")
      : color;

  const r = Number.parseInt(fullHex.slice(0, 2), 16);
  const g = Number.parseInt(fullHex.slice(2, 4), 16);
  const b = Number.parseInt(fullHex.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * Calculates hue value (0-360) from a hex color string
 */
export const getHueFromHex = (hex: string): number => {
  // Remove # if present
  const cleanHex = hex.replace(/^#/, "");

  // Handle short hex
  const fullHex =
    cleanHex.length === 3
      ? cleanHex
          .split("")
          .map((c) => c + c)
          .join("")
      : cleanHex;

  // Parse RGB
  const r = Number.parseInt(fullHex.slice(0, 2), 16) / 255;
  const g = Number.parseInt(fullHex.slice(2, 4), 16) / 255;
  const b = Number.parseInt(fullHex.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;

  if (max !== min) {
    const d = max - min;
    switch (max) {
      case r: {
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      }
      case g: {
        h = ((b - r) / d + 2) / 6;
        break;
      }
      case b: {
        h = ((r - g) / d + 4) / 6;
        break;
      }
    }
  }

  return Math.round(h * 360);
};
