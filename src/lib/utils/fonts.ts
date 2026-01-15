export const GOOGLE_FONTS = [
  // Sans Serif
  { label: "Inter", value: "Inter", category: "Sans Serif" },
  { label: "Roboto", value: "Roboto", category: "Sans Serif" },
  { label: "Open Sans", value: "Open Sans", category: "Sans Serif" },
  { label: "Lato", value: "Lato", category: "Sans Serif" },
  { label: "Montserrat", value: "Montserrat", category: "Sans Serif" },
  { label: "Poppins", value: "Poppins", category: "Sans Serif" },
  { label: "Outfit", value: "Outfit", category: "Sans Serif" },

  // Serif
  { label: "Playfair Display", value: "Playfair Display", category: "Serif" },
  { label: "Merriweather", value: "Merriweather", category: "Serif" },
  { label: "Lora", value: "Lora", category: "Serif" },
  { label: "Roboto Slab", value: "Roboto Slab", category: "Serif" },

  // Monospace
  { label: "JetBrains Mono", value: "JetBrains Mono", category: "Monospace" },
  { label: "Roboto Mono", value: "Roboto Mono", category: "Monospace" },
  { label: "Fira Code", value: "Fira Code", category: "Monospace" },

  // Display/Handwriting
  { label: "Dancing Script", value: "Dancing Script", category: "Display" },
  { label: "Pacifico", value: "Pacifico", category: "Display" },
  {
    label: "Shadows Into Light",
    value: "Shadows Into Light",
    category: "Display",
  },
];

const loadedFonts = new Set<string>();

export function loadGoogleFont(fontName: string) {
  if (!fontName || loadedFonts.has(fontName)) return;

  const linkId = `font-${fontName.replace(/\s+/g, "-").toLowerCase()}`;
  if (document.getElementById(linkId)) {
    loadedFonts.add(fontName);
    return;
  }

  const link = document.createElement("link");
  link.id = linkId;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, "+")}:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap`;

  document.head.appendChild(link);
  loadedFonts.add(fontName);
}
