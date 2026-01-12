/**
 * HDOC Export Types
 *
 * Zod schemas for the .hdoc template export format.
 * Single JSON file — no external dependencies.
 */
import { z } from "zod";

/**
 * Format version for migration support
 */
export const HDOC_FORMAT_VERSION = "1.0.0";

/**
 * Document metadata (subset of Convex document record)
 */
export const HdocDocumentSchema = z.object({
  title: z.string(),
  kind: z.literal("template"),
  status: z.enum(["draft", "pending_signatures", "completed", "expired", "voided"]),
  version: z.number(),
  isLocked: z.boolean().optional(),
  isPublic: z.boolean().optional(),
});

export type HdocDocument = z.infer<typeof HdocDocumentSchema>;

/**
 * Tiptap document content (passthrough — validated by Tiptap)
 */
export const HdocContentSchema = z.object({
  type: z.literal("doc"),
  content: z.array(z.any()),
});

export type HdocContent = z.infer<typeof HdocContentSchema>;

/**
 * Slot definition for template portability
 */
export const HdocSlotSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  color: z.string(),
  order: z.number(),
  defaultFields: z
    .array(
      z.object({
        type: z.string(),
        label: z.string(),
        required: z.boolean(),
      })
    )
    .optional(),
});

export type HdocSlot = z.infer<typeof HdocSlotSchema>;

/**
 * Document-scoped variable
 */
export const HdocVariableSchema = z.object({
  name: z.string(),
  displayName: z.string().optional(),
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  type: z.enum(["text", "number", "date", "currency", "boolean"]),
  fallback: z.string().optional(),
  category: z.string().optional(),
});

export type HdocVariable = z.infer<typeof HdocVariableSchema>;

/**
 * Document settings (margins, fonts, etc.)
 */
export const HdocSettingsSchema = z
  .object({
    paperTexture: z.string().optional(),
    paperTextureOpacity: z.number().optional(),
    showMargins: z.boolean().optional(),
    marginVertical: z.number().optional(),
    marginHorizontal: z.number().optional(),
    fontFamily: z.string().optional(),
    fontSize: z.number().optional(),
  })
  .optional();

export type HdocSettings = z.infer<typeof HdocSettingsSchema>;

/**
 * Root .hdoc file schema
 */
export const HdocFileSchema = z.object({
  // Metadata
  formatVersion: z.string(),
  generator: z.string(),
  exportedAt: z.string(),
  checksum: z.string(),

  // Content
  document: HdocDocumentSchema,
  content: HdocContentSchema,
  blocks: z.array(z.record(z.string(), z.unknown())),
  slots: z.array(HdocSlotSchema),
  variables: z.array(HdocVariableSchema),
  settings: HdocSettingsSchema,
});

export type HdocFile = z.infer<typeof HdocFileSchema>;

/**
 * Validation result type
 */
export interface HdocValidationResult {
  success: boolean;
  data?: HdocFile;
  error?: string;
  checksumValid?: boolean;
}
