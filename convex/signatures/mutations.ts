// convex/signatures/mutations.ts
import { v } from 'convex/values';
import { internal } from '@/convex/_generated/api';
import { mutation } from '@/convex/_generated/server';
import { hashContent } from '@/convex/lib/crypto';
import { signerAlreadySigned, tokenInvalid, validationError } from '@/convex/lib/errors';
import { fieldValuesValidator } from '@/convex/lib/schemas';
import { requestContextValidator, signatureTypeValidator } from '@/convex/lib/validators';

/**
 * Create a signature for a document.
 */
export const create = mutation({
	args: {
		accessToken: v.string(),
		blockId: v.string(),
		signatureType: signatureTypeValidator,
		signatureData: v.string(),
		pdfX: v.optional(v.number()),
		pdfY: v.optional(v.number()),
		pdfPage: v.optional(v.number()),
		pdfWidth: v.optional(v.number()),
		pdfHeight: v.optional(v.number()),
		fieldValues: v.optional(fieldValuesValidator),
		ctx: requestContextValidator
	},
	returns: v.id('signatures'),
	handler: async (ctx, args) => {
		const signer = await ctx.db
			.query('signers')
			.withIndex('by_access_token', (q) => q.eq('accessToken', args.accessToken))
			.unique();

		if (!signer) { throw tokenInvalid(); }
		if (signer.verificationStatus !== 'fully_verified') {
			throw validationError('Identity verification required before signing');
		}
		if (!signer.consentGivenAt) { throw validationError('Consent required before signing'); }
		if (signer.status === 'signed') { throw signerAlreadySigned(signer._id); }

		const document = await ctx.db.get(signer.documentId);
		if (!document || document.status !== 'pending_signatures') {
			throw validationError('Document is not available for signing');
		}

		const blocks: any[] = document.blocks || [];
		// CRITICAL FIX: Envelopes use signerId (set during instantiation), templates use slotId
		// Check both for full compatibility
		const signerBlocks = blocks.filter(
			(b) =>
				String(b.signerId) === String(signer._id) ||
				String(b.slotId) === String(signer._id) ||
				String(b.slotId) === String(signer.sourceSlotId)
		);
		const fieldValues = args.fieldValues || signer.fieldValues || {};

		const incompleteFields: string[] = [];
		for (const block of signerBlocks) {
			if (block.required) {
				const value = fieldValues[block.id];
				if (block.id === args.blockId) { continue; }

				const isEmpty =
					value === undefined ||
					value === null ||
					value === '' ||
					(Array.isArray(value) && value.length === 0) ||
					(typeof value === 'object' && !Object.keys(value).length);
				if (block.type === 'checkbox' && block.required && value !== true) {
					incompleteFields.push(block.label || 'Checkbox');
					continue;
				}
				if (isEmpty) { incompleteFields.push(block.label || 'Untitled Field'); }
			}
		}

		if (incompleteFields.length > 0) {
			throw new Error(`Cannot sign: Required fields incomplete: ${incompleteFields.join(', ')}`);
		}

		if (args.fieldValues) {
			await ctx.db.patch(signer._id, {
				fieldValues: args.fieldValues,
				fieldValuesUpdatedAt: Date.now()
			});
		}

		const now = Date.now();
		const signatureHash = await hashContent(args.signatureData);

		const emailOtp = await ctx.db
			.query('otpCodes')
			.withIndex('by_signer_and_type', (q) => q.eq('signerId', signer._id).eq('type', 'email'))
			.order('desc')
			.first();

		const phoneOtp = await ctx.db
			.query('otpCodes')
			.withIndex('by_signer_and_type', (q) => q.eq('signerId', signer._id).eq('type', 'phone'))
			.order('desc')
			.first();

		const emailVerificationHash = emailOtp
			? await hashContent(`${emailOtp._id}:${emailOtp.usedAt}`)
			: await hashContent('no-email-verification');

		const phoneVerificationHash = phoneOtp
			? await hashContent(`${phoneOtp._id}:${phoneOtp.usedAt}`)
			: await hashContent('no-phone-verification');

		const signatureId = await ctx.db.insert('signatures', {
			documentId: signer.documentId,
			signerId: signer._id,
			blockId: args.blockId,
			signatureType: args.signatureType,
			signatureData: args.signatureData,
			signatureHash,
			signedAsName: signer.legalName,
			signedAt: now,
			ipAddress: args.ctx.ipAddress || 'unknown',
			userAgent: args.ctx.userAgent || 'unknown',
			geoLocation: args.ctx.geoLocation,
			emailVerificationHash,
			phoneVerificationHash,
			pdfX: args.pdfX,
			pdfY: args.pdfY,
			pdfPage: args.pdfPage,
			pdfWidth: args.pdfWidth,
			pdfHeight: args.pdfHeight
		});

		await ctx.db.patch(signer._id, {
			status: 'signed',
			signedAt: now
		});

		await ctx.scheduler.runAfter(0, internal.auditLogs.mutations.log, {
			signerId: signer._id,
			actorType: 'signer' as const,
			documentId: signer.documentId,
			resourceType: 'signature' as const,
			resourceId: signatureId,
			action: 'signature.created',
			level: 'security' as const,
			ipAddress: args.ctx.ipAddress,
			userAgent: args.ctx.userAgent,
			geoLocation: args.ctx.geoLocation,
			metadata: {
				documentId: signer.documentId,
				blockId: args.blockId,
				signatureType: args.signatureType,
				signatureHash,
				signedAsName: signer.legalName
			}
		});

		const allSigners = await ctx.db
			.query('signers')
			.withIndex('by_document', (q) => q.eq('documentId', signer.documentId))
			.collect();

		const allSigned = allSigners.every((s) => s.status === 'signed');

		if (allSigned) {
			await ctx.db.patch(signer.documentId, {
				status: 'completed',
				completedAt: now
			});

			await ctx.scheduler.runAfter(0, internal.auditLogs.mutations.log, {
				actorType: 'system' as const,
				documentId: signer.documentId,
				resourceType: 'document' as const,
				resourceId: signer.documentId,
				action: 'document.completed',
				level: 'security' as const,
				metadata: { signerCount: allSigners.length }
			});

			await ctx.scheduler.runAfter(0, internal.documents.actions.triggerCompletion, {
				documentId: signer.documentId
			});
		}

		return signatureId;
	}
});
