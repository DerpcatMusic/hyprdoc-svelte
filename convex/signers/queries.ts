// convex/signers/queries.ts
import { v } from 'convex/values';
import { internalQuery, query } from '@/convex/_generated/server';
import { requireDocumentAccess } from '@/convex/lib/auth';
import {
	otpTypeValidator,
	signerReturnValidator,
	verificationStatusValidator
} from '@/convex/lib/validators';
import { REMINDER_MAX_COUNT, REMINDER_THRESHOLD_HOURS } from './constants';

/**
 * List signers for a document.
 */
export const listByDocument = query({
	args: {
		documentId: v.id('documents'),
		guestToken: v.optional(v.string())
	},
	returns: v.array(signerReturnValidator),
	handler: async (ctx, args) => {
		await requireDocumentAccess(ctx, args.documentId, 'viewer', args.guestToken);

		return await ctx.db
			.query('signers')
			.withIndex('by_document', (q) => q.eq('documentId', args.documentId))
			.collect();
	}
});

/**
 * Get signer by access token (for signing page).
 */
export const getByAccessToken = query({
	args: { accessToken: v.string() },
	returns: v.union(
		v.object({
			_id: v.id('signers'),
			verificationStatus: verificationStatusValidator,
			status: v.string(),
			consentGivenAt: v.optional(v.number()),
			legalName: v.string(),
			email: v.string(),
			signedAt: v.optional(v.number()),
			documentTitle: v.string(),
			tokenExpired: v.boolean(),
			authSettings: v.object({
				authEmail: v.boolean(),
				authPhone: v.boolean()
			})
		}),
		v.null()
	),
	handler: async (ctx, args) => {
		const signer = await ctx.db
			.query('signers')
			.withIndex('by_access_token', (q) => q.eq('accessToken', args.accessToken))
			.unique();

		if (!signer) { return null; }

		const document = await ctx.db.get(signer.documentId);
		if (!document) { return null; }

		return {
			_id: signer._id,
			verificationStatus: signer.verificationStatus,
			status: signer.status,
			consentGivenAt: signer.consentGivenAt,
			legalName: signer.legalName,
			email: signer.email,
			signedAt: signer.signedAt,
			documentTitle: document.title,
			tokenExpired: signer.tokenExpiresAt < Date.now(),
			authSettings: {
				authEmail: document.settings?.authEmail ?? true,
				authPhone: document.settings?.authPhone ?? true
			}
		};
	}
});

export const getSignerInternal = internalQuery({
	args: { signerId: v.id('signers') },
	returns: v.union(signerReturnValidator, v.null()),
	handler: async (ctx, args) => {
		return await ctx.db.get(args.signerId);
	}
});

export const getByToken = internalQuery({
	args: { accessToken: v.string() },
	returns: v.union(signerReturnValidator, v.null()),
	handler: async (ctx, args) => {
		return await ctx.db
			.query('signers')
			.withIndex('by_access_token', (q) => q.eq('accessToken', args.accessToken))
			.unique();
	}
});

export const getRecentOtps = internalQuery({
	args: {
		signerId: v.id('signers'),
		type: otpTypeValidator
	},
	returns: v.array(
		v.object({
			_id: v.id('otpCodes'),
			expiresAt: v.float64(),
			sentAt: v.float64(),
			usedAt: v.optional(v.float64())
		})
	),
	handler: async (ctx, args) => {
		const otps = await ctx.db
			.query('otpCodes')
			.withIndex('by_signer_and_type', (q) => q.eq('signerId', args.signerId).eq('type', args.type))
			.order('desc')
			.take(5);

		return otps.map((otp) => ({
			_id: otp._id,
			expiresAt: otp.expiresAt,
			sentAt: otp.sentAt,
			usedAt: otp.usedAt
		}));
	}
});

export const getPendingSignersForReminder = internalQuery({
	args: {},
	returns: v.array(
		v.object({
			_id: v.id('signers'),
			email: v.string(),
			legalName: v.string(),
			documentId: v.id('documents'),
			invitedAt: v.number(),
			reminderCount: v.number()
		})
	),
	handler: async (ctx) => {
		const now = Date.now();
		const cutoff = now - REMINDER_THRESHOLD_HOURS * 60 * 60 * 1000;

		const signers = await ctx.db
			.query('signers')
			.withIndex('by_status_and_invited', (q) => q.eq('status', 'pending').lt('invitedAt', cutoff))
			.collect();

		const needsReminder = signers.filter((s) => {
			const reminderCount = (s as any).reminderCount ?? 0;
			if (reminderCount >= REMINDER_MAX_COUNT) { return false; }
			if (s.tokenExpiresAt < now) { return false; }
			return true;
		});

		return needsReminder.map((s) => ({
			_id: s._id,
			email: s.email,
			legalName: s.legalName,
			documentId: s.documentId,
			invitedAt: s.invitedAt!,
			reminderCount: (s as any).reminderCount ?? 0
		}));
	}
});
