import { PDFCheckBox, PDFDocument, type PDFField, PDFTextField } from "pdf-lib";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { v4 as uuidv4 } from "uuid";
import type { DetectedField, UserProfile } from "$lib/components/hyprsign/types";
import type { NormalizedTextItem } from "$lib/import/pdf-types";
import {
  extractTextFromPage,
  groupIntoLines,
  mergeLineToString,
} from "$lib/import/text-extractor";
import { findProfileMatch, inferFieldType, scanLineForPatterns } from "./field-patterns";

// Configure pdf.js worker for server-side use
// The legacy build supports fake worker mode when workerSrc points to the legacy worker
if (typeof window === "undefined") {
  // Server-side: use legacy fake worker
  pdfjs.GlobalWorkerOptions.workerSrc = "pdfjs-dist/legacy/build/pdf.worker.mjs";
} else {
  // Client-side: use CDN worker
  pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

/**
 * Determine field type from PDF field.
 */
function getFieldType(field: PDFField): DetectedField["type"] {
  if (field instanceof PDFTextField) {
    const name = field.getName().toLowerCase();
    if (name.includes("date") || name.includes("dob")) { return "date"; }
    if (name.includes("signature") || name.includes("sign")) { return "signature"; }
    if (name.includes("initial")) { return "initials"; }
    return "text";
  }
  if (field instanceof PDFCheckBox) { return "checkbox"; }
  return "text";
}

/**
 * Get bounding box for a PDF field (normalized 0-1 coordinates).
 */
function getFieldBoundingBox(
  field: PDFField,
  pageWidth: number,
  pageHeight: number,
  pageIndex: number
): DetectedField["boundingBox"] {
  // Default fallback position
  const defaultBox = {
    x: 0.1,
    y: 0.1,
    width: 0.3,
    height: 0.04,
    page: pageIndex + 1,
  };

  try {
    const widgets = field.acroField.getWidgets();
    if (widgets.length === 0) { return defaultBox; }

    const widget = widgets[0];
    const rect = widget.getRectangle();

    // Normalize to 0-1 range
    return {
      x: rect.x / pageWidth,
      y: 1 - (rect.y + rect.height) / pageHeight, // Flip Y coordinate
      width: rect.width / pageWidth,
      height: rect.height / pageHeight,
      page: pageIndex + 1,
    };
  } catch {
    return defaultBox;
  }
}

/**
 * Analyze a PDF document and extract fields with auto-fill mapping.
 */
export async function analyzeDocumentFields(
  file: File,
  userProfile: UserProfile
): Promise<DetectedField[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

  const fields: DetectedField[] = [];
  const form = pdfDoc.getForm();
  const formFields = form.getFields();
  const pages = pdfDoc.getPages();

  // Extract AcroForm fields
  for (let i = 0; i < formFields.length; i++) {
    const field = formFields[i];
    const fieldName = field.getName();
    const fieldType = getFieldType(field);

    // Get page dimensions for the first page (simplified)
    const page = pages[0];
    const { width: pageWidth, height: pageHeight } = page.getSize();

    // Try to match label to profile
    const matchedKey = findProfileMatch(fieldName);
    const autoFilledValue = matchedKey ? (userProfile as any)[matchedKey] : null;

    const boundingBox = getFieldBoundingBox(field, pageWidth, pageHeight, 0);

    fields.push({
      id: `acrofield-${i}-${fieldName.replace(/\s+/g, "-")}`,
      label: fieldName,
      type: fieldType,
      value: autoFilledValue || null,
      confidence: autoFilledValue ? 0.9 : 0.5,
      boundingBox,
      autoFilled: !!autoFilledValue,
      matchedProfileKey: matchedKey || undefined,
      required: false,
    });
  }

  // Tier 2: PDF Text Pattern Matching (Underscores, checkboxes, signature lines)
  // ALWAYS run this, even if AcroForm fields were found, to catch visual patterns
  try {
    const patternFields = await extractFieldsFromText(arrayBuffer, userProfile);
    if (patternFields.length > 0) {
      // Filter out duplicates - check for label overlap AND position overlap with existing AcroForm fields
      for (const pf of patternFields) {
        const pfLabel = pf.label.toLowerCase();

        const isDuplicate = fields.some((existing) => {
          const existingLabel = existing.label.toLowerCase();

          // Check if labels are exactly the same or significantly overlap
          const labelsOverlap =
            existingLabel === pfLabel ||
            (pfLabel.length > 3 && existingLabel.includes(pfLabel)) ||
            (existingLabel.length > 3 && pfLabel.includes(existingLabel));

          // Check if positions are on the same line (within 1.5% of page height)
          // Tightened from 0.025 to 0.015 to handle standard line spacing
          const onSameLine =
            existing.boundingBox.page === pf.boundingBox.page &&
            Math.abs(existing.boundingBox.y - pf.boundingBox.y) < 0.015;

          // Check for high physical overlap (intersection)
          const xOverlapThreshold = pf.type === "checkbox" ? 0.02 : 0.04;
          const yOverlapThreshold = 0.015;
          const physicallyOverlaps =
            existing.boundingBox.page === pf.boundingBox.page &&
            Math.abs(existing.boundingBox.x - pf.boundingBox.x) < xOverlapThreshold &&
            Math.abs(existing.boundingBox.y - pf.boundingBox.y) < yOverlapThreshold;

          // Rule 1: If labels overlap AND they are on the same line, it's almost certainly a duplicate
          if (labelsOverlap && onSameLine) { return true; }

          // Rule 2: Avoid merging fields with different labels unless they physically collide
          if (physicallyOverlaps && labelsOverlap) { return true; }

          // Rule 3: Extreme physical overlap (fallback for unlabeled fields)
          if (physicallyOverlaps && pfLabel === "field") { return true; }

          return false;
        });

        if (!isDuplicate) {
          fields.push(pf);
        }
      }
    }
  } catch (error) {
    console.warn("[HyprSign] Pattern recognition failed:", error);
  }

  // If still no fields found, create placeholder fields
  if (fields.length === 0) {
    // Add common placeholder fields that will be positioned via AI
    const commonFields: Array<{ label: string; type: DetectedField["type"]; y: number }> = [
      { label: "Full Name", type: "text", y: 0.15 },
      { label: "Date", type: "date", y: 0.2 },
      { label: "Address", type: "text", y: 0.25 },
      { label: "City", type: "text", y: 0.3 },
      { label: "State", type: "text", y: 0.35 },
      { label: "ZIP Code", type: "text", y: 0.4 },
      { label: "Signature", type: "signature", y: 0.85 },
    ];

    for (let i = 0; i < commonFields.length; i++) {
      const { label, type, y } = commonFields[i];
      const matchedKey = findProfileMatch(label);
      const autoFilledValue = matchedKey ? (userProfile as any)[matchedKey] : null;

      fields.push({
        id: `placeholder-${i}`,
        label,
        type,
        value: autoFilledValue || null,
        confidence: autoFilledValue ? 0.7 : 0.3,
        boundingBox: {
          x: 0.15,
          y,
          width: 0.4,
          height: 0.035,
          page: 1,
        },
        autoFilled: !!autoFilledValue,
        matchedProfileKey: matchedKey || undefined,
        required: false,
      });
    }
  }

  return fields;
}

/**
 * Tier 2: Extract fields from PDF text using pattern matching.
 * Detects underscores, dashes, dots, checkboxes, and signature markers.
 */
async function extractFieldsFromText(
  pdfBuffer: ArrayBuffer,
  userProfile: UserProfile
): Promise<DetectedField[]> {
  const fields: DetectedField[] = [];

  console.log("[HyprSign Tier2] Starting text-based field extraction...");

  try {
    const loadingTask = pdfjs.getDocument({
      data: pdfBuffer,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
      disableAutoFetch: true,
      disableStream: true,
    });
    const pdf = await loadingTask.promise;

    console.log(`[HyprSign Tier2] PDF loaded, ${pdf.numPages} pages`);

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1 });
      const pageWidth = viewport.width || 612;
      const pageHeight = viewport.height || 792;

      const textItems = await extractTextFromPage(page, pageNum);
      console.log(`[HyprSign Tier2] Page ${pageNum}: extracted ${textItems.length} text items`);

      const lines = groupIntoLines(textItems);
      console.log(`[HyprSign Tier2] Page ${pageNum}: grouped into ${lines.length} lines`);

      // Log first 10 lines for debugging
      if (pageNum === pdf.numPages) {
        console.log("[HyprSign Tier2] Last page sample lines:");
        for (let i = 0; i < Math.min(15, lines.length); i++) {
          const lineText = mergeLineToString(lines[i]);
          console.log(`  Line ${i + 1}: "${lineText.slice(0, 80)}"`);
        }
      }

      for (const line of lines) {
        const lineText = mergeLineToString(line);
        const firstItem = line[0];
        const patternMatches = scanLineForPatterns(lineText);
        const fontSizePoints = firstItem.fontSize || 12;

        // Helper to get precise X coordinate by mapping string offset back to text items
        const getPreciseXHelper = (lineItems: NormalizedTextItem[], charOffset: number) => {
          let currentStrLen = 0;
          for (let i = 0; i < lineItems.length; i++) {
            const item = lineItems[i];
            const itemLen = item.content.length;

            if (charOffset >= currentStrLen && charOffset <= currentStrLen + itemLen) {
              // The match starts within or at the beginning of this text item
              const offsetInItem = charOffset - currentStrLen;
              const charWidth = fontSizePoints * 0.45; // Proportional font estimate
              return item.x + offsetInItem * charWidth;
            }

            currentStrLen += itemLen;
            if (i < lineItems.length - 1) {
              const nextItem = lineItems[i + 1];
              const gap = nextItem.x - (item.x + item.content.length * 5);
              currentStrLen += gap > 10 ? 2 : 1;
            }
          }
          return lineItems[0].x + charOffset * (fontSizePoints * 0.45);
        };

        // Debug: log lines that contain potential field indicators
        if (
          lineText.includes("_") ||
          lineText.includes("□") ||
          lineText.includes("☐") ||
          lineText.toLowerCase().includes("signature") ||
          lineText.toLowerCase().includes("date:")
        ) {
          console.log(`[HyprSign] Scanning line: "${lineText.slice(0, 100)}"`);
          console.log(`[HyprSign] Pattern matches found: ${patternMatches.length}`);
          if (patternMatches.length > 0) {
            console.log("[HyprSign] Matches:", JSON.stringify(patternMatches, null, 2));
          }
        }

        for (const match of patternMatches) {
          const label = match.label;
          const pfLabel = label.toLowerCase();
          const pfType = inferFieldTypeFromPattern(match.patternType, label);

          console.log(
            `[HyprSign] Processing match: "${match.fullMatch}" (type: ${pfType}, label: "${label}")`
          );

          // Filter out duplicates - check for label overlap AND position overlap with existing AcroForm fields
          const isDuplicate = fields.some((existing) => {
            const existingLabel = existing.label.toLowerCase();

            // Check if labels are exactly the same or significantly overlap
            const labelsOverlap =
              existingLabel === pfLabel ||
              (pfLabel.length > 3 && existingLabel.includes(pfLabel)) ||
              (existingLabel.length > 3 && pfLabel.includes(existingLabel));

            // Check if positions are on the same line (within 1.5% of page height)
            // Tightened from 0.025 to 0.015 to handle standard line spacing
            const onSameLine =
              existing.boundingBox.page === pageNum &&
              Math.abs(
                existing.boundingBox.y -
                  (firstItem.y - (firstItem.fontSize || 12) * 0.85) / pageHeight
              ) < 0.015;

            // Check for high physical overlap (intersection)
            const xOverlapThreshold = pfType === "checkbox" ? 0.02 : 0.04;
            const yOverlapThreshold = 0.015;
            const physicallyOverlaps =
              existing.boundingBox.page === pageNum &&
              Math.abs(
                existing.boundingBox.x - getPreciseXHelper(line, match.matchStart) / pageWidth
              ) < xOverlapThreshold &&
              Math.abs(
                existing.boundingBox.y -
                  (firstItem.y - (firstItem.fontSize || 12) * 0.85) / pageHeight
              ) < yOverlapThreshold;

            // Rule 1: If labels overlap AND they are on the same line, it's almost certainly a duplicate
            if (labelsOverlap && onSameLine) {
              console.log(
                `[HyprSign] Duplicate detected (Rule 1 - label & line): Existing "${existing.label}" vs New "${label}"`
              );
              return true;
            }

            // Rule 2: Avoid merging fields with different labels unless they physically collide
            if (physicallyOverlaps && labelsOverlap) {
              console.log(
                `[HyprSign] Duplicate detected (Rule 2 - physical & label): Existing "${existing.label}" vs New "${label}"`
              );
              return true;
            }

            // Rule 3: Extreme physical overlap (fallback for unlabeled fields)
            if (physicallyOverlaps && pfLabel === "field") {
              console.log(
                `[HyprSign] Duplicate detected (Rule 3 - physical & generic label): Existing "${existing.label}" vs New "${label}"`
              );
              return true;
            }

            return false;
          });

          if (isDuplicate) {
            console.log(`[HyprSign] Skipping duplicate pattern match: "${label}"`);
            continue;
          }

          // If it's a colon label with no underscore/line, we should place the box AFTER the colon
          const isColonLabelOnly =
            match.patternType === "colonLabelFlexible" &&
            !match.fullMatch.includes("_") &&
            !match.fullMatch.includes("-");
          const fieldX = getPreciseXHelper(
            line,
            isColonLabelOnly ? match.matchStart + match.fullMatch.length : match.matchStart
          );

          // Calculate font-size relative dimensions
          const isCheckbox = pfType === "checkbox";

          // Normalized dimensions
          const normFontSize = fontSizePoints / pageHeight;
          const fieldHeight = isCheckbox
            ? normFontSize * 1.2
            : pfType === "signature"
              ? 0.05
              : 0.035;

          // Ensure checkbox is square in points (requires page aspect ratio)
          const widthInPoints = isCheckbox
            ? fontSizePoints * 1.2
            : calculateFieldWidth(match.patternType, match.fullMatch) * pageWidth;
          const fieldWidth = widthInPoints / pageWidth;

          // Center the field vertically on the text line
          const fieldY = (firstItem.y - fontSizePoints * 0.85) / pageHeight;

          const matchedKey = findProfileMatch(label);
          const autoFilledValue = matchedKey
            ? (userProfile as Record<string, unknown>)[matchedKey]
            : null;

          fields.push({
            id: `pattern-${uuidv4().slice(0, 8)}`,
            label,
            type: pfType,
            value: autoFilledValue as string | boolean | null,
            confidence: 0.85,
            boundingBox: {
              x: fieldX / pageWidth,
              y: fieldY,
              width: fieldWidth,
              height: fieldHeight,
              page: pageNum,
            },
            autoFilled: !!autoFilledValue,
            matchedProfileKey: matchedKey || undefined,
            required: false,
          });
        }
      }
    }
  } catch (error) {
    console.error("[HyprSign] Text extraction error:", error);
  }

  return fields;
}

/**
 * Infer field type from pattern type and label.
 */
function inferFieldTypeFromPattern(patternType: string, label: string): DetectedField["type"] {
  // Pattern-specific type inference
  switch (patternType) {
    case "signatureX":
    case "slashS":
      return "signature";
    case "unicodeCheckbox":
    case "bracketCheckbox":
    case "parenCheckbox":
      return "checkbox";
    case "dateSlash":
      return "date";
    case "signatureBlock":
    case "colonLabelFlexible":
      // These patterns capture a label - infer type from the label
      return inferFieldType(label);
    default:
      // Fall back to label-based inference
      return inferFieldType(label);
  }
}

/**
 * Calculate estimated field width based on pattern type.
 */
function calculateFieldWidth(patternType: string, matchText: string): number {
  // Checkboxes are small
  if (patternType.includes("Checkbox")) {
    return 0.03;
  }

  // Signature fields are wider
  if (
    patternType === "signatureX" ||
    patternType === "slashS" ||
    patternType === "signatureBlock"
  ) {
    return 0.35;
  }

  // Calculate based on underscore/dash length
  const fillChars = (matchText.match(/[_\-.]/g) || []).length;
  if (fillChars > 20) { return 0.4; }
  if (fillChars > 10) { return 0.3; }
  if (fillChars > 5) { return 0.2; }

  return 0.25;
}

/**
 * Analyze document using Gemini Vision API for intelligent field detection.
 * This is called when AcroForm extraction doesn't find fields.
 */
export async function analyzeWithGeminiVision(
  pdfBuffer: ArrayBuffer,
  userProfile: UserProfile
): Promise<DetectedField[]> {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("[HyprSign] No GEMINI_API_KEY configured, using fallback field detection");
    return [];
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const base64Pdf = Buffer.from(pdfBuffer).toString("base64");

    const prompt = `You are analyzing a PDF document to identify ALL fillable form fields. 

CRITICAL: Look for BOTH traditional form fields AND visual patterns that indicate where users should write:

1. **Underline patterns**: Lines like "Name: _____________" or "Date _____" or "Signature: ___________"
2. **Blank spaces with labels**: Like "Full Name:" followed by empty space
3. **Signature areas**: Any area labeled "Signature", "Sign Here", "X_____", or empty signature boxes
4. **Date fields**: Text like "Date:", "Date of Birth:", "DOB:", or underlines near date labels
5. **Checkboxes**: Small squares, circles, or [ ] patterns
6. **Radio buttons**: Groups of circles or options like "( ) Yes ( ) No"
7. **Initial fields**: Small boxes or lines marked "Initials" or "Initial Here"

For EACH field found, provide:
- label: The text label near the field (e.g., "Full Name", "Signature", "Date")
- type: One of "text", "date", "signature", "checkbox", "initials", "radio"
- x, y, width, height: Bounding box as percentages (0-1) of page dimensions
- page: Page number (1-indexed)

IMPORTANT COORDINATES:
- x: Distance from LEFT edge (0 = left, 1 = right)
- y: Distance from TOP edge (0 = top, 1 = bottom)
- width/height: Size as percentage of page

Return ONLY valid JSON array, no other text:
[{ "label": "string", "type": "string", "x": 0.1, "y": 0.2, "width": 0.3, "height": 0.04, "page": 1 }]`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { mimeType: "application/pdf", data: base64Pdf } },
    ]);

    const responseText = result.response.text();
    const jsonMatch = responseText.match(/\[[\s\S]*?\]/);

    if (!jsonMatch) {
      console.warn("[HyprSign] Could not parse Gemini response as JSON");
      return [];
    }

    const detectedFields = JSON.parse(jsonMatch[0]) as Array<{
      label: string;
      type: string;
      x: number;
      y: number;
      width: number;
      height: number;
      page: number;
    }>;

    return detectedFields.map((f, index) => {
      const matchedKey = findProfileMatch(f.label);
      const autoFilledValue = matchedKey ? (userProfile as any)[matchedKey] : null;

      return {
        id: `gemini-field-${index}`,
        label: f.label,
        type: f.type as DetectedField["type"],
        value: autoFilledValue || null,
        confidence: 0.75,
        boundingBox: {
          x: f.x,
          y: f.y,
          width: f.width,
          height: f.height,
          page: f.page,
        },
        autoFilled: !!autoFilledValue,
        matchedProfileKey: matchedKey || undefined,
        required: false,
      };
    });
  } catch (error) {
    console.error("[HyprSign] Gemini Vision analysis failed:", error);
    return [];
  }
}
