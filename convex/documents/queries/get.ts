// convex/documents/queries/get.ts
import { v } from 'convex/values';
import { internalQuery, query } from '@/convex/_generated/server';
import { requireDocumentAccess } from '@/convex/lib/auth';
import { documentReturnValidator } from '@/convex/lib/validators';

/**
 * Get document by ID (with access check).
 */
export const get = query({
	args: {
		documentId: v.string(),
		guestToken: v.optional(v.string())
	},
	returns: v.union(documentReturnValidator, v.null()),
	handler: async (ctx, args) => {
		const docId = ctx.db.normalizeId('documents', args.documentId);
		if (!docId) { return null; }

		// 1. Check if public template (Fast Path)
		const doc = await ctx.db.get(docId);
		if (doc?.kind === 'template' && doc.settings?.isPublic) {
			return doc;
		}

		// 2. Standard Access Check
		const { document } = await requireDocumentAccess(ctx, docId, 'viewer', args.guestToken);
		return document;
	}
});

/**
 * Internal query to get document by ID (no access check).
 */
export const getById = internalQuery({
	args: { documentId: v.id('documents') },
	returns: v.union(documentReturnValidator, v.null()),
	handler: async (ctx, args) => {
		return await ctx.db.get(args.documentId);
	}
});

/**
 * Internal query alias for getById.
 */
export const getDocumentInternal = internalQuery({
	args: { documentId: v.id('documents') },
	returns: v.union(documentReturnValidator, v.null()),
	handler: async (ctx, args) => {
		return await ctx.db.get(args.documentId);
	}
});
