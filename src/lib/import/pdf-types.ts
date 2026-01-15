/**
 * PDF Import Types
 *
 * TypeScript definitions for the PDF import pipeline.
 * Keeps type safety across all modules.
 */



// ═══════════════════════════════════════════════════════════════════════════
// PDF.js Types (Simplified subset we actually use)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Simplified annotation from pdfjs-dist getAnnotations()
 */
export interface PDFAnnotation {
  id: string;
  subtype: string;
  fieldType?: "Tx" | "Btn" | "Ch" | "Sig";
  fieldName?: string;
  fieldValue?: string | boolean;
  alternativeText?: string;
  defaultFieldValue?: string;

  // Text field specific
  multiLine?: boolean;
  maxLen?: number;

  // Button (Checkbox/Radio) specific
  checkBox?: boolean;
  radioButton?: boolean;
  buttonValue?: string;

  // Choice (Select/Dropdown) specific
  options?: Array<{ exportValue: string; displayValue: string }>;
  combo?: boolean; // true = dropdown, false = listbox

  // Flags
  required?: boolean;
  readOnly?: boolean;

  // Position (PDF coordinates - Y from bottom)
  rect: [number, number, number, number]; // [x1, y1, x2, y2]
}

/**
 * Text item from pdfjs-dist getTextContent()
 */
export interface PDFTextItem {
  str: string;
  dir: string;
  width: number;
  height: number;
  transform: [number, number, number, number, number, number]; // [a, b, c, d, x, y]
  fontName: string;
  hasEOL: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// Intermediate Processing Types
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Normalized content item (text or field) with unified positioning
 */
export interface NormalizedItem {
  type: "text" | "field";
  y: number; // Normalized Y (top-down, 0 = top of page)
  x: number;
  pageNumber: number;
}

export interface NormalizedTextItem extends NormalizedItem {
  type: "text";
  content: string;
  fontSize: number;
  isBold: boolean;
}



export type ContentItem = NormalizedTextItem;

// ═══════════════════════════════════════════════════════════════════════════
// Tiptap Output Types
// ═══════════════════════════════════════════════════════════════════════════



/**
 * Tiptap text node
 */
export interface TiptapTextNode {
  type: "text";
  text: string;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

/**
 * Tiptap paragraph node
 */
export interface TiptapParagraphNode {
  type: "paragraph";
  content?: TiptapTextNode[];
}

/**
 * Tiptap heading node
 */
export interface TiptapHeadingNode {
  type: "heading";
  attrs: { level: 1 | 2 | 3 | 4 | 5 | 6 };
  content?: TiptapTextNode[];
}

/**
 * Any Tiptap block-level node
 */
export type TiptapBlockNode =
  | TiptapParagraphNode
  | TiptapHeadingNode
  | TiptapBulletList
  | TiptapOrderedList;

export interface TiptapListItem {
  type: "listItem";
  content: TiptapBlockNode[];
}

export interface TiptapBulletList {
  type: "bulletList";
  content: TiptapListItem[];
}

export interface TiptapOrderedList {
  type: "orderedList";
  attrs?: { start?: number };
  content: TiptapListItem[];
}

/**
 * Complete Tiptap document
 */
export interface TiptapDocument {
  type: "doc";
  content: TiptapBlockNode[];
}

// ═══════════════════════════════════════════════════════════════════════════
// Parser Result
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Result from PDF parsing operation
 */
export interface PDFParseResult {
  success: boolean;
  document: TiptapDocument;
  metadata: {
    pageCount: number;
    fieldCount: number;
    textBlockCount: number;
    slots: string[];
  };
  errors: string[];
}
