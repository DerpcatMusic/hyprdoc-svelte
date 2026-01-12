/**
 * Usage Tracking Mutations
 *
 * Tracks usage of AI features and envelope sending against tier limits.
 */

import { v } from 'convex/values';
import { internalMutation, mutation } from '@/convex/_generated/server';
import {
	getEnvelopeLimit,
	getInlineAiLimitInfo,
	isLimitUnlimited
} from '@/convex/lib/subscription';

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function getCurrentMonth(): string {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getCurrentDay(): string {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// ═══════════════════════════════════════════════════════════════
// INLINE AI USAGE
// ═══════════════════════════════════════════════════════════════

export const incrementInlineAi = mutation({
	args: {},
	returns: v.object({
		success: v.boolean(),
		remaining: v.number(),
		limitType: v.union(v.literal('daily'), v.literal('monthly')),
		message: v.optional(v.string())
	}),
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) { throw new Error('Authentication required'); }

		const user = await ctx.db
			.query('users')
			.withIndex('by_workos_id', (q) => q.eq('workosId', identity.subject))
			.unique();

		if (!user) { throw new Error('User not found'); }

		const limitInfo = getInlineAiLimitInfo(user);
		const { type, limit } = limitInfo;

		// Unlimited check
		if (isLimitUnlimited(limit)) {
			return { success: true, remaining: -1, limitType: type as 'daily' | 'monthly' };
		}

		if (type === 'daily') {
			const currentDay = getCurrentDay();
			const resetDate = user.inlineAiDayResetDate;

			let currentCount: number;

			if (!resetDate || resetDate !== currentDay) {
				// New day, reset counter
				currentCount = 1;
				await ctx.db.patch(user._id, {
					inlineAiUsesThisDay: currentCount,
					inlineAiDayResetDate: currentDay
				});
			} else {
				currentCount = (user.inlineAiUsesThisDay ?? 0) + 1;

				if (currentCount > limit) {
					return {
						success: false,
						remaining: 0,
						limitType: 'daily' as const,
						message: 'Daily inline AI limit reached. Resets at midnight.'
					};
				}

				await ctx.db.patch(user._id, { inlineAiUsesThisDay: currentCount });
			}

			return {
				success: true,
				remaining: Math.max(0, limit - currentCount),
				limitType: 'daily' as const
			};
		}
			// Monthly limit
			const currentMonth = getCurrentMonth();
			const resetDate = user.inlineAiMonthResetDate;

			let currentCount: number;

			if (!resetDate || resetDate !== currentMonth) {
				currentCount = 1;
				await ctx.db.patch(user._id, {
					inlineAiUsesThisMonth: currentCount,
					inlineAiMonthResetDate: currentMonth
				});
			} else {
				currentCount = (user.inlineAiUsesThisMonth ?? 0) + 1;

				if (currentCount > limit) {
					return {
						success: false,
						remaining: 0,
						limitType: 'monthly' as const,
						message: 'Monthly inline AI limit reached. Upgrade for more.'
					};
				}

				await ctx.db.patch(user._id, { inlineAiUsesThisMonth: currentCount });
			}

			return {
				success: true,
				remaining: Math.max(0, limit - currentCount),
				limitType: 'monthly' as const
			};
	}
});

// ═══════════════════════════════════════════════════════════════
// ENVELOPE SENDING
// ═══════════════════════════════════════════════════════════════

export const incrementEnvelopeSent = mutation({
	args: {},
	returns: v.object({
		success: v.boolean(),
		remaining: v.number(),
		message: v.optional(v.string())
	}),
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) { throw new Error('Authentication required'); }

		const user = await ctx.db
			.query('users')
			.withIndex('by_workos_id', (q) => q.eq('workosId', identity.subject))
			.unique();

		if (!user) { throw new Error('User not found'); }

		const limit = getEnvelopeLimit(user);

		// Unlimited check
		if (isLimitUnlimited(limit)) {
			return { success: true, remaining: -1 };
		}

		const currentMonth = getCurrentMonth();
		const resetDate = user.envelopeMonthResetDate;

		let currentCount: number;

		if (!resetDate || resetDate !== currentMonth) {
			currentCount = 1;
			await ctx.db.patch(user._id, {
				envelopesSentThisMonth: currentCount,
				envelopeMonthResetDate: currentMonth
			});
		} else {
			currentCount = (user.envelopesSentThisMonth ?? 0) + 1;

			if (currentCount > limit) {
				return {
					success: false,
					remaining: 0,
					message: 'Monthly envelope limit reached. Upgrade for more.'
				};
			}

			await ctx.db.patch(user._id, { envelopesSentThisMonth: currentCount });
		}

		return {
			success: true,
			remaining: Math.max(0, limit - currentCount)
		};
	}
});

// ═══════════════════════════════════════════════════════════════
// CRON JOB MUTATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Reset daily usage counters for all users.
 * Called by cron job at midnight UTC.
 */
export const resetDailyUsage = internalMutation({
	args: {},
	returns: v.number(),
	handler: async (ctx) => {
		const today = getCurrentDay();

		// Find users whose daily reset date is not today
		const usersToReset = await ctx.db
			.query('users')
			.filter((q) => q.neq(q.field('inlineAiDayResetDate'), today))
			.collect();

		let count = 0;
		for (const user of usersToReset) {
			if (user.inlineAiUsesThisDay && user.inlineAiUsesThisDay > 0) {
				await ctx.db.patch(user._id, {
					inlineAiUsesThisDay: 0,
					inlineAiDayResetDate: today
				});
				count++;
			}
		}

		console.log(`[Cron] Reset daily usage for ${count} users`);
		return count;
	}
});
