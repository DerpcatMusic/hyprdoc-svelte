import { browser } from "$app/environment";
import { formatFontName } from "./fonts";

/**
 * Dynamically loads a font from Fontshare or Google Fonts if not already present.
 */
export function loadFont(slug: string) {
  if (!browser) return;

  const fontId = `font-load-${slug}`;
  if (document.getElementById(fontId)) return;

  // Determine source
  // For this project, we assume Fontshare for most slugs, 
  // but some might be Google Fonts. 
  // We'll prioritize Fontshare for the slugs in our list.
  
  let url = "";
  
  // Fontshare URL construction
  url = `https://api.fontshare.com/v2/css?f[]=${slug}@1,2&display=swap`;
  
  // If it's a known Google Font (like Inter, Rajdhani, etc.), we might not need to do anything 
  // if they are in app.html, but let's be safe.
  const googleFonts = ['inter', 'rajdhani', 'manrope', 'space-grotesk', 'jetbrains-mono'];
  if (googleFonts.includes(slug.toLowerCase())) {
     const name = formatFontName(slug).replace(" ", "+");
     url = `https://fonts.googleapis.com/css2?family=${name}:wght@400;700&display=swap`;
  }

  const link = document.createElement("link");
  link.id = fontId;
  link.rel = "stylesheet";
  link.href = url;
  
  document.head.appendChild(link);
}
