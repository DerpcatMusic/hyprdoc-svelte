import type { TextureDefinition } from "../types";

export const gridTexture: TextureDefinition = {
  id: "grid",
  label: "Grid",
  generate: ({ color, opacity, scale }) => {
    const size = 40 * scale;

    const svg = `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <path d="M ${size} 0 L 0 0 0 ${size}" fill="none" stroke="${color}" stroke-opacity="${opacity}" stroke-width="1"/>
      </svg>
    `.trim();

    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  },
};
