// convex/signers/mutations/internal.ts
import { v } from 'convex/values';
import { internalMutation } from '@/convex/_generated/server';
import { otpTypeValidator } from '@/convex/lib/validators';

/**
 * Create OTP code (internal).
 */
export const createOtp = internalMutation({
	args: {
		signerId: v.id('signers'),
		type: otpTypeValidator,
		code: v.string(),
		expiresAt: v.number(),
		sentTo: v.string(),
		ipAddress: v.optional(v.string())
	},
	returns: v.id('otpCodes'),
	handler: async (ctx, args) => {
		return await ctx.db.insert('otpCodes', {
			signerId: args.signerId,
			type: args.type,
			code: args.code,
			expiresAt: args.expiresAt,
			attempts: 0,
			sentAt: Date.now(),
			sentTo: args.sentTo,
			ipAddress: args.ipAddress
		});
	}
});

/**
 * Cleanup expired OTP codes (internal).
 */
export const cleanupExpiredOtps = internalMutation({
	args: {},
	returns: v.null(),
	handler: async (ctx) => {
		const now = Date.now();
		const cutoff = now;

		const expiredOtps = await ctx.db
			.query('otpCodes')
			.withIndex('by_expires')
			.filter((q) => q.lt(q.field('expiresAt'), cutoff))
			.collect();

		for (const otp of expiredOtps) {
			await ctx.db.delete(otp._id);
		}

		console.log(`Cleaned up ${expiredOtps.length} expired OTP codes`);
		return null;
	}
});

/**
 * Record reminder sent (internal).
 */
export const recordReminderSent = internalMutation({
	args: { signerId: v.id('signers') },
	returns: v.null(),
	handler: async (ctx, args) => {
		const signer = await ctx.db.get(args.signerId);
		if (!signer) { return null; }

		await ctx.db.patch(args.signerId, {
			reminderCount: ((signer as any).reminderCount ?? 0) + 1,
			lastReminderAt: Date.now()
		} as any);
		return null;
	}
});
