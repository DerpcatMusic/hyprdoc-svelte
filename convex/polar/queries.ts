import { zQuery, z } from "../lib/core";
import {
  getUserTier,
  isSubscriptionActive,
  userHasFeature,
} from "../lib/subscription";
import { getTier } from "../lib/tiers";

const SubscriptionStatusSchema = z.enum([
  "active",
  "canceled",
  "past_due",
  "trialing",
  "incomplete",
  "none"
]);

const TierSchema = z.enum([
  "free",
  "pro",
  "enterprise",
  "custom"
]);

/**
 * Get current subscription status for the authenticated user.
 */
export const getSubscriptionStatus = zQuery({
  args: {},
  handler: async (ctx) => {
    if (!ctx.user) {
      return null;
    }

    const user = await ctx.db.get(ctx.user._id);

    if (!user) {
      return null;
    }

    const tier = getUserTier(user);
    const tierConfig = getTier(tier);
    const status = user.subscriptionStatus ?? "none";
    const isActive = isSubscriptionActive(user);

    return {
      tier: isActive ? tier : "free",
      tierName: isActive ? tierConfig.name : "Free",
      status,
      expiresAt: user.subscriptionExpiresAt,
      isPaid: tierConfig.isPaid && isActive,
      isActive,
      polarCustomerId: user.polarCustomerId,
      features: tierConfig.features,
      isPro: tier !== "free",
    };
  },
});

/**
 * Check if user has an active paid subscription (any tier above free).
 */
export const isPro = zQuery({
  args: {},
  handler: async (ctx) => {
    if (!ctx.user) {
      return false;
    }

    const user = await ctx.db.get(ctx.user._id);

    if (!user) {
      return false;
    }

    const tier = getUserTier(user);
    return tier !== "free";
  },
});

/**
 * Check if user has access to real-time collaboration.
 */
export const canUseRealtimeCollaboration = zQuery({
  args: {},
  handler: async (ctx) => {
    if (!ctx.user) {
      return false;
    }

    const user = await ctx.db.get(ctx.user._id);

    if (!user) {
      return false;
    }

    return userHasFeature(user, "realtimeCollaboration");
  },
});
