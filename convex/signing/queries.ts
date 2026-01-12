// convex/signing/queries.ts
import { v } from 'convex/values';
import { query } from '@/convex/_generated/server';

/**
 * Get document by shared signing slug (public query - no auth required)
 */
export const getDocumentBySharedSlug = query({
	args: { slug: v.string() },
	returns: v.union(
		v.object({
			_id: v.id('documents'),
			title: v.string(),
			sharedSigningEnabled: v.boolean(),
			sharedSigningSettings: v.optional(
				v.object({
					allowSelfRegistration: v.boolean(),
					maxSigners: v.optional(v.number()),
					requireEmailMatch: v.optional(v.boolean())
				})
			),
			status: v.string(),
			currentSignerCount: v.number()
		}),
		v.null()
	),
	handler: async (ctx, args) => {
		const document = await ctx.db
			.query('documents')
			.withIndex('by_shared_slug', (q) => q.eq('sharedSigningSlug', args.slug))
			.first();

		if (!(document?.sharedSigningEnabled)) {
			return null;
		}

		const signers = await ctx.db
			.query('signers')
			.withIndex('by_document', (q) => q.eq('documentId', document._id))
			.collect();

		return {
			_id: document._id,
			title: document.title,
			sharedSigningEnabled: document.sharedSigningEnabled ?? false,
			sharedSigningSettings: document.sharedSigningSettings,
			status: document.status,
			currentSignerCount: signers.length
		};
	}
});

/**
 * Get shared signing status for a document (for owner to see)
 */
export const getSharedSigningStatus = query({
	args: {
		documentId: v.id('documents')
	},
	returns: v.union(
		v.object({
			enabled: v.boolean(),
			slug: v.optional(v.string()),
			settings: v.optional(
				v.object({
					allowSelfRegistration: v.boolean(),
					maxSigners: v.optional(v.number()),
					requireEmailMatch: v.optional(v.boolean())
				})
			),
			signerCount: v.number()
		}),
		v.null()
	),
	handler: async (ctx, args) => {
		const document = await ctx.db.get(args.documentId);

		if (!document) {
			return null;
		}

		const signers = await ctx.db
			.query('signers')
			.withIndex('by_document', (q) => q.eq('documentId', document._id))
			.collect();

		return {
			enabled: document.sharedSigningEnabled ?? false,
			slug: document.sharedSigningSlug,
			settings: document.sharedSigningSettings,
			signerCount: signers.length
		};
	}
});
