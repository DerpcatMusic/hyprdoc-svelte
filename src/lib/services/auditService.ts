import { auditLog } from "$lib/logger";
import type { AuditLogEntry } from "$lib/types";

/**
 * Audit Service - Security-critical event logging
 *
 * Uses tslog for structured logging while maintaining an in-memory trail
 * for compliance and debugging purposes.
 */
class AuditService {
  private logs: AuditLogEntry[] = [];

  private createEntry(
    level: "info" | "warn" | "error",
    action: string,
    metadata: Record<string, unknown>
  ): AuditLogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      action,
      metadata,
      actorType: "system",
      resourceType: "app",
      resourceId: "local",
    };
  }

  public info(action: string, details: Record<string, unknown> = {}) {
    const entry = this.createEntry("info", action, details);
    this.logs.push(entry);
    auditLog.info(action, details);
  }

  public warn(action: string, details: Record<string, unknown> = {}) {
    const entry = this.createEntry("warn", action, details);
    this.logs.push(entry);
    auditLog.warn(action, details);
  }

  public error(action: string, details: Record<string, unknown> = {}) {
    const entry = this.createEntry("error", action, details);
    this.logs.push(entry);
    auditLog.error(action, details);
  }

  public getTrail() {
    return this.logs;
  }

  /** Clear audit trail (use sparingly, mainly for testing) */
  public clear() {
    this.logs = [];
  }
}

export const auditLogger = new AuditService();
