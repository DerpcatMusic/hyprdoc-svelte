import type { TextureDefinition } from "../types";

export const dotsTexture: TextureDefinition = {
  id: "dots",
  label: "Dots",
  generate: ({ color, opacity, scale }) => {
    const size = 20 * scale;
    const radius = 1.5 * scale;

    const svg = `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="${color}" fill-opacity="${opacity}" />
      </svg>
    `.trim();

    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  },
};
