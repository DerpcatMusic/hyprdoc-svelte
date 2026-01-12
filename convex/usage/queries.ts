/**
 * Usage Tracking Queries
 *
 * Returns current usage stats and limit checks for the authenticated user.
 */

import { v } from 'convex/values';
import { query } from '@/convex/_generated/server';
import {
	getAiWriterLimit,
	getEnvelopeLimit,
	getInlineAiLimitInfo,
	getUserTier,
	isLimitUnlimited
} from '@/convex/lib/subscription';
import { getTier } from '@/convex/lib/tiers';

// ═══════════════════════════════════════════════════════════════
// HELPERS
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
// COMPREHENSIVE USAGE QUERY
// ═══════════════════════════════════════════════════════════════

export const getAllUsageStats = query({
	args: {},
	returns: v.union(
		v.object({
			tier: v.string(),
			tierName: v.string(),

			// AI Writer
			aiWriter: v.object({
				used: v.number(),
				limit: v.number(),
				remaining: v.number(),
				isUnlimited: v.boolean()
			}),

			// Inline AI
			inlineAi: v.object({
				used: v.number(),
				limit: v.number(),
				remaining: v.number(),
				isUnlimited: v.boolean(),
				limitType: v.union(v.literal('daily'), v.literal('monthly'))
			}),

			// Envelopes
			envelopes: v.object({
				used: v.number(),
				limit: v.number(),
				remaining: v.number(),
				isUnlimited: v.boolean()
			}),

			// Reset dates
			resetDates: v.object({
				aiWriterMonth: v.string(),
				inlineAiDay: v.optional(v.string()),
				inlineAiMonth: v.optional(v.string()),
				envelopeMonth: v.string()
			})
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

		const tier = getUserTier(user);
		const tierConfig = getTier(tier);
		const currentMonth = getCurrentMonth();
		const currentDay = getCurrentDay();

		// AI Writer stats
		const aiWriterLimit = getAiWriterLimit(user);
		const aiWriterResetDate = user.aiGenerationResetDate;
		const aiWriterUsed =
			aiWriterResetDate === currentMonth ? (user.aiGenerationsThisMonth ?? 0) : 0;

		// Inline AI stats
		const inlineAiInfo = getInlineAiLimitInfo(user);
		let inlineAiUsed: number;
		if (inlineAiInfo.type === 'daily') {
			inlineAiUsed = user.inlineAiDayResetDate === currentDay ? (user.inlineAiUsesThisDay ?? 0) : 0;
		} else {
			inlineAiUsed =
				user.inlineAiMonthResetDate === currentMonth ? (user.inlineAiUsesThisMonth ?? 0) : 0;
		}

		// Envelope stats
		const envelopeLimit = getEnvelopeLimit(user);
		const envelopesUsed =
			user.envelopeMonthResetDate === currentMonth ? (user.envelopesSentThisMonth ?? 0) : 0;

		return {
			tier,
			tierName: tierConfig.name,

			aiWriter: {
				used: aiWriterUsed,
				limit: aiWriterLimit,
				remaining: isLimitUnlimited(aiWriterLimit) ? -1 : Math.max(0, aiWriterLimit - aiWriterUsed),
				isUnlimited: isLimitUnlimited(aiWriterLimit)
			},

			inlineAi: {
				used: inlineAiUsed,
				limit: inlineAiInfo.limit,
				remaining: isLimitUnlimited(inlineAiInfo.limit)
					? -1
					: Math.max(0, inlineAiInfo.limit - inlineAiUsed),
				isUnlimited: isLimitUnlimited(inlineAiInfo.limit),
				limitType: inlineAiInfo.type
			},

			envelopes: {
				used: envelopesUsed,
				limit: envelopeLimit,
				remaining: isLimitUnlimited(envelopeLimit)
					? -1
					: Math.max(0, envelopeLimit - envelopesUsed),
				isUnlimited: isLimitUnlimited(envelopeLimit)
			},

			resetDates: {
				aiWriterMonth: currentMonth,
				inlineAiDay: inlineAiInfo.type === 'daily' ? currentDay : undefined,
				inlineAiMonth: inlineAiInfo.type === 'monthly' ? currentMonth : undefined,
				envelopeMonth: currentMonth
			}
		};
	}
});

// ═══════════════════════════════════════════════════════════════
// INDIVIDUAL LIMIT CHECKS
// ═══════════════════════════════════════════════════════════════

export const canUseInlineAi = query({
	args: {},
	returns: v.object({
		allowed: v.boolean(),
		remaining: v.number(),
		limitType: v.union(v.literal('daily'), v.literal('monthly'))
	}),
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			return { allowed: false, remaining: 0, limitType: 'daily' as const };
		}

		const user = await ctx.db
			.query('users')
			.withIndex('by_workos_id', (q) => q.eq('workosId', identity.subject))
			.unique();

		if (!user) {
			return { allowed: false, remaining: 0, limitType: 'daily' as const };
		}

		const info = getInlineAiLimitInfo(user);
		const currentMonth = getCurrentMonth();
		const currentDay = getCurrentDay();

		if (isLimitUnlimited(info.limit)) {
			return { allowed: true, remaining: -1, limitType: info.type };
		}

		let used: number;
		if (info.type === 'daily') {
			used = user.inlineAiDayResetDate === currentDay ? (user.inlineAiUsesThisDay ?? 0) : 0;
		} else {
			used = user.inlineAiMonthResetDate === currentMonth ? (user.inlineAiUsesThisMonth ?? 0) : 0;
		}

		const remaining = Math.max(0, info.limit - used);
		return {
			allowed: remaining > 0,
			remaining,
			limitType: info.type
		};
	}
});

export const canSendEnvelope = query({
	args: {},
	returns: v.object({
		allowed: v.boolean(),
		remaining: v.number()
	}),
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			return { allowed: false, remaining: 0 };
		}

		const user = await ctx.db
			.query('users')
			.withIndex('by_workos_id', (q) => q.eq('workosId', identity.subject))
			.unique();

		if (!user) {
			return { allowed: false, remaining: 0 };
		}

		const limit = getEnvelopeLimit(user);
		const currentMonth = getCurrentMonth();

		if (isLimitUnlimited(limit)) {
			return { allowed: true, remaining: -1 };
		}

		const used =
			user.envelopeMonthResetDate === currentMonth ? (user.envelopesSentThisMonth ?? 0) : 0;

		const remaining = Math.max(0, limit - used);
		return {
			allowed: remaining > 0,
			remaining
		};
	}
});
