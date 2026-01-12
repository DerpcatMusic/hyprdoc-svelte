import { v } from 'convex/values';
import { internalMutation, mutation } from '@/convex/_generated/server';

import type { TierId } from '@/convex/lib/tiers';

// Tier validator for all 4 tiers
const tierValidator = v.union(
	v.literal('free'),
	v.literal('pro'),
	v.literal('enterprise'),
	v.literal('custom')
);

/**
 * Update user subscription from Polar webhook.
 * If user doesn't exist yet, stores subscription in pending table.
 */
export const updateSubscription = mutation({
	args: {
		workosId: v.string(), // WorkOS ID (formerly workosId)
		email: v.optional(v.string()), // Added for fallback matching
		polarSubscriptionId: v.optional(v.string()),
		polarCustomerId: v.optional(v.string()),
		subscriptionStatus: v.union(
			v.literal('active'),
			v.literal('canceled'),
			v.literal('past_due'),
			v.literal('trialing'),
			v.literal('incomplete'),
			v.literal('none')
		),
		subscriptionTier: tierValidator,
		subscriptionExpiresAt: v.optional(v.number()),
		productId: v.optional(v.string()),
		hasCompletedPlanSelection: v.optional(v.boolean())
	},
	returns: v.object({
		status: v.union(v.literal('success'), v.literal('pending')),
		userId: v.optional(v.id('users')),
		workosId: v.optional(v.string())
	}),
	handler: async (ctx, args) => {
		console.log(
			`[Polar Webhook] updateSubscription called for workosId: ${args.workosId}, Email: ${args.email || 'N/A'}`
		);

		// 1. Try to find user by WorkOS ID (preferred)
		let user = await ctx.db
			.query('users')
			.withIndex('by_workos_id', (q) => q.eq('workosId', args.workosId))
			.unique();

		// 2. Fallback: Find user by email if provided
		if (!user && args.email) {
			user = await ctx.db
				.query('users')
				.withIndex('by_email', (q) => q.eq('email', args.email as string))
				.unique();

			if (user) {
				console.log(`[Polar Webhook] User found by email fallback: ${user._id}`);
			}
		}

		if (user) {
			await ctx.db.patch(user._id, {
				polarSubscriptionId: args.polarSubscriptionId,
				polarCustomerId: args.polarCustomerId,
				subscriptionStatus: args.subscriptionStatus,
				subscriptionTier: args.subscriptionTier as TierId,
				subscriptionExpiresAt: args.subscriptionExpiresAt,
				subscriptionProductId: args.productId,
				hasCompletedPlanSelection: true
			});

			console.log(
				`[Polar] Updated subscription for user ${user._id}: tier=${args.subscriptionTier}, status=${args.subscriptionStatus}`
			);

			return { status: 'success' as const, userId: user._id };
		}

		// 3. User doesn't exist yet - store as pending subscription by workosId
		console.log(`[Polar] User not found for workosId: ${args.workosId}, storing as pending`);

		const now = Date.now();
		const existing = await ctx.db
			.query('pendingSubscriptions')
			.withIndex('by_user_id', (q) => q.eq('workosId', args.workosId))
			.first();

		if (existing) {
			await ctx.db.patch(existing._id, {
				polarSubscriptionId: args.polarSubscriptionId,
				polarCustomerId: args.polarCustomerId,
				subscriptionStatus: args.subscriptionStatus,
				subscriptionTier: args.subscriptionTier,
				subscriptionExpiresAt: args.subscriptionExpiresAt,
				productId: args.productId,
				email: args.email, // Keep email updated
				attempts: existing.attempts + 1,
				lastAttemptAt: now,
				hasCompletedPlanSelection: true
			});
		} else {
			await ctx.db.insert('pendingSubscriptions', {
				workosId: args.workosId,
				polarSubscriptionId: args.polarSubscriptionId,
				polarCustomerId: args.polarCustomerId,
				subscriptionStatus: args.subscriptionStatus,
				subscriptionTier: args.subscriptionTier,
				subscriptionExpiresAt: args.subscriptionExpiresAt,
				productId: args.productId,
				email: args.email, // Store email for fallback sync in store mutation
				attempts: 1,
				lastAttemptAt: now,
				createdAt: now,
				hasCompletedPlanSelection: true
			});
		}

		return { status: 'pending' as const, workosId: args.workosId };
	}
});

/**
 * Internal mutation to expire subscriptions.
 */
export const expireSubscriptions = internalMutation({
	args: {},
	returns: v.number(),
	handler: async (ctx) => {
		const now = Date.now();

		// Find all users with expired subscriptions that are still marked as canceled
		const expiredUsers = await ctx.db
			.query('users')
			.filter((q) =>
				q.and(
					q.eq(q.field('subscriptionStatus'), 'canceled'),
					q.lt(q.field('subscriptionExpiresAt'), now)
				)
			)
			.collect();

		let count = 0;
		for (const user of expiredUsers) {
			// Only update if tier is not already free
			if (user.subscriptionTier !== 'free') {
				await ctx.db.patch(user._id, {
					subscriptionTier: 'free',
					subscriptionStatus: 'none'
				});
				count++;
				console.log(`[Polar] Expired subscription for user ${user._id}`);
			}
		}

		return count;
	}
});

/**
 * Admin-only: Grant custom tier to a user.
 * This should only be called via Convex dashboard or admin API.
 */
export const grantCustomTier = internalMutation({
	args: {
		workosId: v.string() // WorkOS ID
	},
	returns: v.boolean(),
	handler: async (ctx, { workosId }) => {
		let user = await ctx.db
			.query('users')
			.withIndex('by_workos_id', (q) => q.eq('workosId', workosId))
			.unique();
        
        if (!user) {
             user = await ctx.db
			.query('users')
			.withIndex('by_workos_id', (q) => q.eq('workosId', workosId))
			.unique();
        }

		if (!user) {
			console.error(`[Admin] User not found for workosId: ${workosId}`);
			return false;
		}

		await ctx.db.patch(user._id, {
			subscriptionTier: 'custom' as TierId,
			subscriptionStatus: 'active'
		});

		console.log(`[Admin] Granted custom tier to user ${workosId}`);
		return true;
	}
});

/**
 * Admin-only: Revoke custom tier from a user.
 */
export const revokeCustomTier = internalMutation({
	args: {
		workosId: v.string()
	},
	returns: v.boolean(),
	handler: async (ctx, { workosId }) => {
		let user = await ctx.db
			.query('users')
			.withIndex('by_workos_id', (q) => q.eq('workosId', workosId))
			.unique();
        
        if (!user) {
             user = await ctx.db
			.query('users')
			.withIndex('by_workos_id', (q) => q.eq('workosId', workosId))
			.unique();
        }

		if (!user) {
			return false;
		}

		if (user.subscriptionTier === 'custom') {
			await ctx.db.patch(user._id, {
				subscriptionTier: 'free',
				subscriptionStatus: 'none'
			});
			console.log(`[Admin] Revoked custom tier from user ${workosId}`);
		}

		return true;
	}
});

/**
 * Backfill existing free tier users to have hasCompletedPlanSelection set.
 * Run once after deploying the new schema field.
 */
export const backfillFreeTierUsers = internalMutation({
	args: {},
	returns: v.number(),
	handler: async (ctx) => {
		const users = await ctx.db
			.query('users')
			.filter((q) =>
				q.and(
					q.eq(q.field('subscriptionTier'), 'free'),
					q.neq(q.field('hasCompletedPlanSelection'), true)
				)
			)
			.collect();

		let count = 0;
		for (const user of users) {
			await ctx.db.patch(user._id, {
				hasCompletedPlanSelection: true
			});
			count++;
		}

		console.log(`[Backfill] Updated ${count} free tier users with hasCompletedPlanSelection`);
		return count;
	}
});
