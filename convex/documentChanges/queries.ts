/**
 * Document Changes Queries (Track Changes / Redlining)
 *
 * Queries for retrieving document change suggestions.
 */

import { v } from 'convex/values';
import { query } from '../_generated/server';

/**
 * Get all pending changes for a document
 */
export const listPendingChanges = query({
	args: {
		documentId: v.id('documents')
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query('documentChanges')
			.withIndex('by_document_and_status', (q) =>
				q.eq('documentId', args.documentId).eq('status', 'pending')
			)
			.order('asc')
			.collect();
	}
});

/**
 * Get all changes for a document (including resolved)
 */
export const listAllChanges = query({
	args: {
		documentId: v.id('documents'),
		includeResolved: v.optional(v.boolean())
	},
	handler: async (ctx, args) => {
		const query = ctx.db
			.query('documentChanges')
			.withIndex('by_document', (q) => q.eq('documentId', args.documentId))
			.order('asc');

		const changes = await query.collect();

		if (args.includeResolved) {
			return changes;
		}

		return changes.filter((c) => c.status === 'pending');
	}
});

/**
 * Get change statistics for a document
 */
export const getChangeStats = query({
	args: {
		documentId: v.id('documents')
	},
	handler: async (ctx, args) => {
		const changes = await ctx.db
			.query('documentChanges')
			.withIndex('by_document', (q) => q.eq('documentId', args.documentId))
			.collect();

		return {
			pending: changes.filter((c) => c.status === 'pending').length,
			accepted: changes.filter((c) => c.status === 'accepted').length,
			rejected: changes.filter((c) => c.status === 'rejected').length,
			total: changes.length
		};
	}
});

/**
 * Get changes by a specific author on a document
 */
export const getChangesByAuthor = query({
	args: {
		documentId: v.id('documents'),
		authorId: v.id('users')
	},
	handler: async (ctx, args) => {
		const changes = await ctx.db
			.query('documentChanges')
			.withIndex('by_document', (q) => q.eq('documentId', args.documentId))
			.collect();

		return changes.filter((c) => c.authorId === args.authorId);
	}
});

/**
 * Get a single change by ID
 */
export const getChange = query({
	args: {
		changeId: v.id('documentChanges')
	},
	handler: async (ctx, args) => {
		return await ctx.db.get(args.changeId);
	}
});
