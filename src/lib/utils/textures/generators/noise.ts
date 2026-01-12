import type { TextureDefinition } from "../types";

export const noiseTexture: TextureDefinition = {
  id: "noise",
  label: "Noise",
  generate: ({ color: _color, opacity, scale, monochromatic }) => {
    // Higher frequency for fine grain
    const frequency = 1.5 / scale;

    const saturationMatrix = monochromatic ? `<feColorMatrix type="saturate" values="0"/>` : "";

    // We use feFlood to set the color, then composite it with the noise
    // If monochromatic is true, we desaturate the noise first
    const svg = `
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <filter id="noiseFilter">
          <feTurbulence type="fractalNoise" baseFrequency="${frequency}" numOctaves="3" stitchTiles="stitch"/>
          ${saturationMatrix}
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${opacity} 0"/>
        </filter>
        <rect width="100%" height="100%" filter="url(#noiseFilter)" opacity="${opacity}"/>
      </svg>
    `.trim();

    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  },
};
