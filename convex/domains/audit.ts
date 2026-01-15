/**
 * domains/audit.ts - Audit Logging Domain
 * ═══════════════════════════════════════════════════════════════
 * Single source of truth for audit logs.
 */

import { z } from "zod";
import { v } from "convex/values";

// ═══════════════════════════════════════════════════════════════
// ZOD SCHEMA
// ═══════════════════════════════════════════════════════════════

export const AuditLogSchema = z.object({
  workosId: z.string().optional(),
  actorType: z.enum(["user", "system", "api"]),
  documentId: z.string().optional(),
  resourceType: z.enum(["document", "user", "template", "system"]),
  resourceId: z.string(),
  action: z.string(),
  level: z.enum(["info", "warning", "error"]).default("info"),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  createdAt: z.number().default(() => Date.now()),
});

export type AuditLog = z.infer<typeof AuditLogSchema>;

// ═══════════════════════════════════════════════════════════════
// CONVEX VALIDATORS
// ═══════════════════════════════════════════════════════════════

/**
 * Flexible metadata validator for audit logs.
 * Matches Zod's z.record(z.string(), z.any())
 */
export const auditMetadataValidator = v.optional(v.any());

export const aiTemplateMetadataValidator = v.optional(
  v.object({
    projectContext: v.optional(v.string()),
    templateType: v.optional(v.string()),
    aiModel: v.optional(v.string()),
  })
);
