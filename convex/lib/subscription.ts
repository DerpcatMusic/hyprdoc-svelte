/**
 * Subscription Validation Helpers
 *
 * Uses the modular tier system from ./tiers/
 * This file provides convenience functions for checking subscription status.
 */

import type { Doc } from "@/convex/_generated/dataModel";

import { getTier, hasFeature, isUnlimited, type TierId } from "./tiers";

type User = Doc<"users">;

// ═══════════════════════════════════════════════════════════════
// SUBSCRIPTION STATUS CHECKING
// ═══════════════════════════════════════════════════════════════

interface SubscriptionStatus {
  isActive: boolean;
  tier: TierId;
  status:
    | "active"
    | "canceled"
    | "past_due"
    | "trialing"
    | "incomplete"
    | "none";
  expiresAt?: number;
}

/**
 * Check if a user's subscription is active.
 * Active means:
 * - Status is "active" or "trialing"
 * - OR status is "canceled" but expiration date hasn't passed yet
 */
export function isSubscriptionActive(user: User): boolean {
  const status = user.subscriptionStatus ?? "none";
  const expiresAt = user.subscriptionExpiresAt;

  return (
    status === "active" ||
    status === "trialing" ||
    (status === "canceled" && expiresAt !== undefined && expiresAt > Date.now())
  );
}

/**
 * Get complete subscription status for a user.
 */
export function getSubscriptionStatus(user: User): SubscriptionStatus {
  const tier = (user.subscriptionTier ?? "free") as TierId;
  const status = user.subscriptionStatus ?? "none";
  const isActive = isSubscriptionActive(user);

  return {
    isActive,
    tier: isActive ? tier : "free",
    status,
    expiresAt: user.subscriptionExpiresAt,
  };
}

/**
 * Check if user has any paid tier with active subscription.
 */
export function isPaidUser(user: User): boolean {
  const tier = (user.subscriptionTier ?? "free") as TierId;
  return tier !== "free" && isSubscriptionActive(user);
}

/**
 * Get user's current tier ID
 */
export function getUserTier(user: User): TierId {
  if (!isSubscriptionActive(user)) {
    return "free";
  }
  return (user.subscriptionTier ?? "free") as TierId;
}

/**
 * Check if user has access to a specific feature
 */
export function userHasFeature(
  user: User,
  feature:
    | "realtimeCollaboration"
    | "prioritySupport"
    | "customBranding"
    | "apiAccess"
): boolean {
  const tier = getUserTier(user);
  return hasFeature(tier, feature);
}

// ═══════════════════════════════════════════════════════════════
// QUOTA HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Get the AI Writer monthly limit for a user
 */
export function getAiWriterLimit(user: User): number {
  const tier = getUserTier(user);
  return getTier(tier).limits.aiWriterPerMonth;
}

/**
 * Get the envelope monthly limit for a user
 */
export function getEnvelopeLimit(user: User): number {
  const tier = getUserTier(user);
  return getTier(tier).limits.envelopesPerMonth;
}

/**
 * Get inline AI limit info for a user
 */
export function getInlineAiLimitInfo(user: User): {
  type: "daily" | "monthly";
  limit: number;
} {
  const tier = getUserTier(user);
  const config = getTier(tier);

  if (config.limits.inlineAiPerDay !== 0) {
    return { type: "daily", limit: config.limits.inlineAiPerDay };
  }
  return { type: "monthly", limit: config.limits.inlineAiPerMonth };
}

/**
 * Check if a limit value means unlimited
 */
export function isLimitUnlimited(limit: number): boolean {
  return isUnlimited(limit);
}

// Re-export tier utilities for convenience
export { getTier, hasFeature, isUnlimited, type TierId } from "./tiers";

// ═══════════════════════════════════════════════════════════════
// LEGACY COMPATIBILITY - DEPRECATED
// ═══════════════════════════════════════════════════════════════

/**
 * @deprecated Use isPaidUser() or getUserTier() instead
 */
export function isPro(user: User): boolean {
  const tier = getUserTier(user);
  return tier !== "free";
}

/**
 * @deprecated Use getTier(getUserTier(user)).limits instead
 */
export const QUOTAS = {
  free: {
    signingSendsPerMonth: 3,
    aiWriterUsesPerMonth: 3,
    inlineAiUsesPerDay: 5,
  },
  pro: {
    signingSendsPerMonth: 30,
    aiWriterUsesPerMonth: 30,
    inlineAiUsesPerDay: 250,
  },
} as const;

/**
 * @deprecated Use getTier(getUserTier(user)).limits instead
 */
export function getQuotaLimits(user: User) {
  return isPro(user) ? QUOTAS.pro : QUOTAS.free;
}
