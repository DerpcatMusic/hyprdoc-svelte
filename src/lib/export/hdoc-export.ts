/**
 * HDOC Export
 *
 * Exports a template to .hdoc format (single JSON file).
 * Pure client-side — works with Tiptap editor instance.
 */
import type { Editor } from "@tiptap/core";
import type { Id } from "@/convex/_generated/dataModel";
import {
  HDOC_FORMAT_VERSION,
  type HdocDocument,
  type HdocFile,
  type HdocSettings,
  type HdocSlot,
  type HdocVariable,
} from "./hdoc-types";

/**
 * Template data needed for export
 */
export interface TemplateExportData {
  document: {
    _id: Id<"documents">;
    title: string;
    kind: "template";
    status: string;
    version: number;
    isLocked?: boolean;
    isPublic?: boolean;
    settings?: Record<string, unknown>;
  };
  blocks: Record<string, unknown>[];
  slots: Array<{
    _id: Id<"slots">;
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
}

/**
 * Compute SHA-256 checksum for integrity verification
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
 * Serialize document metadata
 */
function serializeDocument(doc: TemplateExportData["document"]): HdocDocument {
  return {
    title: doc.title,
    kind: "template",
    status: doc.status as HdocDocument["status"],
    version: doc.version,
    isLocked: doc.isLocked,
    isPublic: doc.isPublic,
  };
}

/**
 * Serialize slots with stable IDs
 */
function serializeSlots(slots: TemplateExportData["slots"]): HdocSlot[] {
  return slots.map((slot) => ({
    id: slot._id,
    name: slot.name,
    role: slot.role,
    color: slot.color,
    order: slot.order,
    defaultFields: slot.defaultFields,
  }));
}

/**
 * Serialize document-scoped variables
 */
function serializeVariables(variables: TemplateExportData["variables"]): HdocVariable[] {
  return variables.map((variable) => ({
    name: variable.name,
    displayName: variable.displayName,
    value: variable.value,
    type: variable.type,
    fallback: variable.fallback,
    category: variable.category,
  }));
}

/**
 * Serialize document settings
 */
function serializeSettings(settings?: Record<string, unknown>): HdocSettings {
  if (!settings) { return undefined; }

  return {
    paperTexture: settings.paperTexture as string | undefined,
    paperTextureOpacity: settings.paperTextureOpacity as number | undefined,
    showMargins: settings.showMargins as boolean | undefined,
    marginVertical: settings.marginVertical as number | undefined,
    marginHorizontal: settings.marginHorizontal as number | undefined,
    fontFamily: settings.fontFamily as string | undefined,
    fontSize: settings.fontSize as number | undefined,
  };
}

/**
 * Export template to .hdoc format
 *
 * @param editor - Tiptap editor instance
 * @param data - Template data from Convex
 * @returns HdocFile ready for JSON serialization
 */
export async function exportTemplateToHdoc(
  editor: Editor,
  data: TemplateExportData
): Promise<HdocFile> {
  const content = editor.getJSON();

  // Build file without checksum first
  const hdocWithoutChecksum = {
    formatVersion: HDOC_FORMAT_VERSION,
    generator: "HyprDoc Next",
    exportedAt: new Date().toISOString(),
    checksum: "", // Placeholder
    document: serializeDocument(data.document),
    content: content as HdocFile["content"],
    blocks: data.blocks,
    slots: serializeSlots(data.slots),
    variables: serializeVariables(data.variables),
    settings: serializeSettings(data.document.settings),
  };

  // Compute checksum over entire content
  const contentForChecksum = JSON.stringify({
    document: hdocWithoutChecksum.document,
    content: hdocWithoutChecksum.content,
    blocks: hdocWithoutChecksum.blocks,
    slots: hdocWithoutChecksum.slots,
    variables: hdocWithoutChecksum.variables,
    settings: hdocWithoutChecksum.settings,
  });

  const checksum = await computeChecksum(contentForChecksum);

  return {
    ...hdocWithoutChecksum,
    checksum,
  };
}

/**
 * Trigger download of .hdoc file
 *
 * @param hdoc - HdocFile to download
 * @param filename - Optional filename (defaults to document title)
 */
export function downloadHdoc(hdoc: HdocFile, filename?: string): void {
  const json = JSON.stringify(hdoc, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const safeName = (filename ?? hdoc.document.title).replace(/[^a-z0-9\-_]/gi, "-").toLowerCase();

  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeName}.hdoc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
