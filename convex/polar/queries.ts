import { v } from "convex/values";
import { query } from "@/convex/_generated/server";
import {
  getUserTier,
  isSubscriptionActive,
  userHasFeature,
} from "@/convex/lib/subscription";
import { getTier } from "@/convex/lib/tiers";

const subscriptionStatusValidator = v.union(
  v.literal("active"),
  v.literal("canceled"),
  v.literal("past_due"),
  v.literal("trialing"),
  v.literal("incomplete"),
  v.literal("none")
);

const tierValidator = v.union(
  v.literal("free"),
  v.literal("pro"),
  v.literal("enterprise"),
  v.literal("custom")
);

/**
 * Get current subscription status for the authenticated user.
 */
export const getSubscriptionStatus = query({
  args: {},
  returns: v.union(
    v.object({
      tier: tierValidator,
      tierName: v.string(),
      status: subscriptionStatusValidator,
      expiresAt: v.optional(v.number()),
      isPaid: v.boolean(),
      isActive: v.boolean(),
      polarCustomerId: v.optional(v.string()),
      features: v.object({
        realtimeCollaboration: v.boolean(),
        prioritySupport: v.boolean(),
        customBranding: v.boolean(),
        apiAccess: v.boolean(),
      }),
      isPro: v.boolean(),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_workos_id", (q) => q.eq("workosId", identity.subject))
      .unique();

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
export const isPro = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_workos_id", (q) => q.eq("workosId", identity.subject))
      .unique();

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
export const canUseRealtimeCollaboration = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_workos_id", (q) => q.eq("workosId", identity.subject))
      .unique();

    if (!user) {
      return false;
    }

    return userHasFeature(user, "realtimeCollaboration");
  },
});
