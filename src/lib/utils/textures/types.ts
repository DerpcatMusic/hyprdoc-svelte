export interface TextureParams {
  color: string;
  opacity: number;
  scale: number;
  monochromatic?: boolean;
}

export interface TextureDefinition {
  id: string;
  label: string;
  generate: (params: TextureParams) => string;
}
