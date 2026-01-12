// convex/signatures/queries.ts
import { v } from 'convex/values';
import { query } from '@/convex/_generated/server';
import { hashContent } from '@/convex/lib/crypto';
import { signatureTypeValidator } from '@/convex/lib/validators';

/**
 * Get signatures for a document (owner only).
 */
export const getByDocument = query({
	args: { documentId: v.id('documents') },
	returns: v.array(
		v.object({
			_id: v.id('signatures'),
			_creationTime: v.number(),
			documentId: v.id('documents'),
			signerId: v.id('signers'),
			blockId: v.string(),
			signatureType: signatureTypeValidator,
			signatureData: v.string(),
			signatureHash: v.string(),
			signedAsName: v.string(),
			signedAt: v.number(),
			ipAddress: v.string(),
			geoLocation: v.optional(v.string()),
			emailVerificationHash: v.optional(v.string()),
			phoneVerificationHash: v.optional(v.string()),
			userAgent: v.optional(v.string())
		})
	),
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) { throw new Error('Authentication required'); }

		const user = await ctx.db
			.query('users')
			.withIndex('by_workos_id', (q) => q.eq('workosId', identity.subject))
			.unique();

		if (!user) { throw new Error('User not found'); }

		const document = await ctx.db.get(args.documentId);
		if (!document || document.ownerId !== user._id) { throw new Error('Not authorized'); }

		return await ctx.db
			.query('signatures')
			.withIndex('by_document', (q) => q.eq('documentId', args.documentId))
			.collect();
	}
});

/**
 * Get signatures for a document (signer access).
 */
export const getByDocumentForSigner = query({
	args: {
		documentId: v.id('documents'),
		accessToken: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		// If accessToken is provided, verify it belongs to a signer of this document
		if (args.accessToken) {
			const signer = await ctx.db
				.query('signers')
				.withIndex('by_access_token', (q) => q.eq('accessToken', args.accessToken!))
				.unique();

			if (!signer || signer.documentId !== args.documentId) {
				throw new Error('Invalid access token for this document');
			}
		} else {
			// Fallback to owner check
			const identity = await ctx.auth.getUserIdentity();
			if (!identity) { throw new Error('Authentication required'); }

			const user = await ctx.db
				.query('users')
				.withIndex('by_workos_id', (q) => q.eq('workosId', identity.subject))
				.unique();

			if (!user) { throw new Error('User not found'); }

			const document = await ctx.db.get(args.documentId);
			if (!document || document.ownerId !== user._id) { throw new Error('Not authorized'); }
		}

		return await ctx.db
			.query('signatures')
			.withIndex('by_document', (q) => q.eq('documentId', args.documentId))
			.collect();
	}
});

/**
 * Verify signature integrity.
 */
export const verify = query({
	args: { signatureId: v.id('signatures') },
	returns: v.object({
		isValid: v.boolean(),
		signatureHash: v.string(),
		signedAt: v.number(),
		signedAsName: v.string(),
		documentTitle: v.string()
	}),
	handler: async (ctx, args) => {
		const signature = await ctx.db.get(args.signatureId);
		if (!signature) { throw new Error('Signature not found'); }

		const computedHash = await hashContent(signature.signatureData);
		const isValid = computedHash === signature.signatureHash;

		const document = await ctx.db.get(signature.documentId);

		return {
			isValid,
			signatureHash: signature.signatureHash,
			signedAt: signature.signedAt,
			signedAsName: signature.signedAsName,
			documentTitle: document?.title ?? 'Unknown Document'
		};
	}
});
