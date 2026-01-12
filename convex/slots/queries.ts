// convex/slots/queries.ts
import { v } from 'convex/values';
import { query } from '@/convex/_generated/server';
import { requireDocumentAccess } from '@/convex/lib/auth';

/**
 * List all slots for a document (template)
 */
export const listByDocument = query({
	args: {
		documentId: v.id('documents'),
		guestToken: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		// Verify document access (viewers can see slots)
		await requireDocumentAccess(ctx, args.documentId, 'viewer', args.guestToken);

		return await ctx.db
			.query('slots')
			.withIndex('by_document', (q) => q.eq('documentId', args.documentId))
			.collect();
	}
});

/**
 * Get a single slot by ID
 */
export const get = query({
	args: {
		slotId: v.id('slots'),
		guestToken: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const slot = await ctx.db.get(args.slotId);
		if (!slot) { return null; }

		// Verify document access
		await requireDocumentAccess(ctx, slot.documentId, 'viewer', args.guestToken);

		return slot;
	}
});
