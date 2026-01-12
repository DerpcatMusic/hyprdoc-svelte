// convex/documents/queries/fields.ts
import { v } from 'convex/values';
import { query } from '@/convex/_generated/server';
import { requireDocumentAccess } from '@/convex/lib/auth';

/**
 * Get default signer fields for a document.
 */
export const getDefaultSignerFields = query({
	args: { documentId: v.id('documents') },
	returns: v.array(
		v.object({
			type: v.string(),
			label: v.string(),
			required: v.boolean(),
			placeholder: v.optional(v.string()),
			options: v.optional(v.array(v.string()))
		})
	),
	handler: async (ctx, args) => {
		const { document } = await requireDocumentAccess(ctx, args.documentId, 'viewer');
		return document.settings?.defaultSignerFields || [];
	}
});
