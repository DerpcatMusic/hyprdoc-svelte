import type { PDFPageProxy } from "pdfjs-dist";
import type { NormalizedTextItem } from "./pdf-types";

/**
 * Extract text from a PDF page and normalize coordinates.
 */
export async function extractTextFromPage(
  page: PDFPageProxy,
  pageNumber: number
): Promise<NormalizedTextItem[]> {
  const textContent = await page.getTextContent();
  const viewport = page.getViewport({ scale: 1 });
  const { height: pageHeight } = viewport;

  return textContent.items
    .filter((item: any) => item.str.trim().length > 0)
    .map((item: any) => {
      const transform = item.transform; // [a, b, c, d, tx, ty]
      return {
        type: "text" as const,
        content: item.str,
        x: transform[4],
        y: pageHeight - transform[5], // Flip Y for top-down
        fontSize: Math.sqrt(transform[0] * transform[0] + transform[1] * transform[1]),
        isBold: item.fontName?.toLowerCase().includes("bold") || false,
        pageNumber,
      };
    });
}

/**
 * Group text items into lines based on their Y coordinate.
 */
export function groupIntoLines(items: NormalizedTextItem[]): NormalizedTextItem[][] {
  if (items.length === 0) return [];

  // Sort by Y (top to bottom), then X (left to right)
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);

  const lines: NormalizedTextItem[][] = [];
  let currentLine: NormalizedTextItem[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i];
    const prevItem = sorted[i - 1];

    // If item is on roughly the same line (within half font size)
    if (Math.abs(item.y - prevItem.y) < prevItem.fontSize * 0.5) {
      currentLine.push(item);
    } else {
      lines.push(currentLine.sort((a, b) => a.x - b.x));
      currentLine = [item];
    }
  }
  lines.push(currentLine.sort((a, b) => a.x - b.x));

  return lines;
}

/**
 * Merge a line of text items into a single string.
 */
export function mergeLineToString(line: NormalizedTextItem[]): string {
  if (line.length === 0) return "";
  
  let result = line[0].content;
  for (let i = 1; i < line.length; i++) {
    const prev = line[i - 1];
    const curr = line[i];
    
    // Add space if there's a significant gap
    const gap = curr.x - (prev.x + prev.content.length * (prev.fontSize * 0.4));
    if (gap > prev.fontSize * 0.2) {
      result += " ";
    }
    result += curr.content;
  }
  return result;
}
