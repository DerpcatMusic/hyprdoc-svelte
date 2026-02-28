/**
 * domains/documents.ts - Documents Domain
 * ═══════════════════════════════════════════════════════════════
 * Single source of truth for document data.
 */

import { z } from "../lib/core";

// ═══════════════════════════════════════════════════════════════
// ZOD SCHEMA — SINGLE SOURCE OF TRUTH
// ═══════════════════════════════════════════════════════════════

export const DocumentStatusSchema = z.enum([
  "draft",
  "pending_signatures",
  "completed",
  "expired",
  "voided",
]);

export const DocumentKindSchema = z.enum(["template", "envelope"]);

export const DocumentSchema = z.object({
  ownerId: z.string(), // Reference to users._id
  title: z.string().min(1).max(255),
  content: z.string(),
  blocks: z.any(), // v.any() until smart blocks rebuilt
  status: DocumentStatusSchema.default("draft"),
  kind: DocumentKindSchema.optional(),
  sourceTemplateId: z.string().optional(),
  instanceNumber: z.number().optional(),
  instanceCount: z.number().optional(),
  version: z.number().default(1),
  isPublic: z.boolean().default(false),
  createdAt: z.number().default(() => Date.now()),
  updatedAt: z.number().default(() => Date.now()),
});

// ═══════════════════════════════════════════════════════════════
// DERIVED TYPES
// ═══════════════════════════════════════════════════════════════

export type Document = z.infer<typeof DocumentSchema>;
export type DocumentStatus = z.infer<typeof DocumentStatusSchema>;
export type DocumentKind = z.infer<typeof DocumentKindSchema>;
