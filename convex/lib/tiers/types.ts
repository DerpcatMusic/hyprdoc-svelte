/**
 * Tier System Type Definitions
 *
 * Central type definitions for the modular tier architecture.
 * Add new tier IDs here when creating new tiers.
 */

/** All available tier identifiers */
export type TierId = "free" | "pro" | "enterprise" | "custom";

/** Usage limits for a tier */
export interface TierLimits {
  /** AI Writer generations per month (-1 = unlimited) */
  aiWriterPerMonth: number;

  /** Inline AI uses per day (-1 = unlimited, 0 = use monthly limit instead) */
  inlineAiPerDay: number;

  /** Inline AI uses per month (-1 = unlimited, 0 = use daily limit instead) */
  inlineAiPerMonth: number;

  /** Envelopes that can be sent per month (-1 = unlimited) */
  envelopesPerMonth: number;
}

/** Feature flags for a tier */
export interface TierFeatures {
  /** Can use real-time collaboration */
  realtimeCollaboration: boolean;

  /** Has priority support access */
  prioritySupport: boolean;

  /** Can use custom branding */
  customBranding: boolean;

  /** Has API access */
  apiAccess: boolean;
}

/** Complete tier configuration */
export interface TierConfig {
  /** Unique tier identifier */
  id: TierId;

  /** Display name */
  name: string;

  /** Usage limits */
  limits: TierLimits;

  /** Feature flags */
  features: TierFeatures;

  /** Whether this is a paid tier */
  isPaid: boolean;
}
