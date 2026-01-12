// convex/ai/mutations.ts
import { v } from 'convex/values';
import { mutation } from '@/convex/_generated/server';
import { isPro, QUOTAS } from '@/convex/lib/subscription';

function getCurrentMonth(): string {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export const incrementGeneration = mutation({
	args: {},
	returns: v.object({
		success: v.boolean(),
		remaining: v.number()
	}),
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) { throw new Error('Authentication required'); }

		const user = await ctx.db
			.query('users')
			.withIndex('by_workos_id', (q) => q.eq('workosId', identity.subject))
			.unique();

		if (!user) { throw new Error('User not found'); }

		const isProUser = isPro(user);
		if (isProUser) { return { success: true, remaining: -1 }; }

		const currentMonth = getCurrentMonth();
		const resetDate = user.aiGenerationResetDate;

		let newCount: number;

		if (!resetDate || resetDate !== currentMonth) {
			newCount = 1;
			await ctx.db.patch(user._id, {
				aiGenerationsThisMonth: newCount,
				aiGenerationResetDate: currentMonth
			});
		} else {
			const currentCount = user.aiGenerationsThisMonth ?? 0;
			const limit = QUOTAS.free.aiWriterUsesPerMonth;
			if (currentCount >= limit) { return { success: false, remaining: 0 }; }

			newCount = currentCount + 1;
			await ctx.db.patch(user._id, { aiGenerationsThisMonth: newCount });
		}

		const freeLimit = QUOTAS.free.aiWriterUsesPerMonth;
		return {
			success: true,
			remaining: Math.max(0, freeLimit - newCount)
		};
	}
});
