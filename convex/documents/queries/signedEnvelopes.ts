// convex/documents/queries/signedEnvelopes.ts
import { v } from 'convex/values';
import type { Id } from '@/convex/_generated/dataModel';
import { query } from '@/convex/_generated/server';
import { requireAuth } from '@/convex/lib/auth';

/**
 * List envelopes where the current user was a signer and the envelope is completed.
 * This powers the "Signed" tab in the dashboard.
 */
export const listSignedByUser = query({
	args: {
		limit: v.optional(v.number())
	},
	returns: v.array(
		v.object({
			_id: v.id('documents'),
			title: v.string(),
			status: v.string(),
			completedAt: v.optional(v.number()),
			signedAt: v.number(),
			ownerName: v.optional(v.string()),
			ownerEmail: v.optional(v.string()),
			signedPdfStorageId: v.optional(v.id('_storage'))
		})
	),
	handler: async (ctx, args) => {
		const { workosId } = await requireAuth(ctx);
		const user = await ctx.db.get(workosId);

		if (!user?.email) {
			console.warn(`[listSignedByUser] User ${workosId} has no email`);
			return [];
		}

		const email = user.email.toLowerCase();
		const limit = args.limit ?? 50;

		// Find all signers with this user's email who have signed
		const signerRecords = await ctx.db
			.query('signers')
			.withIndex('by_email', (q) => q.eq('email', email))
			.filter((q) => q.eq(q.field('status'), 'signed'))
			.collect();

		// Get unique document IDs
		const documentIds = [...new Set(signerRecords.map((s) => s.documentId))];

		const results: {
			_id: (typeof documentIds)[0];
			title: string;
			status: string;
			completedAt?: number;
			signedAt: number;
			ownerName?: string;
			ownerEmail?: string;
			signedPdfStorageId?: Id<'_storage'>;
		}[] = [];

		for (const docId of documentIds.slice(0, limit)) {
			const doc = await ctx.db.get(docId);
			if (!doc || doc.status !== 'completed') { continue; }

			// Skip documents owned by the user (they appear in their own envelopes list)
			if (doc.ownerId === user._id) { continue; }

			const signer = signerRecords.find((s) => s.documentId === docId);
			const owner = await ctx.db.get(doc.ownerId);

			results.push({
				_id: doc._id,
				title: doc.title,
				status: doc.status,
				completedAt: doc.completedAt,
				signedAt: signer?.signedAt || doc.completedAt || Date.now(),
				ownerName: owner?.name,
				ownerEmail: owner?.email,
				signedPdfStorageId: doc.signedPdfStorageId
			});
		}

		// Sort by signedAt descending
		results.sort((a, b) => b.signedAt - a.signedAt);

		return results;
	}
});
