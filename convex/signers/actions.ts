// convex/signers/actions.ts
import { v } from 'convex/values';
import { internal } from '@/convex/_generated/api';
import { action, internalAction } from '@/convex/_generated/server';
import { generateOtpCode } from '@/convex/lib/crypto';
import { otpTypeValidator, requestContextValidator } from '@/convex/lib/validators';
import { OTP_COOLDOWN_SECONDS, OTP_EXPIRY_MINUTES, OTP_MAX_REQUESTS } from './constants';

/**
 * Send signing invite email to a signer.
 */
export const sendInvite = action({
	args: {
		signerId: v.id('signers'),
		ctx: v.optional(requestContextValidator)
	},
	returns: v.object({ success: v.boolean() }),
	handler: async (ctx, args) => {
		const signer = await ctx.runQuery(internal.signers.queries.getSignerInternal, {
			signerId: args.signerId
		});

		if (!signer) { throw new Error('Signer not found'); }

		const document = await ctx.runQuery(internal.documents.queries.get.getDocumentInternal, {
			documentId: signer.documentId
		});

		if (!document) { throw new Error('Document not found'); }

		const owner = await ctx.runQuery(internal.users.queries.getUserInternal, {
			workosId: document.ownerId
		});

		const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
		const signingLink = `${baseUrl}/sign/${signer.accessToken}`;

		const { sendEmail, generateSigningInviteEmail } = await import('../lib/email');
		const emailContent = generateSigningInviteEmail({
			signerName: signer.legalName,
			documentTitle: document.title,
			senderName: owner?.name ?? owner?.email ?? 'Someone',
			signingLink
		});

		await sendEmail({ to: signer.email, ...emailContent });

		await ctx.runMutation(internal.auditLogs.mutations.log, {
			signerId: args.signerId,
			actorType: 'system' as const,
			documentId: signer.documentId,
			resourceType: 'document' as const,
			resourceId: signer.documentId,
			action: 'signer.invite_sent',
			level: 'info' as const,
			ipAddress: args.ctx?.ipAddress,
			metadata: { email: signer.email }
		});

		return { success: true };
	}
});

/**
 * Send signing invite emails to multiple signers (batch).
 */
export const sendSigningInvites = action({
	args: {
		documentId: v.id('documents'),
		signerIds: v.array(v.id('signers'))
	},
	returns: v.object({
		results: v.array(
			v.object({
				signerId: v.id('signers'),
				success: v.boolean(),
				error: v.optional(v.string())
			})
		)
	}),
	handler: async (ctx, args) => {
		const results: any[] = [];

		for (const signerId of args.signerIds) {
			try {
				const signer = await ctx.runQuery(internal.signers.queries.getSignerInternal, { signerId });
				if (!signer) {
					results.push({ signerId, success: false, error: 'Signer not found' });
					continue;
				}

				const document = await ctx.runQuery(internal.documents.queries.get.getDocumentInternal, {
					documentId: args.documentId
				});

				if (!document) {
					results.push({ signerId, success: false, error: 'Document not found' });
					continue;
				}

				const owner = await ctx.runQuery(internal.users.queries.getUserInternal, {
					workosId: document.ownerId
				});

				const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
				const signingLink = `${baseUrl}/sign/${signer.accessToken}`;

				const { sendEmail, generateSigningInviteEmail } = await import('../lib/email');
				const emailContent = generateSigningInviteEmail({
					signerName: signer.legalName,
					documentTitle: document.title,
					senderName: owner?.name ?? owner?.email ?? 'Someone',
					signingLink
				});

				await sendEmail({ to: signer.email, ...emailContent });

				await ctx.runMutation(internal.auditLogs.mutations.log, {
					signerId,
					actorType: 'system' as const,
					documentId: args.documentId,
					resourceType: 'document' as const,
					resourceId: args.documentId,
					action: 'signer.invite_sent',
					level: 'info' as const,
					metadata: { email: signer.email, batch: true }
				});

				results.push({ signerId, success: true });
			} catch (err: any) {
				results.push({ signerId, success: false, error: err.message });
			}
		}

		return { results };
	}
});

/**
 * Request OTP code (email or phone).
 */
export const requestOtp = action({
	args: {
		accessToken: v.string(),
		type: otpTypeValidator,
		identifier: v.string(),
		ctx: requestContextValidator
	},
	returns: v.object({
		success: v.boolean(),
		expiresAt: v.number(),
		cooldownEndsAt: v.optional(v.number())
	}),
	handler: async (ctx, args) => {
		const signer = await ctx.runQuery(internal.signers.queries.getByToken, {
			accessToken: args.accessToken
		});

		if (!signer) { throw new Error('Invalid or expired signing link'); }
		if (signer.tokenExpiresAt < Date.now()) { throw new Error('Signing link has expired'); }

		const providedIdentifier = args.identifier.trim();
		let matches = false;

		if (args.type === 'email') {
			matches = providedIdentifier.toLowerCase() === signer.email.toLowerCase();
		} else {
			const cleanProvided = providedIdentifier.replaceAll(/\D/g, '');
			const cleanStored = signer.phone.replaceAll(/\D/g, '');
			matches = cleanProvided === cleanStored;
		}

		if (!matches) { throw new Error('The provided details do not match our records.'); }

		const recentOtps = await ctx.runQuery(internal.signers.queries.getRecentOtps, {
			signerId: signer._id,
			type: args.type
		});

		const now = Date.now();

		if (recentOtps.length > 0) {
			const lastOtp = recentOtps[0];
			const timeSinceLastRequest = now - lastOtp.sentAt;
			const cooldownMs = OTP_COOLDOWN_SECONDS * 1000;

			if (timeSinceLastRequest < cooldownMs) {
				throw new Error(
					`Please wait ${Math.ceil((cooldownMs - timeSinceLastRequest) / 1000)} seconds before requesting a new code.`
				);
			}
		}

		const activeOtps = recentOtps.filter((otp) => otp.expiresAt > now && !otp.usedAt);
		if (activeOtps.length >= OTP_MAX_REQUESTS) {
			throw new Error(
				`Maximum ${OTP_MAX_REQUESTS} active codes allowed. Please wait for an existing code to expire or use one.`
			);
		}

		const code = generateOtpCode();
		const expiresAt = now + OTP_EXPIRY_MINUTES * 60 * 1000;

		await ctx.runMutation(internal.signers.mutations.internal.createOtp, {
			signerId: signer._id,
			type: args.type,
			code,
			expiresAt,
			sentTo: args.type === 'email' ? signer.email : signer.phone,
			ipAddress: args.ctx.ipAddress
		});

		try {
			if (args.type === 'email') {
				const { sendEmail, generateOtpEmail } = await import('../lib/email');
				const emailContent = generateOtpEmail({
					recipientName: signer.legalName,
					code,
					expiresInMinutes: OTP_EXPIRY_MINUTES
				});
				await sendEmail({ to: signer.email, ...emailContent });
			} else {
				const { sendSms, generateOtpSms } = await import('../lib/sms');
				await sendSms({
					to: signer.phone,
					message: generateOtpSms(code)
				});
			}
		} catch (sendError: any) {
			console.error(`[DEV] Failed to send OTP: ${sendError.message}`);
			console.log(`[DEV] OTP code for ${signer.email}: ${code}`);
		}

		await ctx.runMutation(internal.auditLogs.mutations.log, {
			signerId: signer._id,
			actorType: 'signer' as const,
			documentId: signer.documentId,
			resourceType: 'document' as const,
			resourceId: signer.documentId,
			action: `otp.${args.type}_sent`,
			level: 'security' as const,
			ipAddress: args.ctx.ipAddress,
			userAgent: args.ctx.userAgent,
			...(args.ctx.geoLocation && { geoLocation: args.ctx.geoLocation }),
			metadata: { sentTo: args.type === 'email' ? signer.email : signer.phone }
		});

		const cooldownEndsAt = now + OTP_COOLDOWN_SECONDS * 1000;
		return { success: true, expiresAt, cooldownEndsAt };
	}
});

/**
 * Send reminder emails to pending signers.
 */
export const sendPendingReminders = internalAction({
	args: {},
	returns: v.object({ sent: v.number(), errors: v.number() }),
	handler: async (ctx) => {
		const pendingSigners = await ctx.runQuery(
			internal.signers.queries.getPendingSignersForReminder,
			{}
		);

		let sent = 0;
		let errors = 0;

		for (const signer of pendingSigners) {
			try {
				const document = await ctx.runQuery(internal.documents.queries.get.getDocumentInternal, {
					documentId: signer.documentId
				});

				if (!document || document.status !== 'pending_signatures') { continue; }

				const owner = await ctx.runQuery(internal.users.queries.getUserInternal, {
					workosId: document.ownerId
				});

				const fullSigner = await ctx.runQuery(internal.signers.queries.getSignerInternal, {
					signerId: signer._id
				});

				if (!fullSigner?.accessToken) { continue; }

				const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
				const signingLink = `${baseUrl}/sign/${fullSigner.accessToken}`;

				const { sendEmail, generateReminderEmail } = await import('../lib/email');
				const emailContent = generateReminderEmail({
					signerName: signer.legalName,
					documentTitle: document.title,
					senderName: owner?.name ?? owner?.email ?? 'Someone',
					signingLink,
					daysSinceInvite: Math.floor((Date.now() - signer.invitedAt) / (24 * 60 * 60 * 1000))
				});

				await sendEmail({ to: signer.email, ...emailContent });

				await ctx.runMutation(internal.signers.mutations.internal.recordReminderSent, {
					signerId: signer._id
				});

				await ctx.runMutation(internal.auditLogs.mutations.log, {
					signerId: signer._id,
					actorType: 'system' as const,
					documentId: signer.documentId,
					resourceType: 'document' as const,
					resourceId: signer.documentId,
					action: 'signer.reminder_sent',
					level: 'info' as const,
					metadata: {
						email: signer.email,
						reminderNumber: signer.reminderCount + 1
					}
				});

				sent++;
			} catch (error) {
				console.error(`Failed to send reminder to ${signer.email}:`, error);
				errors++;
			}
		}

		return { sent, errors };
	}
});

/**
 * Send a reminder email to a specific signer (user-callable).
 */
export const sendReminder = action({
	args: {
		signerId: v.id('signers')
	},
	returns: v.object({ success: v.boolean(), message: v.optional(v.string()) }),
	handler: async (ctx, args) => {
		const signer = await ctx.runQuery(internal.signers.queries.getSignerInternal, {
			signerId: args.signerId
		});

		if (!signer) { throw new Error('Signer not found'); }
		if (signer.status === 'signed') {
			return { success: false, message: 'Signer has already signed' };
		}

		const document = await ctx.runQuery(internal.documents.queries.get.getDocumentInternal, {
			documentId: signer.documentId
		});

		if (!document) { throw new Error('Document not found'); }
		if (document.status !== 'pending_signatures') {
			return { success: false, message: 'Document is not pending signatures' };
		}

		const owner = await ctx.runQuery(internal.users.queries.getUserInternal, {
			workosId: document.ownerId
		});

		const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
		const signingLink = `${baseUrl}/sign/${signer.accessToken}`;

		const { sendEmail, generateReminderEmail } = await import('../lib/email');
		const emailContent = generateReminderEmail({
			signerName: signer.legalName,
			documentTitle: document.title,
			senderName: owner?.name ?? owner?.email ?? 'Someone',
			signingLink,
			daysSinceInvite: Math.floor((Date.now() - (signer as any).invitedAt) / (24 * 60 * 60 * 1000))
		});

		await sendEmail({ to: signer.email, ...emailContent });

		await ctx.runMutation(internal.signers.mutations.internal.recordReminderSent, {
			signerId: signer._id
		});

		await ctx.runMutation(internal.auditLogs.mutations.log, {
			signerId: signer._id,
			actorType: 'user' as const,
			documentId: signer.documentId,
			resourceType: 'document' as const,
			resourceId: signer.documentId,
			action: 'signer.reminder_sent',
			level: 'info' as const,
			metadata: {
				email: signer.email,
				manual: true
			}
		});

		return { success: true };
	}
});
