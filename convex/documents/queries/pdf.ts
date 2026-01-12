// convex/documents/queries/pdf.ts
import { v } from 'convex/values';
import { query } from '@/convex/_generated/server';
import { requireDocumentAccess } from '@/convex/lib/auth';

/**
 * Get signed PDF download URL.
 */
export const getSignedPdfUrl = query({
	args: { documentId: v.id('documents') },
	returns: v.union(v.string(), v.null()),
	handler: async (ctx, args) => {
		const { document } = await requireDocumentAccess(ctx, args.documentId, 'viewer');
		if (!document.signedPdfStorageId) { return null; }
		return await ctx.storage.getUrl(document.signedPdfStorageId);
	}
});

/**
 * Get audit PDF download URL.
 */
export const getAuditPdfUrl = query({
	args: { documentId: v.id('documents') },
	returns: v.union(v.string(), v.null()),
	handler: async (ctx, args) => {
		const { document } = await requireDocumentAccess(ctx, args.documentId, 'viewer');
		if (!document.auditPdfStorageId) { return null; }
		return await ctx.storage.getUrl(document.auditPdfStorageId);
	}
});

/**
 * Get signed PDF URL for signer (by access token).
 */
export const getSignedPdfUrlForSigner = query({
	args: { accessToken: v.string() },
	returns: v.union(v.string(), v.null()),
	handler: async (ctx, args) => {
		const signer = await ctx.db
			.query('signers')
			.withIndex('by_access_token', (q) => q.eq('accessToken', args.accessToken))
			.unique();

		if (!signer) { return null; }
		const document = await ctx.db.get(signer.documentId);
		if (!document || document.status !== 'completed' || !document.signedPdfStorageId) { return null; }

		return await ctx.storage.getUrl(document.signedPdfStorageId);
	}
});
