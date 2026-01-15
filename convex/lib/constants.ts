/**
 * Application Constants
 * Centralized location for shared constants across the codebase.
 */

// ═══════════════════════════════════════════════════════════════════════════
// Slot/Signer Colors (REMOVED)
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// Document Status Constants
// ═══════════════════════════════════════════════════════════════════════════

export const DOCUMENT_STATUSES = [
  "draft",
  "pending_signatures",
  "completed",
  "voided",
  "expired",
] as const;

export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

// ═══════════════════════════════════════════════════════════════════════════
// Signer Status Constants (REMOVED)
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// Token Expiry
// ═══════════════════════════════════════════════════════════════════════════

export const TOKEN_EXPIRY_DAYS = 30;
export const OTP_EXPIRY_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;
export const SESSION_TIMEOUT_HOURS = 4;

// ═══════════════════════════════════════════════════════════════════════════
// Reminder Settings
// ═══════════════════════════════════════════════════════════════════════════

export const REMINDER_THRESHOLD_HOURS = 48;
export const REMINDER_MAX_COUNT = 3;
// ═══════════════════════════════════════════════════════════════════════════
// REMOVED: Document Settings Defaults (Moved to domains/document-settings)
// ═══════════════════════════════════════════════════════════════════════════
