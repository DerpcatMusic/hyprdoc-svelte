// convex/hyprsign/mutations.ts
import { v } from 'convex/values';
import { mutation } from '@/convex/_generated/server';

/**
 * Record HyprSign usage after successful sign.
 */
export const recordUsage = mutation({
	args: {
		fingerprint: v.string()
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const currentMonth = new Date().toISOString().slice(0, 7);
		const identity = await ctx.auth.getUserIdentity();

		if (identity) {
			// Authenticated user
			const user = await ctx.db
				.query('users')
				.withIndex('by_workos_id', (q) => q.eq('workosId', identity.subject))
				.unique();

			if (user) {
				const isNewMonth = user.hyprSignMonthResetDate !== currentMonth;
				await ctx.db.patch(user._id, {
					hyprSignUsesThisMonth: isNewMonth ? 1 : (user.hyprSignUsesThisMonth || 0) + 1,
					hyprSignMonthResetDate: currentMonth
				});
			}
		} else {
			// Anonymous user
			const existing = await ctx.db
				.query('hyprSignAnonymousUsage')
				.withIndex('by_fingerprint', (q) => q.eq('fingerprint', args.fingerprint))
				.unique();

			if (existing) {
				const isNewMonth = existing.monthResetDate !== currentMonth;
				await ctx.db.patch(existing._id, {
					usesThisMonth: isNewMonth ? 1 : existing.usesThisMonth + 1,
					monthResetDate: currentMonth,
					lastUsedAt: Date.now()
				});
			} else {
				await ctx.db.insert('hyprSignAnonymousUsage', {
					fingerprint: args.fingerprint,
					usesThisMonth: 1,
					monthResetDate: currentMonth,
					lastUsedAt: Date.now()
				});
			}
		}

		return null;
	}
});

/**
 * Update user's auto-fill profile for HyprSign.
 */
export const updateAutoFillProfile = mutation({
	args: {
		firstName: v.optional(v.string()),
		lastName: v.optional(v.string()),
		fullName: v.optional(v.string()),
		email: v.optional(v.string()),
		phoneNumber: v.optional(v.string()),
		phoneCountryCode: v.optional(v.string()),
		physicalAddress: v.optional(v.string()),
		city: v.optional(v.string()),
		state: v.optional(v.string()),
		zipCode: v.optional(v.string()),
		country: v.optional(v.string()),
		companyName: v.optional(v.string()),
		jobTitle: v.optional(v.string()),
		dateOfBirth: v.optional(v.string())
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) { throw new Error('Authentication required'); }

		const user = await ctx.db
			.query('users')
			.withIndex('by_workos_id', (q) => q.eq('workosId', identity.subject))
			.unique();

		if (!user) { throw new Error('User not found'); }

		await ctx.db.patch(user._id, {
			autoFillProfile: {
				firstName: args.firstName,
				lastName: args.lastName,
				fullName: args.fullName,
				email: args.email,
				phoneNumber: args.phoneNumber,
				phoneCountryCode: args.phoneCountryCode,
				physicalAddress: args.physicalAddress,
				city: args.city,
				state: args.state,
				zipCode: args.zipCode,
				country: args.country,
				companyName: args.companyName,
				jobTitle: args.jobTitle,
				dateOfBirth: args.dateOfBirth
			}
		});

		return null;
	}
});

/**
 * Mark auto-fill onboarding as completed.
 */
export const completeOnboarding = mutation({
	args: {},
	returns: v.null(),
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) { throw new Error('Authentication required'); }

		const user = await ctx.db
			.query('users')
			.withIndex('by_workos_id', (q) => q.eq('workosId', identity.subject))
			.unique();

		if (!user) { throw new Error('User not found'); }

		await ctx.db.patch(user._id, {
			autoFillOnboardingCompleted: true
		});

		return null;
	}
});
