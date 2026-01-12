import { v } from 'convex/values';
import { authenticatedMutation } from '@/convex/lib/procedures';
import { requireDocumentOwner } from '@/convex/lib/auth';

/**
 * Delete a document.
 */
export const remove = authenticatedMutation({
	args: {
		documentId: v.id('documents')
	},
	handler: async (ctx, args) => {
		// Even though authenticatedMutation ensures valid User,
		// requireDocumentOwner checks ownership logic + existence.
		// We could refactor requireDocumentOwner to accept 'user' if we wanted optimizations,
		// but keeping it is fine. It will just re-fetch identity or use cached if consistent.
		// Note: requireDocumentOwner calls requireAuth internaly.
		// Optimized approach: Pass ctx.user to a new verifyOwner function?
		// For now, simpler: keep usage pattern but enjoy strict typing context.
		
		await requireDocumentOwner(ctx, args.documentId);
		await ctx.db.delete(args.documentId);
	}
});
