/**
 * Document Changes Mutations (Track Changes / Redlining)
 *
 * Handles creation and resolution of document change suggestions.
 */

import { v } from 'convex/values';
import { mutation } from '../_generated/server';

/**
 * Create a new pending change suggestion
 */
export const createChange = mutation({
	args: {
		documentId: v.id('documents'),
		changeType: v.union(v.literal('insertion'), v.literal('deletion'), v.literal('replacement')),
		originalContent: v.optional(v.string()),
		newContent: v.optional(v.string()),
		position: v.number(),
		endPosition: v.optional(v.number()),
		authorName: v.string(),
		authorColor: v.optional(v.string()),
		comment: v.optional(v.string()),
		changeId: v.string()
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error('Authentication required');
		}

		// Get user ID
		const user = await ctx.db
			.query('users')
			.withIndex('by_workos_id', (q) => q.eq('workosId', identity.subject))
			.unique();

		const changeId = await ctx.db.insert('documentChanges', {
			documentId: args.documentId,
			changeType: args.changeType,
			originalContent: args.originalContent,
			newContent: args.newContent,
			position: args.position,
			endPosition: args.endPosition,
			authorId: user?._id,
			authorName: args.authorName,
			authorColor: args.authorColor,
			changeId: args.changeId,
			status: 'pending',
			createdAt: Date.now(),
			comment: args.comment
		});

		return changeId;
	}
});

/**
 * Resolve a change (accept or reject)
 */
export const resolveChange = mutation({
	args: {
		changeId: v.id('documentChanges'),
		resolution: v.union(v.literal('accepted'), v.literal('rejected'))
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error('Authentication required');
		}

		const user = await ctx.db
			.query('users')
			.withIndex('by_workos_id', (q) => q.eq('workosId', identity.subject))
			.unique();

		const change = await ctx.db.get(args.changeId);
		if (!change) {
			throw new Error('Change not found');
		}

		if (change.status !== 'pending') {
			throw new Error('Change has already been resolved');
		}

		// Verify user owns the document
		const document = await ctx.db.get(change.documentId);
		if (!document || document.ownerId !== user?._id) {
			throw new Error('Only the document owner can resolve changes');
		}

		await ctx.db.patch(args.changeId, {
			status: args.resolution,
			resolvedAt: Date.now(),
			resolvedBy: user?._id
		});

		return { success: true, resolution: args.resolution };
	}
});

/**
 * Bulk resolve all pending changes for a document
 */
export const bulkResolveChanges = mutation({
	args: {
		documentId: v.id('documents'),
		resolution: v.union(v.literal('accepted'), v.literal('rejected'))
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error('Authentication required');
		}

		const user = await ctx.db
			.query('users')
			.withIndex('by_workos_id', (q) => q.eq('workosId', identity.subject))
			.unique();

		const document = await ctx.db.get(args.documentId);
		if (!document || document.ownerId !== user?._id) {
			throw new Error('Only the document owner can resolve changes');
		}

		const pendingChanges = await ctx.db
			.query('documentChanges')
			.withIndex('by_document_and_status', (q) =>
				q.eq('documentId', args.documentId).eq('status', 'pending')
			)
			.collect();

		const now = Date.now();
		for (const change of pendingChanges) {
			await ctx.db.patch(change._id, {
				status: args.resolution,
				resolvedAt: now,
				resolvedBy: user?._id
			});
		}

		return { success: true, resolvedCount: pendingChanges.length };
	}
});

/**
 * Delete a pending change (only by the author)
 */
export const deleteChange = mutation({
	args: {
		changeId: v.id('documentChanges')
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error('Authentication required');
		}

		const user = await ctx.db
			.query('users')
			.withIndex('by_workos_id', (q) => q.eq('workosId', identity.subject))
			.unique();

		const change = await ctx.db.get(args.changeId);
		if (!change) {
			throw new Error('Change not found');
		}

		if (change.status !== 'pending') {
			throw new Error('Only pending changes can be deleted');
		}

		// Only author can delete their own change
		if (change.authorId !== user?._id) {
			throw new Error('Only the author can delete this change');
		}

		await ctx.db.delete(args.changeId);
		return { success: true };
	}
});
