import { zInternalMutation, zInternalQuery, z, zid } from "../lib/core";
import type { TierId } from "../lib/tiers";

const TierSchema = z.enum(["free", "pro", "enterprise", "custom"]);

const StatusSchema = z.enum([
  "active",
  "canceled",
  "past_due",
  "trialing",
  "incomplete",
  "none"
]);

/**
 * Store a pending subscription when user doesn't exist yet.
 * Called by updateSubscription when user lookup fails.
 */
export const storePending = zInternalMutation({
  args: {
    workosId: z.string(),
    polarSubscriptionId: z.string().optional(),
    polarCustomerId: z.string().optional(),
    subscriptionStatus: StatusSchema,
    subscriptionTier: TierSchema,
    subscriptionExpiresAt: z.number().optional(),
    productId: z.string().optional(),
    email: z.string().optional(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if we already have a pending subscription for this user
    const existing = await ctx.db
      .query("pendingSubscriptions")
      .withIndex("by_user_id", (q) => q.eq("workosId", args.workosId))
      .first();

    if (existing) {
      // Update existing pending subscription with latest data
      await ctx.db.patch(existing._id, {
        polarSubscriptionId: args.polarSubscriptionId,
        polarCustomerId: args.polarCustomerId,
        subscriptionStatus: args.subscriptionStatus,
        subscriptionTier: args.subscriptionTier,
        subscriptionExpiresAt: args.subscriptionExpiresAt,
        productId: args.productId,
        attempts: existing.attempts + 1,
        lastAttemptAt: now,
      });
      console.log(
        `[Polar] Updated pending subscription for workosId: ${args.workosId}`
      );
      return existing._id;
    }

    // Create new pending subscription
    const id = await ctx.db.insert("pendingSubscriptions", {
      workosId: args.workosId,
      polarSubscriptionId: args.polarSubscriptionId,
      polarCustomerId: args.polarCustomerId,
      subscriptionStatus: args.subscriptionStatus,
      subscriptionTier: args.subscriptionTier,
      subscriptionExpiresAt: args.subscriptionExpiresAt,
      productId: args.productId,
      email: args.email,
      attempts: 1,
      lastAttemptAt: now,
      createdAt: now,
    });

    console.log(
      `[Polar] Stored pending subscription for workosId: ${args.workosId}`
    );
    return id;
  },
});

/**
 * Get pending subscription for a user.
 */
export const getPending = zInternalQuery({
  args: {
    workosId: z.string(),
  },
  handler: async (ctx, { workosId }) => {
    return await ctx.db
      .query("pendingSubscriptions")
      .withIndex("by_user_id", (q) => q.eq("workosId", workosId))
      .first();
  },
});

/**
 * Apply pending subscription to a user and delete the pending record.
 */
export const applyPending = zInternalMutation({
  args: {
    workosId: z.string(),
  },
  handler: async (ctx, { workosId }) => {
    // Get pending subscription
    const pending = await ctx.db
      .query("pendingSubscriptions")
      .withIndex("by_user_id", (q) => q.eq("workosId", workosId))
      .first();

    if (!pending) {
      return false;
    }

    // Find user - Try WorkOS ID first
    const user = await ctx.db
      .query("users")
      .withIndex("by_workos_id", (q) => q.eq("workosId", workosId))
      .unique();

    if (!user) {
      console.log(
        `[Polar] User still doesn't exist for pending subscription: ${workosId}`
      );
      return false;
    }

    // Apply subscription data to user
    await ctx.db.patch(user._id, {
      polarSubscriptionId: pending.polarSubscriptionId,
      polarCustomerId: pending.polarCustomerId,
      subscriptionStatus: pending.subscriptionStatus,
      subscriptionTier: pending.subscriptionTier as TierId,
      subscriptionExpiresAt: pending.subscriptionExpiresAt,
      subscriptionProductId: pending.productId,
    });

    // Delete pending record
    await ctx.db.delete(pending._id);

    console.log(`[Polar] Applied pending subscription to user ${workosId}`);
    return true;
  },
});

/**
 * Clean up old pending subscriptions (older than 24 hours).
 */
export const cleanupOldPending = zInternalMutation({
  args: {},
  handler: async (ctx) => {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    const oldPending = await ctx.db
      .query("pendingSubscriptions")
      .filter((q) => q.lt(q.field("createdAt"), oneDayAgo))
      .collect();

    for (const pending of oldPending) {
      await ctx.db.delete(pending._id);
      console.log(
        `[Polar] Cleaned up stale pending subscription for: ${pending.workosId}`
      );
    }

    return oldPending.length;
  },
});
