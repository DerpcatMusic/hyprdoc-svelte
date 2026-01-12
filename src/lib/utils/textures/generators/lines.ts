import type { TextureDefinition } from "../types";

export const linesTexture: TextureDefinition = {
  id: "lines",
  label: "Lines",
  generate: ({ color, opacity, scale }) => {
    const size = 20 * scale;
    const svg = `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <path d="M-1,1 l2,-2 M0,${size} l${size},-${size} M${size - 1},${size + 1} l2,-2" 
              stroke="${color}" 
              stroke-opacity="${opacity}" 
              stroke-width="${1 * scale}" />
      </svg>
    `.trim();

    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  },
};
