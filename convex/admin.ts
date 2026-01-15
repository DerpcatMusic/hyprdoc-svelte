import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Get current user info for debugging.
 */
export const getMyUserInfo = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_workos_id", (q) => q.eq("workosId", identity.subject))
      .unique();

    return user;
  },
});

/**
 * List all users to find your ID or Email.
 * CLI: npx convex run admin:listUsers
 */
export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

/**
 * Upgrade a specific user to PRO by Email.
 * CLI: npx convex run admin:upgradeByEmail '{ "email": "your@email.com" }'
 */
export const upgradeByEmail = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (!user) {
      throw new Error(`User with email ${args.email} not found`);
    }

    await ctx.db.patch(user._id, {
      subscriptionTier: "pro",
      subscriptionStatus: "active",
      subscriptionExpiresAt: Date.now() + 100 * 365 * 24 * 60 * 60 * 1000, // 100 Years (Lifetime)
    });

    return {
      success: true,
      message: `Account ${args.email} upgraded to Pro (LIFETIME).`,
    };
  },
});

/**
 * Claim ownership of a document for a specific user.
 * CLI: npx convex run admin:claimOwnership '{ "documentId": "...", "email": "your@email.com" }'
 */
export const claimOwnership = mutation({
  args: {
    documentId: v.id("documents"),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (!user) {
      throw new Error(`User with email ${args.email} not found`);
    }

    const doc = await ctx.db.get(args.documentId);
    if (!doc) {
      throw new Error("Document not found");
    }

    await ctx.db.patch(args.documentId, {
      ownerId: user._id,
    });

    return {
      success: true,
      message: `Ownership of "${doc.title}" transferred to ${args.email}`,
    };
  },
});
