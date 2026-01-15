import { dotsTexture } from "./generators/dots";
import { gridTexture } from "./generators/grid";
import { linesTexture } from "./generators/lines";
import { noiseTexture } from "./generators/noise";
import type { TextureDefinition } from "./types";

const TEXTURES: Record<string, TextureDefinition> = {
  [dotsTexture.id]: dotsTexture,
  [gridTexture.id]: gridTexture,
  [linesTexture.id]: linesTexture,
  [noiseTexture.id]: noiseTexture,
};

// Helper to get texture
export const getTextureGenerator = (
  id: string
): TextureDefinition | undefined => {
  return TEXTURES[id];
};

// Helper to get list for UI
export const getTextureOptions = () => {
  return Object.values(TEXTURES).map((t) => ({ value: t.id, label: t.label }));
};

// Default fallback
export const generateTextureCSS = (
  id: string,
  params: {
    color: string;
    opacity: number;
    scale: number;
    monochromatic?: boolean;
  }
) => {
  const texture = TEXTURES[id];
  if (!texture) return "none";

  return texture.generate(params);
};
