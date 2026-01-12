/**
 * Tiptap to PDF Export
 *
 * Converts Tiptap JSON documents to PDF with interactive AcroForm fields.
 * Uses pdf-lib to create fillable forms with slot-prefixed field names.
 */

import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type { Slot, SmartBlockData } from "$lib/types";
import { SmartBlockType } from "$lib/types";

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

/** Internal view of a Tiptap node for processing */
interface TiptapNode {
  type: string;
  attrs?: Record<string, any>;
  content?: TiptapNode[];
  text?: string;
  marks?: Array<{ type: string; attrs?: Record<string, any> }>;
}

/** 
 * Export-optimized Block type.
 * Extends global block data with PDF-specific fields.
 */
interface Block extends SmartBlockData {
  signatureData?: string;
}

export interface SignerSummary {
  legalName: string;
  email: string;
  role?: string;
  signedAt?: number;
  ipAddress?: string;
  userAgent?: string;
  signatureData?: string; // Base64 image data URL
}

interface ExportOptions {
  /** Document title for PDF metadata */
  title?: string;
  /** Include page numbers */
  pageNumbers?: boolean;
  /** Margin in points */
  margin?: number;
  /** Flatten form fields (makes PDF non-editable) */
  flatten?: boolean;
  /** Signature summary details to append at the end */
  signatureSummary?: SignerSummary[];
}

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

const PAGE_WIDTH = 612; // Letter size
const PAGE_HEIGHT = 792;
const DEFAULT_MARGIN = 50;
const LINE_HEIGHT = 14;
const FIELD_HEIGHT = 20;
const SIGNATURE_HEIGHT = 50;
const HIGHLIGHT_OPACITY = 0.2; // Standardized opacity for legal proof matching

// Font CDN URLs - Using Noto Sans with full Unicode support
// Primary: Full Noto Sans from Google Fonts CDN (includes Hebrew, Arabic, Cyrillic)
// Google Fonts - Noto Sans (Full multilingual support including Hebrew)
const _FONT_REGULAR_URL = "https://fonts.gstatic.com/s/notosans/v30/o-0IIpQlx3QUlC5A4PNr5TRG.ttf";
const _FONT_BOLD_URL = "https://fonts.gstatic.com/s/notosans/v30/o-0NIpQlx3QUlC5A4PNjXhFVZjyE.ttf";

// Hebrew specific (if Noto Sans doesn't cover it well enough, but the above usually does)
const _FONT_HEBREW_REGULAR_URL =
  "https://fonts.gstatic.com/s/notosanshebrew/v52/4icsSTKs47yS59Sgl8H7cT8sJh8.ttf";
const _FONT_HEBREW_BOLD_URL =
  "https://fonts.gstatic.com/s/notosanshebrew/v52/4icqSTKs47yS59Sgl8H7cT8sJhs8-4M.ttf";

// ═══════════════════════════════════════════════════════════════════════════
// RTL (Right-to-Left) Text Support
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Helper: Convert Hex to PDF RGB
 */
function hexToRgb(hex: string, _opacity = 1) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) { return rgb(0.8, 0.8, 0.8); // Gray fallback
}
  return rgb(
    Number.parseInt(result[1], 16) / 255,
    Number.parseInt(result[2], 16) / 255,
    Number.parseInt(result[3], 16) / 255
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// RTL (Right-to-Left) Text Support
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if text contains RTL characters (Hebrew, Arabic, Persian, etc.)
 * Hebrew: U+0590–U+05FF
 * Arabic: U+0600–U+06FF, U+0750–U+077F
 */
function containsRTL(text: string): boolean {
  return /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F]/.test(text);
}

/**
 * Check if text is predominantly RTL
 * Returns true if more than 50% of alphabetic characters are RTL
 */
function isPredominantlyRTL(text: string): boolean {
  const rtlChars = (text.match(/[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F]/g) || []).length;
  const ltrChars = (text.match(/[a-zA-Z]/g) || []).length;
  return rtlChars > ltrChars;
}

/**
 * Visually reorder RTL text for pdf-lib rendering
 * pdf-lib doesn't support native RTL, so we reverse character order
 * for visual correctness when rendered left-to-right
 */
function visualReorderForPdfLib(text: string): string {
  if (!containsRTL(text)) { return text; }

  // Split into segments of RTL and LTR text
  const segments: { text: string; isRTL: boolean }[] = [];
  let currentSegment = "";
  let currentIsRTL = false;

  for (const char of text) {
    const charIsRTL = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F]/.test(char);
    const isNeutral = /[\s\d.,!?:;'"()[\]{}]/.test(char);

    if (currentSegment === "") {
      currentSegment = char;
      currentIsRTL = charIsRTL;
    } else if (isNeutral || charIsRTL === currentIsRTL) {
      currentSegment += char;
    } else {
      segments.push({ text: currentSegment, isRTL: currentIsRTL });
      currentSegment = char;
      currentIsRTL = charIsRTL;
    }
  }
  if (currentSegment) {
    segments.push({ text: currentSegment, isRTL: currentIsRTL });
  }

  // Reverse RTL segments and reverse overall order if predominantly RTL
  const processedSegments = segments.map((seg) => ({
    text: seg.isRTL ? seg.text.split("").reverse().join("") : seg.text,
    isRTL: seg.isRTL,
  }));

  // If predominantly RTL, reverse the segment order
  if (isPredominantlyRTL(text)) {
    processedSegments.reverse();
  }

  return processedSegments.map((s) => s.text).join("");
}

// ═══════════════════════════════════════════════════════════════════════════
// Text Extraction
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Sanitize text for PDF rendering.
 * Handles checkbox characters and RTL text reordering.
 */
function cleanText(text: string): string {
  const sanitized = text.replace(/☐/g, "[ ]").replace(/☑/g, "[x]");
  return visualReorderForPdfLib(sanitized);
}

/**
 * Extract plain text from a Tiptap node (with nested content)
 */
function extractText(node: TiptapNode): string {
  if (node.text) { return cleanText(node.text); }
  if (!node.content) { return ""; }
  return node.content.map(extractText).join("");
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Export Function
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Export Tiptap document to PDF with AcroForm fields
 *
 * @param content - Tiptap JSON document
 * @param slots - Array of slots for field naming
 * @param blocks - Array of block metadata with slot assignments
 * @param options - Export options
 * @returns PDF as Uint8Array
 */
export async function exportTiptapToPdf(
  content: TiptapNode,
  slots: Slot[],
  blocks: Block[],
  options: ExportOptions = {}
): Promise<Uint8Array> {
  const { title = "Document", margin = DEFAULT_MARGIN } = options;

  console.log("[PDF Export] Starting export...");
  console.log("[PDF Export] Title:", title);
  console.log("[PDF Export] Slots count:", slots.length);
  console.log("[PDF Export] Blocks count:", blocks.length);
  console.log("[PDF Export] Content nodes:", content.content?.length || 0);

  // Log block types for debugging
  if (content.content) {
    const nodeTypeCounts: Record<string, number> = {};
    for (const node of content.content) {
      nodeTypeCounts[node.type] = (nodeTypeCounts[node.type] || 0) + 1;
    }
    console.log("[PDF Export] Node type breakdown:", nodeTypeCounts);
  }

  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(title);
  pdfDoc.setCreator("HyprDoc");
  pdfDoc.setProducer("HyprDoc PDF Export");

  // Register fontkit for custom font embedding (enables Unicode support)
  pdfDoc.registerFontkit(fontkit);

  // Load and embed fonts with Hebrew/RTL support
  // Priority: Hebrew fonts (include Latin) -> Standard Noto Sans -> Fallback
  let font: Awaited<ReturnType<typeof pdfDoc.embedFont>>;
  let boldFont: Awaited<ReturnType<typeof pdfDoc.embedFont>>;

  // Use standard built-in fonts for maximum reliability
  font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  console.log("[PDF Export] Using standard Helvetica fonts");

  const form = pdfDoc.getForm();

  // Slot lookup map
  const slotMap = new Map<string, Slot>();
  for (const slot of slots) {
    slotMap.set(slot.id, slot);
  }

  // Block lookup map
  const blockMap = new Map<string, Block>();
  for (const block of blocks) {
    blockMap.set(block.id, block);
  }

  // Page state
  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - margin;
  const usableWidth = PAGE_WIDTH - margin * 2;

  /**
   * Add a new page if we're running out of space
   */
  const ensureSpace = (neededHeight: number) => {
    if (y - neededHeight < margin) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - margin;
    }
  };

  // Track used field names to ensure uniqueness
  const usedFieldNames = new Map<string, number>();

  // ─────────────────────────────────────────────────────────────────────────
  // SIGNER LEGEND (Top of First Page)
  // ─────────────────────────────────────────────────────────────────────────

  if (slots.length > 0) {
    y -= 10;

    // Title
    page.drawText("Participants", {
      x: margin,
      y,
      size: 11,
      font: boldFont,
      color: rgb(0.3, 0.3, 0.3),
    });

    y -= 20;

    // Draw each signer
    for (const slot of slots) {
      const slotColor = slot.color || "#cccccc";
      const slotName = slot.name;
      const slotInitials = slot.initials || "?";

      // Box
      page.drawRectangle({
        x: margin,
        y,
        width: 12,
        height: 12,
        color: hexToRgb(slotColor),
        opacity: HIGHLIGHT_OPACITY, // Match field opacity
        borderColor: rgb(0.6, 0.6, 0.6),
        borderWidth: 0.5,
      });

      // Name
      page.drawText(visualReorderForPdfLib(slotName), {
        x: margin + 20,
        y: y + 2,
        size: 10,
        font,
        color: rgb(0.2, 0.2, 0.2),
      });

      // (Optional) Email/Phone if available in slot object
      // Assuming slot might extend custom props not in interface, otherwise just name for now

      y -= 18;
    }

    // Add spacer line
    y -= 10;
    page.drawLine({
      start: { x: margin, y },
      end: { x: PAGE_WIDTH - margin, y },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    });
    y -= 25;
  }

  /**
   * Generate AcroForm field name with slot prefix
   * Ensures uniqueness by appending a counter if the name is already taken
   */
  const getFieldName = (blockId: string, label: string): string => {
    const block = blockMap.get(blockId);
    let baseName = label.replace(/[^a-zA-Z0-9]/g, "_");

    if (block?.slotId) {
      const slot = slotMap.get(block.slotId);
      if (slot) {
        // Sanitize slot name for PDF field naming
        const sanitizedSlot = slot.name.replace(/[^a-zA-Z0-9]/g, "_");
        baseName = `${sanitizedSlot}.${baseName}`;
      }
    }

    // Deduplicate
    const count = usedFieldNames.get(baseName) || 0;
    usedFieldNames.set(baseName, count + 1);

    if (count > 0) {
      return `${baseName}_${count + 1}`;
    }
    return baseName;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Process Content
  // ─────────────────────────────────────────────────────────────────────────

  const nodes = content.content || [];

  for (const node of nodes) {
    switch (node.type) {
      // ───────────────────────────────────────────────────────────────────
      // Text Content
      // ───────────────────────────────────────────────────────────────────

      case "paragraph": {
        const text = extractText(node);
        if (!text.trim()) {
          y -= LINE_HEIGHT / 2; // Empty paragraph = half line break
          break;
        }

        ensureSpace(LINE_HEIGHT);

        // Check if text is RTL for alignment
        const isRTL = isPredominantlyRTL(text);

        // Simple word wrapping
        const words = text.split(" ");
        let line = "";
        const fontSize = 11;

        for (const word of words) {
          const testLine = line ? `${line} ${word}` : word;
          const testWidth = font.widthOfTextAtSize(testLine, fontSize);

          if (testWidth > usableWidth && line) {
            ensureSpace(LINE_HEIGHT);
            const lineWidth = font.widthOfTextAtSize(line, fontSize);
            // RTL text: right-align, LTR text: left-align
            const xPos = isRTL ? PAGE_WIDTH - margin - lineWidth : margin;
            page.drawText(line, { x: xPos, y, size: fontSize, font });
            y -= LINE_HEIGHT;
            line = word;
          } else {
            line = testLine;
          }
        }

        if (line) {
          ensureSpace(LINE_HEIGHT);
          const lineWidth = font.widthOfTextAtSize(line, fontSize);
          const xPos = isRTL ? PAGE_WIDTH - margin - lineWidth : margin;
          page.drawText(line, { x: xPos, y, size: fontSize, font });
          y -= LINE_HEIGHT;
        }

        y -= LINE_HEIGHT * 0.3; // Paragraph spacing
        break;
      }

      case "heading": {
        const level = (node.attrs?.level as number) || 1;
        const text = extractText(node);
        const fontSize = Math.max(20 - level * 3, 12);

        ensureSpace(fontSize + LINE_HEIGHT);
        y -= LINE_HEIGHT * 0.5; // Extra space before heading

        // RTL heading alignment
        const isRTL = isPredominantlyRTL(text);
        const textWidth = boldFont.widthOfTextAtSize(text, fontSize);
        const xPos = isRTL ? PAGE_WIDTH - margin - textWidth : margin;

        page.drawText(text, { x: xPos, y, size: fontSize, font: boldFont });
        y -= fontSize + LINE_HEIGHT * 0.3;
        break;
      }

      // ───────────────────────────────────────────────────────────────────
      // Smart Blocks → AcroForm Fields
      // ───────────────────────────────────────────────────────────────────

      case "smartBlock": {
        const blockId = node.attrs?.id as string;
        const blockType = node.attrs?.type as string;
        const label = (node.attrs?.label as string) || "Field";
        const options = (node.attrs?.options as string[]) || [];

        console.log(
          `[PDF Export] Processing smartBlock: type="${blockType}", id="${blockId}", label="${label}"`
        );

        const fieldName = getFieldName(blockId, label);

        // Lookup visual slot color
        const assignedSlot = blockMap.get(blockId)?.slotId
          ? slotMap.get(blockMap.get(blockId)?.slotId!)
          : null;
        const backgroundColor = assignedSlot?.color ? hexToRgb(assignedSlot.color) : undefined;

        // Draw label
        ensureSpace(FIELD_HEIGHT + LINE_HEIGHT);
        page.drawText(`${cleanText(label)}:`, {
          x: margin,
          y,
          size: 10,
          font,
          color: rgb(0.3, 0.3, 0.3),
        });
        y -= 12;

        // Create appropriate form field
        switch (blockType) {
          case SmartBlockType.SMART_TEXT:
          case SmartBlockType.EMAIL:
          case SmartBlockType.SMART_NUMBER: {
            const tf = form.createTextField(fieldName);
            const val = node.attrs?.value;
            if (val !== undefined && val !== null) {
              tf.setText(String(val));
            }
            tf.addToPage(page, {
              x: margin,
              y: y - FIELD_HEIGHT + 5,
              width: usableWidth * 0.6,
              height: FIELD_HEIGHT,
              borderWidth: 1,
              borderColor: rgb(0.8, 0.8, 0.8),
              backgroundColor: backgroundColor || undefined,
            });
            y -= FIELD_HEIGHT + 8;
            break;
          }

          case SmartBlockType.LONG_TEXT: {
            const tf = form.createTextField(fieldName);
            tf.enableMultiline();
            const val = node.attrs?.value;
            if (val !== undefined && val !== null) {
              tf.setText(String(val));
            }
            tf.addToPage(page, {
              x: margin,
              y: y - FIELD_HEIGHT * 3 + 5,
              width: usableWidth * 0.8,
              height: FIELD_HEIGHT * 3,
              borderWidth: 1,
              borderColor: rgb(0.8, 0.8, 0.8),
              backgroundColor: backgroundColor || undefined,
            });
            y -= FIELD_HEIGHT * 3 + 8;
            break;
          }

          case SmartBlockType.CHECKBOX: {
            const cb = form.createCheckBox(fieldName);
            const val = node.attrs?.value;
            if (val === true || val === "true") {
              cb.check();
            }
            cb.addToPage(page, {
              x: margin,
              y: y - 15,
              width: 15,
              height: 15,
              borderWidth: 1,
              borderColor: rgb(0.6, 0.6, 0.6),
              backgroundColor: backgroundColor || undefined,
            });
            y -= 25;
            break;
          }

          case SmartBlockType.SELECT: {
            if (options.length > 0) {
              const dd = form.createDropdown(fieldName);
              dd.addOptions(options);
              const val = node.attrs?.value;
              if (val && options.includes(String(val))) {
                dd.select(String(val));
              }
              dd.addToPage(page, {
                x: margin,
                y: y - FIELD_HEIGHT + 5,
                width: usableWidth * 0.4,
                height: FIELD_HEIGHT,
                borderWidth: 1,
                borderColor: rgb(0.8, 0.8, 0.8),
                backgroundColor: backgroundColor || undefined,
              });
            }
            y -= FIELD_HEIGHT + 8;
            break;
          }

          case SmartBlockType.RADIO_GROUP: {
            if (options.length > 0) {
              const rg = form.createRadioGroup(fieldName);
              const val = node.attrs?.value;

              // We must render options first before selecting
              for (let i = 0; i < options.length; i++) {
                const optY = y - 20 - i * 22;
                ensureSpace(22);
                rg.addOptionToPage(options[i], page, {
                  x: margin,
                  y: optY,
                  width: 15,
                  height: 15,
                });
                page.drawText(options[i], {
                  x: margin + 22,
                  y: optY + 3,
                  size: 10,
                  font,
                });
              }

              if (val && options.includes(String(val))) {
                try {
                  rg.select(String(val));
                } catch (_e) {
                  // Ignore if option not found or other PDF-lib quirks
                }
              }

              y -= 20 + options.length * 22 + 8;
            }
            break;
          }

          case SmartBlockType.DATE_PICKER: {
            const tf = form.createTextField(fieldName);
            const val = node.attrs?.value;
            if (val) {
              try {
                const dateObj = new Date(String(val));
                if (Number.isNaN(dateObj.getTime())) {
                  tf.setText(String(val));
                } else {
                  tf.setText(dateObj.toISOString().split("T")[0]);
                }
              } catch {
                tf.setText(String(val));
              }
            }
            tf.addToPage(page, {
              x: margin,
              y: y - FIELD_HEIGHT + 5,
              width: 120,
              height: FIELD_HEIGHT,
              borderWidth: 1,
              borderColor: rgb(0.8, 0.8, 0.8),
              backgroundColor: backgroundColor || undefined,
            });
            y -= FIELD_HEIGHT + 8;
            break;
          }

          case SmartBlockType.SIGNATURE: {
            // Draw signature placeholder box
            ensureSpace(SIGNATURE_HEIGHT + 10);
            page.drawRectangle({
              x: margin,
              y: y - SIGNATURE_HEIGHT,
              width: 200,
              height: SIGNATURE_HEIGHT,
              borderColor: rgb(0.6, 0.6, 0.6),
              borderWidth: 1,
            });
            page.drawText("X", {
              x: margin + 10,
              y: y - SIGNATURE_HEIGHT + 10,
              size: 12,
              font,
              color: rgb(0.5, 0.5, 0.5),
            });
            y -= SIGNATURE_HEIGHT + 15;
            break;
          }

          case SmartBlockType.RATING: {
            // Rating dropdown selector
            ensureSpace(FIELD_HEIGHT + 10);
            const ratingMax = (node.attrs?.ratingMax as number) || 5;
            const ratingOptions = Array.from({ length: ratingMax }, (_, i) => `${i + 1}`);

            const ratingDropdown = form.createDropdown(fieldName);
            ratingDropdown.addOptions(ratingOptions);
            ratingDropdown.addToPage(page, {
              x: margin,
              y: y - FIELD_HEIGHT + 5,
              width: 60,
              height: FIELD_HEIGHT,
              borderWidth: 1,
              borderColor: rgb(0.8, 0.8, 0.8),
            });

            // Draw rating scale indicator
            page.drawText(`(1-${ratingMax} scale)`, {
              x: margin + 70,
              y: y - FIELD_HEIGHT + 8,
              size: 9,
              font,
              color: rgb(0.5, 0.5, 0.5),
            });

            y -= FIELD_HEIGHT + 8;
            break;
          }

          case SmartBlockType.FORMULA: {
            // Draw formula as computed field (read-only display)
            ensureSpace(FIELD_HEIGHT);
            const formulaLabel = `${label}: [Computed]`;
            page.drawText(cleanText(formulaLabel), {
              x: margin,
              y: y - 10,
              size: 10,
              font,
              color: rgb(0.3, 0.3, 0.8),
            });
            y -= FIELD_HEIGHT + 8;
            break;
          }

          case SmartBlockType.SECTION_HEADER: {
            // Draw section header as bold text
            ensureSpace(FIELD_HEIGHT * 1.5);
            y -= 5;
            page.drawText(cleanText(label), {
              x: margin,
              y,
              size: 14,
              font: boldFont,
              color: rgb(0.1, 0.1, 0.1),
            });
            y -= FIELD_HEIGHT * 1.5;
            break;
          }

          case SmartBlockType.DIVIDER: {
            // Draw horizontal line
            ensureSpace(LINE_HEIGHT * 2);
            y -= LINE_HEIGHT;
            page.drawLine({
              start: { x: margin, y },
              end: { x: PAGE_WIDTH - margin, y },
              thickness: 0.5,
              color: rgb(0.7, 0.7, 0.7),
            });
            y -= LINE_HEIGHT;
            break;
          }

          case SmartBlockType.CALLOUT: {
            // Draw callout as indented text with left border
            ensureSpace(FIELD_HEIGHT * 2);
            page.drawRectangle({
              x: margin,
              y: y - FIELD_HEIGHT * 1.5,
              width: 3,
              height: FIELD_HEIGHT * 1.5,
              color: rgb(0.3, 0.5, 0.8),
            });
            page.drawText(cleanText(label || "Note"), {
              x: margin + 10,
              y: y - 10,
              size: 10,
              font,
              color: rgb(0.3, 0.3, 0.3),
            });
            y -= FIELD_HEIGHT * 2;
            break;
          }

          case SmartBlockType.FILE_UPLOAD:
          case SmartBlockType.IMAGE_UPLOAD: {
            // Draw upload placeholder
            ensureSpace(FIELD_HEIGHT);
            const uploadLabel = `${label}: [File Attachment]`;
            page.drawText(cleanText(uploadLabel), {
              x: margin,
              y: y - 10,
              size: 10,
              font,
              color: rgb(0.5, 0.5, 0.5),
            });
            y -= FIELD_HEIGHT + 8;
            break;
          }

          case SmartBlockType.ADDRESS: {
            // Professional address form with multiple labeled fields
            const addressFields = [
              {
                suffix: "street",
                key: "street",
                label: "Street Address",
                width: 0.9,
                height: FIELD_HEIGHT,
              },
              {
                suffix: "street2",
                key: "street2",
                label: "Address Line 2",
                width: 0.9,
                height: FIELD_HEIGHT,
              },
              { suffix: "city", key: "city", label: "City", width: 0.4, height: FIELD_HEIGHT },
              {
                suffix: "state",
                key: "state",
                label: "State/Province",
                width: 0.25,
                height: FIELD_HEIGHT,
              },
              {
                suffix: "zip",
                key: "zip",
                label: "ZIP/Postal Code",
                width: 0.25,
                height: FIELD_HEIGHT,
              },
              {
                suffix: "country",
                key: "country",
                label: "Country",
                width: 0.4,
                height: FIELD_HEIGHT,
              },
            ];

            // Parse address value
            const rawVal = node.attrs?.value;
            let addrObj: any = {};
            if (rawVal) {
              if (typeof rawVal === "string") {
                addrObj = { street: rawVal }; // Fallback
              } else if (typeof rawVal === "object") {
                // Support both { street: ... } and { components: { street: ... } } (updated block)
                addrObj = rawVal.components || rawVal;
              }
            }

            // Draw main label
            ensureSpace(FIELD_HEIGHT * 8);

            let currentX = margin;
            let currentY = y;
            let fieldIndex = 0;

            for (const field of addressFields) {
              const subFieldName = `${fieldName}_${field.suffix}`;
              const fieldWidth = usableWidth * field.width;

              // Check if we need to wrap to next line (for city/state/zip row)
              if (fieldIndex === 3) {
                // Start row for city, state, zip
                currentX = margin;
                currentY = y - FIELD_HEIGHT * 3.5;
              } else if (fieldIndex === 5) {
                // Country on new line
                currentX = margin;
                currentY = y - FIELD_HEIGHT * 5.5;
              }

              // Draw sub-label
              page.drawText(field.label, {
                x: currentX,
                y: currentY,
                size: 8,
                font,
                color: rgb(0.4, 0.4, 0.4),
              });

              // Create text field
              const tf = form.createTextField(subFieldName);
              if (addrObj[field.key]) {
                tf.setText(String(addrObj[field.key]));
              }

              tf.addToPage(page, {
                x: currentX,
                y: currentY - field.height - 2,
                width: fieldWidth,
                height: field.height,
                borderWidth: 1,
                borderColor: rgb(0.8, 0.8, 0.8),
              });

              // Move X position for inline fields (city, state, zip)
              if (fieldIndex >= 2 && fieldIndex < 5) {
                currentX += fieldWidth + 10;
              } else {
                currentY -= FIELD_HEIGHT + 12;
              }

              fieldIndex++;
            }

            y -= FIELD_HEIGHT * 7 + 10;
            break;
          }

          case SmartBlockType.DATA_GRID: {
            // Data grid - render as a mini table with fillable cells
            const gridColumns = (node.attrs?.columns as string[]) || [
              "Column 1",
              "Column 2",
              "Column 3",
            ];
            const gridRowCount = 3; // Default 3 fillable rows
            const colCount = Math.min(gridColumns.length, 5);
            const gridCellWidth = usableWidth / colCount;
            const gridCellHeight = FIELD_HEIGHT;

            ensureSpace((gridRowCount + 1) * gridCellHeight + 20);

            // Draw header row
            for (let col = 0; col < colCount; col++) {
              const colX = margin + col * gridCellWidth;
              page.drawRectangle({
                x: colX,
                y: y - gridCellHeight,
                width: gridCellWidth,
                height: gridCellHeight,
                color: rgb(0.95, 0.95, 0.95),
                borderColor: rgb(0.7, 0.7, 0.7),
                borderWidth: 0.5,
              });
              page.drawText(cleanText((gridColumns[col] || `Col ${col + 1}`).slice(0, 15)), {
                x: colX + 5,
                y: y - gridCellHeight + 6,
                size: 9,
                font: boldFont,
                color: rgb(0.2, 0.2, 0.2),
              });
            }
            y -= gridCellHeight;

            // Draw fillable data rows
            const _gridVal = node.attrs?.value as Record<string, string> | undefined;

            for (let row = 0; row < gridRowCount; row++) {
              for (let col = 0; col < colCount; col++) {
                const cellFieldName = `${fieldName}_r${row + 1}_c${col + 1}`;
                const colX = margin + col * gridCellWidth;

                // Key format might differ depending on implementation,
                // but usually likely indexed by ID or similar.
                // For now, assuming direct mapping is too complex,
                // so simply creating the field. Future: map value.

                const cellTf = form.createTextField(cellFieldName);
                cellTf.addToPage(page, {
                  x: colX + 1,
                  y: y - gridCellHeight + 1,
                  width: gridCellWidth - 2,
                  height: gridCellHeight - 2,
                  borderWidth: 0.5,
                  borderColor: rgb(0.7, 0.7, 0.7),
                });
              }
              y -= gridCellHeight;
            }
            y -= 10;
            break;
          }

          // CONDITIONAL removed - visibility conditions are now a global block property

          default: {
            // Fallback: simple text field for unknown types
            console.warn(
              `[PDF Export] Unknown block type: "${blockType}" - falling back to text field`
            );
            const tf = form.createTextField(fieldName);
            if (node.attrs?.value) {
              tf.setText(String(node.attrs.value));
            }
            tf.addToPage(page, {
              x: margin,
              y: y - FIELD_HEIGHT + 5,
              width: usableWidth * 0.5,
              height: FIELD_HEIGHT,
              borderWidth: 1,
              borderColor: rgb(0.8, 0.8, 0.8),
            });
            y -= FIELD_HEIGHT + 8;
          }
        }

        break;
      }

      // ───────────────────────────────────────────────────────────────────
      // Other Node Types
      // ───────────────────────────────────────────────────────────────────

      case "bulletList":
      case "orderedList": {
        const items = node.content || [];
        const isOrdered = node.type === "orderedList";
        const bulletIndent = 25;
        const textStartX = margin + bulletIndent;
        const textWidth = usableWidth - bulletIndent;

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const text = extractText(item);
          const bullet = isOrdered ? `${i + 1}.` : "•";

          // Word wrap long list items
          const words = text.split(" ");
          let line = "";
          const fontSize = 11;
          let isFirstLine = true;

          for (const word of words) {
            const testLine = line ? `${line} ${word}` : word;
            const testWidth = font.widthOfTextAtSize(testLine, fontSize);

            if (testWidth > textWidth && line) {
              ensureSpace(LINE_HEIGHT);
              if (isFirstLine) {
                // Draw bullet on first line only
                page.drawText(bullet, {
                  x: margin + 5,
                  y,
                  size: fontSize,
                  font,
                });
                isFirstLine = false;
              }
              page.drawText(line, { x: textStartX, y, size: fontSize, font });
              y -= LINE_HEIGHT;
              line = word;
            } else {
              line = testLine;
            }
          }

          // Draw remaining text
          if (line) {
            ensureSpace(LINE_HEIGHT);
            if (isFirstLine) {
              page.drawText(bullet, {
                x: margin + 5,
                y,
                size: fontSize,
                font,
              });
            }
            page.drawText(line, { x: textStartX, y, size: fontSize, font });
            y -= LINE_HEIGHT;
          }
        }
        y -= LINE_HEIGHT * 0.3;
        break;
      }

      case "horizontalRule": {
        ensureSpace(LINE_HEIGHT * 2);
        y -= LINE_HEIGHT;
        page.drawLine({
          start: { x: margin, y },
          end: { x: PAGE_WIDTH - margin, y },
          thickness: 0.5,
          color: rgb(0.7, 0.7, 0.7),
        });
        y -= LINE_HEIGHT;
        break;
      }

      case "blockquote": {
        const text = extractText(node);
        ensureSpace(LINE_HEIGHT * 2);

        // Draw left border
        page.drawRectangle({
          x: margin,
          y: y - LINE_HEIGHT,
          width: 3,
          height: LINE_HEIGHT,
          color: rgb(0.8, 0.8, 0.8),
        });

        page.drawText(text, {
          x: margin + 15,
          y,
          size: 11,
          font,
          color: rgb(0.4, 0.4, 0.4),
        });
        y -= LINE_HEIGHT * 1.5;
        break;
      }

      case "table": {
        // Dynamic table rendering - supports any number of columns
        const rows = node.content || [];
        if (rows.length === 0) { break; }

        // Determine column count from first row
        const firstRow = rows[0];
        const columnCount = firstRow?.content?.length || 1;
        const maxColumns = Math.min(columnCount, 6); // Cap at 6 columns for readability
        const cellWidth = usableWidth / maxColumns;
        const cellHeight = LINE_HEIGHT * 1.5;

        for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
          const row = rows[rowIdx];
          const cells = row.content || [];
          const isHeader = rowIdx === 0;

          ensureSpace(cellHeight + 5);

          for (let colIdx = 0; colIdx < cells.length && colIdx < maxColumns; colIdx++) {
            const cell = cells[colIdx];
            const cellText = extractText(cell);
            const cellX = margin + colIdx * cellWidth;

            // Draw cell border
            page.drawRectangle({
              x: cellX,
              y: y - cellHeight,
              width: cellWidth,
              height: cellHeight,
              borderColor: rgb(0.7, 0.7, 0.7),
              borderWidth: 0.5,
            });

            // Draw cell text (truncate based on cell width)
            const maxChars = Math.floor(cellWidth / 6); // ~6pt per character
            page.drawText(cleanText(cellText.slice(0, maxChars)), {
              x: cellX + 5,
              y: y - cellHeight + 8,
              size: isHeader ? 10 : 9,
              font: isHeader ? boldFont : font,
              color: rgb(0.2, 0.2, 0.2),
            });
          }
          y -= cellHeight;
        }
        y -= 10;
        break;
      }

      case "codeBlock": {
        // Draw code block as monospace text area
        const codeText = extractText(node);
        ensureSpace(LINE_HEIGHT * 3);

        page.drawRectangle({
          x: margin,
          y: y - LINE_HEIGHT * 2,
          width: usableWidth,
          height: LINE_HEIGHT * 2,
          color: rgb(0.95, 0.95, 0.95),
          borderColor: rgb(0.8, 0.8, 0.8),
          borderWidth: 0.5,
        });

        page.drawText(cleanText(codeText.slice(0, 100)), {
          x: margin + 8,
          y: y - 15,
          size: 9,
          font,
          color: rgb(0.2, 0.2, 0.2),
        });
        y -= LINE_HEIGHT * 2.5;
        break;
      }

      case "hardBreak": {
        // Line break within paragraph - add half line spacing
        y -= LINE_HEIGHT * 0.5;
        break;
      }

      case "blockRow": {
        // Side-by-side block layout - process children sequentially for PDF
        // (PDF is more linear, so we render children in order)
        const blockRowChildren = node.content || [];
        for (const childNode of blockRowChildren) {
          // Recursively process each child (typically smartBlocks)
          if (childNode.type === "smartBlock") {
            const blockId = childNode.attrs?.id as string;
            const label = (childNode.attrs?.label as string) || "Field";

            const fieldName = getFieldName(blockId, label);

            ensureSpace(FIELD_HEIGHT + LINE_HEIGHT);
            page.drawText(`${label}:`, {
              x: margin,
              y,
              size: 10,
              font,
              color: rgb(0.3, 0.3, 0.3),
            });
            y -= 12;

            // Create text field for inline block
            const tf = form.createTextField(fieldName);
            tf.addToPage(page, {
              x: margin,
              y: y - FIELD_HEIGHT + 5,
              width: usableWidth * 0.4,
              height: FIELD_HEIGHT,
              borderWidth: 1,
              borderColor: rgb(0.8, 0.8, 0.8),
            });
            y -= FIELD_HEIGHT + 8;
          }
        }
        break;
      }

      case "variableMention": {
        // Variable reference like {{clientName}} - render as placeholder text
        const varName = String(node.attrs?.name || node.attrs?.id || "variable");
        ensureSpace(LINE_HEIGHT);
        page.drawText(`{{${varName}}}`, {
          x: margin,
          y,
          size: 10,
          font,
          color: rgb(0.25, 0.4, 0.9), // Blue color for variables
        });
        y -= LINE_HEIGHT;
        break;
      }

      default:
        // Skip unknown node types
        break;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SIGNATURE SUMMARY (End of Document)
  // ─────────────────────────────────────────────────────────────────────────

  if (options.signatureSummary && options.signatureSummary.length > 0) {
    // Ensure we start on a relatively clean spot or new page
    if (y < 200) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - margin;
    }

    y -= 30;
    page.drawText("Signature Summary", {
      x: margin,
      y,
      size: 14,
      font: boldFont,
      color: rgb(0.1, 0.2, 0.4),
    });
    y -= 10;
    page.drawLine({
      start: { x: margin, y },
      end: { x: PAGE_WIDTH - margin, y },
      thickness: 1,
      color: rgb(0.9, 0.9, 0.9),
    });
    y -= 25;

    for (const sig of options.signatureSummary) {
      ensureSpace(120);

      const boxHeight = 100;
      page.drawRectangle({
        x: margin,
        y: y - boxHeight,
        width: usableWidth,
        height: boxHeight,
        borderColor: rgb(0.9, 0.9, 0.9),
        borderWidth: 1,
      });

      // Signature Image
      if (sig.signatureData) {
        try {
          const imageData = sig.signatureData.replace(/^data:image\/\w+;base64,/, "");
          const imageBytes = Uint8Array.from(atob(imageData), (c) => c.charCodeAt(0));
          const sigImage = sig.signatureData.includes("image/png")
            ? await pdfDoc.embedPng(imageBytes)
            : await pdfDoc.embedJpg(imageBytes);

          const sigWidth = 120;
          const sigHeight = (sigImage.height / sigImage.width) * sigWidth;
          const drawHeight = Math.min(sigHeight, boxHeight - 20);

          page.drawImage(sigImage, {
            x: margin + 10,
            y: y - boxHeight + (boxHeight - drawHeight) / 2,
            width: sigWidth,
            height: drawHeight,
          });
        } catch (e) {
          console.warn("[PDF Export] Failed to embed signature in summary:", e);
        }
      }

      // Details
      const textX = margin + 145;
      let textY = y - 20;

      page.drawText(sig.legalName, { x: textX, y: textY, size: 11, font: boldFont });
      textY -= 15;
      page.drawText(sig.email, { x: textX, y: textY, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
      textY -= 12;

      if (sig.signedAt) {
        const dateStr = `${new Date(sig.signedAt).toISOString().replace("T", " ").slice(0, 19)} UTC`;
        page.drawText(`Signed at: ${dateStr}`, {
          x: textX,
          y: textY,
          size: 8,
          font,
          color: rgb(0.5, 0.5, 0.5),
        });
        textY -= 10;
      }

      if (sig.ipAddress) {
        page.drawText(`IP Address: ${sig.ipAddress}`, {
          x: textX,
          y: textY,
          size: 8,
          font,
          color: rgb(0.5, 0.5, 0.5),
        });
        textY -= 10;
      }

      // Security Fingerprint (DocuSeal style)
      const fingerprint = sig.signatureData
        ? `HD-${sig.signedAt || Date.now()}-${sig.email.slice(0, 3).toUpperCase()}`
        : "N/A";
      page.drawText(`Fingerprint: ${fingerprint}`, {
        x: textX,
        y: textY,
        size: 7,
        font,
        color: rgb(0.6, 0.6, 0.6),
      });

      y -= boxHeight + 20;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Add Page Numbers (Optional)
  // ─────────────────────────────────────────────────────────────────────────

  if (options.pageNumbers) {
    const pages = pdfDoc.getPages();
    for (let i = 0; i < pages.length; i++) {
      const p = pages[i];
      const pageNumText = `Page ${i + 1} of ${pages.length}`;
      const textWidth = font.widthOfTextAtSize(pageNumText, 9);
      p.drawText(pageNumText, {
        x: PAGE_WIDTH / 2 - textWidth / 2,
        y: 20,
        size: 9,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
    }
  }

  return pdfDoc.save();
}

// ═══════════════════════════════════════════════════════════════════════════
// Convenience Export
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Export and trigger browser download
 */
export async function downloadTiptapAsPdf(
  content: TiptapNode,
  slots: Slot[],
  blocks: Block[],
  filename = "document.pdf",
  options: ExportOptions = {}
): Promise<void> {
  try {
    console.log("[PDF Export] Starting download...");
    console.log("[PDF Export] Filename:", filename);

    let pdfBytes = await exportTiptapToPdf(content, slots, blocks, options);

    // Flatten form fields if requested (makes PDF read-only)
    if (options.flatten) {
      console.log("[PDF Export] Flattening form fields...");
      const { flattenPdf } = await import("@/lib/pdf/flatten-pdf");
      pdfBytes = await flattenPdf(pdfBytes);
      console.log("[PDF Export] PDF flattened successfully");
    }

    console.log("[PDF Export] PDF generated, size:", pdfBytes.length, "bytes");

    // Create blob and trigger download
    const blob = new Blob([pdfBytes.slice().buffer], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);

    console.log("[PDF Export] Download triggered successfully");
  } catch (error) {
    console.error("[PDF Export] FAILED:", error);
    console.error("[PDF Export] Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      contentType: content?.type,
      contentNodeCount: content?.content?.length || 0,
      partiesCount: slots?.length || 0,
      blocksCount: blocks?.length || 0,
    });
    throw error; // Re-throw so caller can handle
  }
}
