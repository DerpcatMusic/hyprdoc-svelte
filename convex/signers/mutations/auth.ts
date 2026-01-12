// convex/signers/mutations/auth.ts
import { v } from 'convex/values';
import { internal } from '@/convex/_generated/api';
import { mutation } from '@/convex/_generated/server';
import { otpExpired, otpInvalid, otpMaxAttempts, tokenInvalid } from '@/convex/lib/errors';
import {
	otpTypeValidator,
	requestContextValidator,
	verificationStatusValidator
} from '@/convex/lib/validators';
import { OTP_MAX_ATTEMPTS } from '@/convex/signers/constants';

/**
 * Verify OTP code.
 */
export const verifyOtp = mutation({
	args: {
		accessToken: v.string(),
		type: otpTypeValidator,
		code: v.string(),
		ctx: requestContextValidator
	},
	returns: v.object({
		success: v.boolean(),
		verificationStatus: verificationStatusValidator
	}),
	handler: async (ctx, args) => {
		const signer = await ctx.db
			.query('signers')
			.withIndex('by_access_token', (q) => q.eq('accessToken', args.accessToken))
			.unique();

		if (!signer) { throw tokenInvalid(); }

		const otp = await ctx.db
			.query('otpCodes')
			.withIndex('by_signer_and_type', (q) => q.eq('signerId', signer._id).eq('type', args.type))
			.order('desc')
			.first();

		if (!otp) { throw otpInvalid(); }
		if (otp.usedAt) { throw otpInvalid(); }
		if (otp.expiresAt < Date.now()) { throw otpExpired(); }
		if (otp.attempts >= OTP_MAX_ATTEMPTS) { throw otpMaxAttempts(); }

		if (otp.code !== args.code) {
			await ctx.db.patch(otp._id, { attempts: otp.attempts + 1 });

			await ctx.scheduler.runAfter(0, internal.auditLogs.mutations.log, {
				signerId: signer._id,
				actorType: 'signer' as const,
				documentId: signer.documentId,
				resourceType: 'document' as const,
				resourceId: signer.documentId,
				action: `otp.${args.type}_failed`,
				level: 'security' as const,
				ipAddress: args.ctx.ipAddress,
				userAgent: args.ctx.userAgent,
				geoLocation: args.ctx.geoLocation,
				metadata: { attempts: otp.attempts + 1 }
			});

			throw otpInvalid();
		}

		const now = Date.now();
		await ctx.db.patch(otp._id, { usedAt: now });

		const document = await ctx.db.get(signer.documentId);
		const authEmail = document?.settings?.authEmail !== false;
		const authPhone = document?.settings?.authPhone !== false;

		let newStatus: 'email_verified' | 'phone_verified' | 'fully_verified';

		if (args.type === 'email') {
			await ctx.db.patch(signer._id, { emailVerifiedAt: now });
			newStatus = !authPhone || signer.phoneVerifiedAt ? 'fully_verified' : 'email_verified';
		} else {
			await ctx.db.patch(signer._id, { phoneVerifiedAt: now });
			newStatus = !authEmail || signer.emailVerifiedAt ? 'fully_verified' : 'phone_verified';
		}

		await ctx.db.patch(signer._id, { verificationStatus: newStatus });

		await ctx.scheduler.runAfter(0, internal.auditLogs.mutations.log, {
			signerId: signer._id,
			actorType: 'signer' as const,
			documentId: signer.documentId,
			resourceType: 'document' as const,
			resourceId: signer.documentId,
			action: `otp.${args.type}_verified`,
			level: 'security' as const,
			ipAddress: args.ctx.ipAddress,
			userAgent: args.ctx.userAgent,
			geoLocation: args.ctx.geoLocation
		});

		return { success: true, verificationStatus: newStatus };
	}
});

/**
 * Record signer consent.
 */
export const recordConsent = mutation({
	args: {
		accessToken: v.string(),
		consentText: v.string(),
		ctx: requestContextValidator
	},
	returns: v.object({ success: v.boolean() }),
	handler: async (ctx, args) => {
		const signer = await ctx.db
			.query('signers')
			.withIndex('by_access_token', (q) => q.eq('accessToken', args.accessToken))
			.unique();

		if (!signer) { throw new Error('Invalid signing link'); }
		if (signer.verificationStatus !== 'fully_verified') {
			throw new Error('Please complete identity verification first');
		}

		const now = Date.now();

		await ctx.db.patch(signer._id, {
			consentGivenAt: now,
			consentText: args.consentText,
			consentIpAddress: args.ctx.ipAddress,
			consentUserAgent: args.ctx.userAgent,
			consentGeoLocation: args.ctx.geoLocation,
			status: 'viewed'
		});

		await ctx.scheduler.runAfter(0, internal.auditLogs.mutations.log, {
			signerId: signer._id,
			actorType: 'signer' as const,
			documentId: signer.documentId,
			resourceType: 'document' as const,
			resourceId: signer.documentId,
			action: 'signer.consent_given',
			level: 'security' as const,
			ipAddress: args.ctx.ipAddress,
			userAgent: args.ctx.userAgent,
			geoLocation: args.ctx.geoLocation,
			metadata: {
				consentText: args.consentText,
				timestamp: now
			}
		});

		return { success: true };
	}
});
