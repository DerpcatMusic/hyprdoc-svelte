import type { TextureDefinition } from "../types";

export const noiseTexture: TextureDefinition = {
  id: "noise",
  label: "Noise",
  generate: ({ color, opacity, scale, monochromatic }) => {
    // Higher frequency for fine grain
    const frequency = 1.5 / scale;

    const saturationMatrix = monochromatic
      ? `<feColorMatrix type="saturate" values="0"/>`
      : "";

    // We use feFlood to set the color, then composite it with the noise
    // If monochromatic is true, we desaturate the noise first
    const svg = `
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <filter id="noiseFilter">
          <feTurbulence type="fractalNoise" baseFrequency="${frequency}" numOctaves="3" stitchTiles="stitch" result="noise" />
          ${saturationMatrix}
          <feFlood flood-color="${color}" result="flood" />
          <feComposite in="flood" in2="noise" operator="arithmetic" k1="1" k2="0" k3="0" k4="0" />
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${opacity} 0"/>
        </filter>
        <rect width="100%" height="100%" filter="url(#noiseFilter)" />
      </svg>
    `.trim();

    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  },
};
