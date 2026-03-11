export const FONTSHARE_FONTS = [
  "gambetta", "synonym", "rowan", "general-sans", "technor", "sentient", 
  "boska", "switzer", "tabular", "expose", "pilcrow-rounded", "melodrama", 
  "new-title", "alpino", "amulya", "author", "bespoke-sans", "bespoke-serif", 
  "bespoke-slab", "bespoke-stencil", "clash-grotesk", "clash-display", 
  "chubbo", "chillax", "cabinet-grotesk", "britney", "bonny", "bevellier", 
  "archivo", "poppins", "dancing-script", "be-vietnam-pro", "fira-sans", 
  "jet-brains-mono", "public-sans", "epilogue", "crimson-pro", "spline-sans", 
  "nunito", "asap", "lora", "plus-jakarta-sans", "azeret-mono", "outfit", 
  "work-sans", "manrope", "oswald", "montserrat", "familjen-grotesk", "neco", 
  "excon", "hoover", "hind", "panchang", "pally", "roundo", "nippo", "erode", 
  "kalam", "space-grotesk", "pramukh-rounded", "rajdhani", "plein", "telma", 
  "recia", "quilon", "sharpie", "zodiak", "styro", "supreme", "khand", 
  "paquito", "satoshi", "rx-100", "trench-slab", "ranade", "red-hat-display", 
  "sora", "literata", "merriweather-sans", "quicksand", "teko", "karma", "inter"
];

// Helper to format font names for display (kebab-case to Title Case)
export function formatFontName(slug: string) {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export const FONT_OPTIONS = FONTSHARE_FONTS.map(slug => ({
  value: slug,
  label: formatFontName(slug)
})).sort((a, b) => a.label.localeCompare(b.label));
