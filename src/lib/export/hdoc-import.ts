/**
 * HDOC Import
 *
 * Imports a .hdoc file and restores it as a new template.
 */
import {
  HDOC_FORMAT_VERSION,
  type HdocFile,
  HdocFileSchema,
  type HdocValidationResult,
} from "./hdoc-types";

/**
 * Compute SHA-256 checksum (same as export)
 */
async function computeChecksum(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return `sha256:${hashHex}`;
}

/**
 * Verify checksum of imported file
 */
async function verifyChecksum(hdoc: HdocFile): Promise<boolean> {
  const contentForChecksum = JSON.stringify({
    document: hdoc.document,
    content: hdoc.content,
    blocks: hdoc.blocks,
    slots: hdoc.slots,
    variables: hdoc.variables,
    settings: hdoc.settings,
  });

  const computed = await computeChecksum(contentForChecksum);
  return computed === hdoc.checksum;
}

/**
 * Parse and validate .hdoc file content
 *
 * @param fileContent - Raw JSON string from file
 * @returns Validation result with parsed data or error
 */
export async function validateHdocFile(fileContent: string): Promise<HdocValidationResult> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(fileContent);
  } catch {
    return { success: false, error: "Invalid JSON: file is not valid JSON" };
  }

  const result = HdocFileSchema.safeParse(parsed);

  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    return { success: false, error: `Validation failed:\n${issues.join("\n")}` };
  }

  const hdoc = result.data;

  // Check format version compatibility
  const [major] = hdoc.formatVersion.split(".");
  const [currentMajor] = HDOC_FORMAT_VERSION.split(".");

  if (major !== currentMajor) {
    return {
      success: false,
      error: `Incompatible format version: ${hdoc.formatVersion} (current: ${HDOC_FORMAT_VERSION})`,
    };
  }

  // Verify checksum
  const checksumValid = await verifyChecksum(hdoc);

  if (!checksumValid) {
    return {
      success: true, // Still parseable, but warn user
      data: hdoc,
      checksumValid: false,
      error: "Checksum mismatch: file may have been modified",
    };
  }

  return { success: true, data: hdoc, checksumValid: true };
}

/**
 * Read .hdoc file from browser File input
 *
 * @param file - File object from input
 * @returns Validation result
 */
export async function readHdocFile(file: File): Promise<HdocValidationResult> {
  if (!file.name.endsWith(".hdoc")) {
    return { success: false, error: "Invalid file type: expected .hdoc file" };
  }

  try {
    const content = await file.text();
    return validateHdocFile(content);
  } catch {
    return { success: false, error: "Failed to read file" };
  }
}

/**
 * Prepared import data ready for Convex mutations
 */
export interface HdocImportData {
  document: {
    title: string;
    kind: "template";
    content: string; // Stringified Tiptap JSON
    blocks: unknown[];
    status: string;
  };
  slots: Array<{
    name: string;
    role: string;
    color: string;
    order: number;
    defaultFields?: Array<{ type: string; label: string; required: boolean }>;
  }>;
  variables: Array<{
    name: string;
    displayName?: string;
    value: string | number | boolean | null;
    type: "text" | "number" | "date" | "currency" | "boolean";
    fallback?: string;
    category?: string;
  }>;
  settings: Record<string, unknown> | undefined;
  originalSlotIdMap: Map<string, number>; // Maps original slot ID to import order (for block remapping)
}

/**
 * Prepare validated .hdoc data for import into Convex
 *
 * @param hdoc - Validated HdocFile
 * @returns Data prepared for Convex mutations
 */
export function prepareHdocForImport(hdoc: HdocFile): HdocImportData {
  // Create mapping of original slot IDs to their order
  const originalSlotIdMap = new Map<string, number>();
  hdoc.slots.forEach((slot, index) => {
    originalSlotIdMap.set(slot.id, index);
  });

  return {
    document: {
      title: `${hdoc.document.title} (Imported)`,
      kind: "template",
      content: JSON.stringify(hdoc.content),
      blocks: hdoc.blocks,
      status: "draft", // Always import as draft
    },
    slots: hdoc.slots.map((slot) => ({
      name: slot.name,
      role: slot.role,
      color: slot.color,
      order: slot.order,
      defaultFields: slot.defaultFields,
    })),
    variables: hdoc.variables,
    settings: hdoc.settings,
    originalSlotIdMap,
  };
}
