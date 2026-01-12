// convex/ai/queries.ts
import { v } from 'convex/values';
import { query } from '@/convex/_generated/server';
import { isPro, QUOTAS } from '@/convex/lib/subscription';

function getCurrentMonth(): string {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export const canGenerate = query({
	args: {},
	returns: v.object({
		canGenerate: v.boolean(),
		remaining: v.number(),
		limit: v.number(),
		tier: v.string()
	}),
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			return { canGenerate: false, remaining: 0, limit: 0, tier: 'unauthenticated' };
		}

		const user = await ctx.db
			.query('users')
			.withIndex('by_workos_id', (q) => q.eq('workosId', identity.subject))
			.unique();

		if (!user) {
			return { canGenerate: false, remaining: 0, limit: 0, tier: 'unknown' };
		}

		const isProUser = isPro(user);
		const tier = user.subscriptionTier ?? 'free';

		if (isProUser) {
			return { canGenerate: true, remaining: -1, limit: -1, tier: 'pro' };
		}

		const currentMonth = getCurrentMonth();
		const resetDate = user.aiGenerationResetDate;

		const freeLimit = QUOTAS.free.aiWriterUsesPerMonth;
		if (!resetDate || resetDate !== currentMonth) {
			return { canGenerate: true, remaining: freeLimit, limit: freeLimit, tier };
		}

		const used = user.aiGenerationsThisMonth ?? 0;
		const remaining = Math.max(0, freeLimit - used);

		return {
			canGenerate: remaining > 0,
			remaining,
			limit: freeLimit,
			tier
		};
	}
});

export const getUsageStats = query({
	args: {},
	returns: v.union(
		v.object({
			tier: v.string(),
			used: v.number(),
			limit: v.number(),
			remaining: v.number(),
			resetDate: v.string(),
			isPro: v.boolean()
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

		const tier = user.subscriptionTier ?? 'free';
		const currentMonth = getCurrentMonth();
		const resetDate = user.aiGenerationResetDate ?? currentMonth;

		const isNewMonth = resetDate !== currentMonth;
		const used = isNewMonth ? 0 : (user.aiGenerationsThisMonth ?? 0);

		const aiLimit = QUOTAS.free.aiWriterUsesPerMonth;
		return {
			tier,
			used,
			limit: tier === 'pro' ? QUOTAS.pro.aiWriterUsesPerMonth : aiLimit,
			remaining: tier === 'pro' ? -1 : Math.max(0, aiLimit - used),
			resetDate: currentMonth,
			isPro: tier === 'pro'
		};
	}
});
