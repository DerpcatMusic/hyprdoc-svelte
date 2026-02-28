/**
 * domains/audit.ts - Audit Logging Domain
 * ═══════════════════════════════════════════════════════════════
 * Single source of truth for audit logs.
 */

import { z } from "../lib/core";

// ═══════════════════════════════════════════════════════════════
// ZOD SCHEMA
// ═══════════════════════════════════════════════════════════════

export const AuditLogSchema = z.object({
  workosId: z.string().optional(),
  memberId: z.string().optional(),
  actorType: z.enum(["user", "system", "member"]),
  documentId: z.string().optional(),
  resourceType: z.enum(["document", "user", "template"]),
  resourceId: z.string(),
  action: z.string(),
  level: z.enum(["info", "warn", "error", "security"]).default("info"),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  sessionId: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  createdAt: z.number().default(() => Date.now()),
});

export type AuditLog = z.infer<typeof AuditLogSchema>;

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

/**
 * Flexible metadata schema for audit logs.
 */
export const auditMetadataSchema = z.record(z.string(), z.any()).optional();

export const aiTemplateMetadataSchema = z.object({
    projectContext: z.string().optional(),
    templateType: z.string().optional(),
    aiModel: z.string().optional(),
}).optional();
