import type { TierConfig } from "./types";

/**
 * Custom Tier Configuration
 *
 * Unlimited everything. Manually granted by admin only.
 * Never auto-assigned by webhooks.
 */
export const CUSTOM_TIER: TierConfig = {
  id: "custom",
  name: "Custom",
  limits: {
    aiWriterPerMonth: -1, // Unlimited
    inlineAiPerDay: -1, // Unlimited
    inlineAiPerMonth: -1, // Unlimited
    envelopesPerMonth: -1, // Unlimited
  },
  features: {
    realtimeCollaboration: true,
    prioritySupport: true,
    customBranding: true,
    apiAccess: true,
  },
  isPaid: true,
};
