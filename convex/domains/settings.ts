/**
 * domains/settings.ts - Document Settings Domain
 * ═══════════════════════════════════════════════════════════════
 * Single source of truth for document settings.
 */

import { z } from "zod";
import { v } from "convex/values";

// ═══════════════════════════════════════════════════════════════
// ZOD SCHEMA — SINGLE SOURCE OF TRUTH
// ═══════════════════════════════════════════════════════════════

export const DocumentSettingsSchema = z.object({
  // Page dimensions
  pageWidth: z.number().min(100).max(10000).default(816),
  pageHeight: z.number().min(100).max(15000).default(1056),
  
  // Margins
  marginVertical: z.number().min(0).max(5000).default(96),
  marginHorizontal: z.number().min(0).max(5000).default(96),
  marginLeft: z.number().min(0).max(5000).optional(),
  marginRight: z.number().min(0).max(5000).optional(),
  showMargins: z.boolean().default(true),
  
  // Visual
  paperTexture: z.string().default("none"),
  paperTextureOpacity: z.number().min(0).max(1).default(0.5),
  paperTextureScale: z.number().default(1),
  paperTextureColor: z.string().default("#000000"),
  paperTextureMonochromatic: z.boolean().default(true),
  backgroundColor: z.string().default("#ffffff"),
  
  // Typography
  fontSize: z.number().default(16),
  lineHeight: z.number().default(1.5),
  fontBody: z.string().default("Inter"),
  fontTitle: z.string().default("Inter"),
  
  // Features
  realTimeEnabled: z.boolean().default(false),
  isPublic: z.boolean().default(false),
  mirrorMargins: z.boolean().default(false),
  
  // Template settings
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  description: z.string().optional(),
});

// ═══════════════════════════════════════════════════════════════
// DERIVED TYPES
// ═══════════════════════════════════════════════════════════════

export type DocumentSettings = z.infer<typeof DocumentSettingsSchema>;

// ═══════════════════════════════════════════════════════════════
// DEFAULTS
// ═══════════════════════════════════════════════════════════════

export const DEFAULT_DOCUMENT_SETTINGS: DocumentSettings = {
  pageWidth: 816,
  pageHeight: 1056,
  marginVertical: 96,
  marginHorizontal: 96,
  showMargins: true,
  paperTexture: "none",
  paperTextureOpacity: 0.5,
  paperTextureScale: 1,
  paperTextureColor: "#000000",
  paperTextureMonochromatic: true,
  backgroundColor: "#ffffff",
  fontSize: 16,
  lineHeight: 1.5,
  fontBody: "inter",
  fontTitle: "inter",
  realTimeEnabled: false,
  isPublic: false,
  mirrorMargins: false,
};

// ═══════════════════════════════════════════════════════════════
// CONVEX VALIDATORS
// ═══════════════════════════════════════════════════════════════

export const documentSettingsValidator = v.object({
  pageWidth: v.optional(v.number()),
  pageHeight: v.optional(v.number()),
  marginVertical: v.optional(v.number()),
  marginHorizontal: v.optional(v.number()),
  marginLeft: v.optional(v.number()),
  marginRight: v.optional(v.number()),
  showMargins: v.optional(v.boolean()),
  paperTexture: v.optional(v.string()),
  paperTextureOpacity: v.optional(v.number()),
  paperTextureScale: v.optional(v.number()),
  paperTextureColor: v.optional(v.string()),
  paperTextureMonochromatic: v.optional(v.boolean()),
  backgroundColor: v.optional(v.string()),
  fontSize: v.optional(v.number()),
  lineHeight: v.optional(v.number()),
  fontBody: v.optional(v.string()),
  fontTitle: v.optional(v.string()),
  realTimeEnabled: v.optional(v.boolean()),
  isPublic: v.optional(v.boolean()),
  mirrorMargins: v.optional(v.boolean()),
  category: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
  description: v.optional(v.string()),
});

export const partialDocumentSettingsValidator = v.object({
  pageWidth: v.optional(v.number()),
  pageHeight: v.optional(v.number()),
  marginVertical: v.optional(v.number()),
  marginHorizontal: v.optional(v.number()),
  marginLeft: v.optional(v.number()),
  marginRight: v.optional(v.number()),
  showMargins: v.optional(v.boolean()),
  paperTexture: v.optional(v.string()),
  paperTextureOpacity: v.optional(v.number()),
  paperTextureScale: v.optional(v.number()),
  paperTextureColor: v.optional(v.string()),
  paperTextureMonochromatic: v.optional(v.boolean()),
  backgroundColor: v.optional(v.string()),
  fontSize: v.optional(v.number()),
  lineHeight: v.optional(v.number()),
  fontBody: v.optional(v.string()),
  fontTitle: v.optional(v.string()),
  realTimeEnabled: v.optional(v.boolean()),
  isPublic: v.optional(v.boolean()),
  mirrorMargins: v.optional(v.boolean()),
  category: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
  description: v.optional(v.string()),
});

// ═══════════════════════════════════════════════════════════════
// SANITIZATION
// ═══════════════════════════════════════════════════════════════

/**
 * Sanitize settings before sending to Convex.
 * Strips undefined values and ensures correct types.
 */
export function sanitizeSettings(settings: Partial<DocumentSettings>): Partial<DocumentSettings> {
  const result: Partial<DocumentSettings> = {};
  
  const numericKeys = [
    'pageWidth', 'pageHeight', 'marginVertical', 'marginHorizontal',
    'marginLeft', 'marginRight', 'paperTextureOpacity', 'paperTextureScale',
    'fontSize', 'lineHeight'
  ] as const;
  
  const booleanKeys = ['showMargins', 'realTimeEnabled', 'isPublic', 'paperTextureMonochromatic', 'mirrorMargins'] as const;
  const stringKeys = ['paperTexture', 'backgroundColor', 'category', 'description', 'fontBody', 'fontTitle', 'paperTextureColor'] as const;
  
  for (const key of numericKeys) {
    if (settings[key] !== undefined) {
      const val = settings[key];
      result[key] = typeof val === 'string' ? parseFloat(val) : val;
    }
  }
  
  for (const key of booleanKeys) {
    if (settings[key] !== undefined) {
      result[key] = settings[key];
    }
  }
  
  for (const key of stringKeys) {
    if (settings[key] !== undefined) {
      result[key] = settings[key];
    }
  }
  
  if (settings.tags !== undefined) {
    result.tags = settings.tags;
  }
  
  return result;
}
