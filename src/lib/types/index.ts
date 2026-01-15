// ═══════════════════════════════════════════════════════════════
// SHARED TYPES - Re-exported from Backend Domains
// ═══════════════════════════════════════════════════════════════

export * from "../../../convex/domains/settings";
export * from "../../../convex/domains/documents";

export interface AuditLogEntry {
  timestamp: string;
  level: "info" | "warn" | "error";
  action: string;
  metadata: Record<string, unknown>;
  actorType: "user" | "system" | "admin";
  actorId?: string;
  resourceType: string;
  resourceId: string;
}

export type FieldValue = string | boolean | null;
export type FieldValuesMap = Record<string, FieldValue>;

