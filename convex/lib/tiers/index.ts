/**
 * Tier System - Central Registry
 *
 * To add a new tier:
 * 1. Create a new file (e.g., `newtier.ts`) with TierConfig
 * 2. Import it here
 * 3. Add to TIERS registry
 * 4. Add tier ID to TierId union in types.ts
 * 5. Update schema.ts subscriptionTier validator
 */

import { CUSTOM_TIER } from "./custom";
import { ENTERPRISE_TIER } from "./enterprise";
import { FREE_TIER } from "./free";
import { PRO_TIER } from "./pro";
import type { TierConfig, TierId } from "./types";

// ═══════════════════════════════════════════════════════════════
// TIER REGISTRY - Add new tiers here
// ═══════════════════════════════════════════════════════════════

export const TIERS: Record<TierId, TierConfig> = {
  free: FREE_TIER,
  pro: PRO_TIER,
  enterprise: ENTERPRISE_TIER,
  custom: CUSTOM_TIER,
};

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get tier configuration by ID. Falls back to free tier if not found.
 */
export function getTier(tierId: TierId | undefined): TierConfig {
  if (!tierId) {
    return FREE_TIER;
  }
  return TIERS[tierId] ?? FREE_TIER;
}

/**
 * Check if a limit value represents unlimited (-1)
 */
export function isUnlimited(value: number): boolean {
  return value === -1;
}

/**
 * Check if a tier is paid
 */
export function isPaidTier(tierId: TierId | undefined): boolean {
  return getTier(tierId).isPaid;
}

/**
 * Check if a tier has a specific feature
 */
export function hasFeature(
  tierId: TierId | undefined,
  feature: keyof TierConfig["features"]
): boolean {
  return getTier(tierId).features[feature];
}

/**
 * Get the appropriate limit for inline AI based on tier.
 * Free tier uses daily limit, paid tiers may use monthly.
 */
export function getInlineAiLimit(tierId: TierId | undefined): {
  type: "daily" | "monthly";
  limit: number;
} {
  const tier = getTier(tierId);

  // If daily limit is set (non-zero), use it
  if (tier.limits.inlineAiPerDay !== 0) {
    return { type: "daily", limit: tier.limits.inlineAiPerDay };
  }

  // Otherwise use monthly limit
  return { type: "monthly", limit: tier.limits.inlineAiPerMonth };
}

// Re-export types and individual tiers for convenience
export * from "./types";
export { FREE_TIER, PRO_TIER, ENTERPRISE_TIER, CUSTOM_TIER };
