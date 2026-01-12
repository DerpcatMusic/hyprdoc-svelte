// convex/hyprsign/queries.ts
import { v } from 'convex/values';
import { query } from '@/convex/_generated/server';

/**
 * Get usage status for HyprSign.
 * Anonymous users: 1/month, Authenticated users: 3/month
 */
export const getUsageStatus = query({
	args: {
		fingerprint: v.string(),
		isAuthenticated: v.boolean()
	},
	returns: v.object({
		canUse: v.boolean(),
		used: v.number(),
		remaining: v.number(),
		limit: v.number()
	}),
	handler: async (ctx, args) => {
		const currentMonth = new Date().toISOString().slice(0, 7); // "2026-01"

		if (args.isAuthenticated) {
			const identity = await ctx.auth.getUserIdentity();
			if (!identity) {
				return { canUse: false, used: 0, remaining: 0, limit: 3 };
			}

			const user = await ctx.db
				.query('users')
				.withIndex('by_workos_id', (q) => q.eq('workosId', identity.subject))
				.unique();

			if (!user) {
				return { canUse: true, used: 0, remaining: 3, limit: 3 };
			}

			// Reset if new month
			if (user.hyprSignMonthResetDate !== currentMonth) {
				return { canUse: true, used: 0, remaining: 3, limit: 3 };
			}

			const used = user.hyprSignUsesThisMonth || 0;
			return {
				canUse: used < 3,
				used,
				remaining: 3 - used,
				limit: 3
			};
		}
			// Anonymous user - check fingerprint
			const usage = await ctx.db
				.query('hyprSignAnonymousUsage')
				.withIndex('by_fingerprint', (q) => q.eq('fingerprint', args.fingerprint))
				.unique();

			if (!usage || usage.monthResetDate !== currentMonth) {
				return { canUse: true, used: 0, remaining: 1, limit: 1 };
			}

			return {
				canUse: usage.usesThisMonth < 1,
				used: usage.usesThisMonth,
				remaining: 1 - usage.usesThisMonth,
				limit: 1
			};
	}
});

/**
 * Get user's auto-fill profile for HyprSign.
 */
export const getAutoFillProfile = query({
	args: {},
	returns: v.union(
		v.object({
			fullName: v.optional(v.string()),
			phoneNumber: v.optional(v.string()),
			physicalAddress: v.optional(v.string()),
			city: v.optional(v.string()),
			state: v.optional(v.string()),
			zipCode: v.optional(v.string()),
			country: v.optional(v.string()),
			companyName: v.optional(v.string()),
			jobTitle: v.optional(v.string()),
			dateOfBirth: v.optional(v.string())
		}),
		v.null()
	),
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) { return null; }

		const user = await ctx.db
			.query('users')
			.withIndex('by_workos_id', (q) => q.eq('workosId', identity.subject))
			.unique();

		if (!user) { return null; }

		return user.autoFillProfile || null;
	}
});

/**
 * Check if user has completed auto-fill onboarding.
 */
export const hasCompletedOnboarding = query({
	args: {},
	returns: v.boolean(),
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) { return true; // Don't show modal if not authenticated
}

		const user = await ctx.db
			.query('users')
			.withIndex('by_workos_id', (q) => q.eq('workosId', identity.subject))
			.unique();

		if (!user) { return false; }

		return !!user.autoFillOnboardingCompleted;
	}
});
