/**
 * Custom Sync Utilities
 * These functions extend the base prosemirror-sync functionality
 * to bridge content between real-time sync and the documents.content field.
 *
 * Separated from sync.ts to avoid breaking the prosemirror-sync API shape.
 *
 * @module documents/sync_utils
 */

import { ProsemirrorSync } from '@convex-dev/prosemirror-sync';
import { v } from 'convex/values';
import { components } from '@/convex/_generated/api';
import type { MutationCtx, QueryCtx } from '@/convex/_generated/server';
import { mutation, query } from '@/convex/_generated/server';
import { requireAuth, requireDocumentAccess } from '@/convex/lib/auth';
import { isPro } from '@/convex/lib/subscription';

// Initialize the Prosemirror Sync component
const prosemirrorSync = new ProsemirrorSync(components.prosemirrorSync);

/**
 * Require Pro subscription for collab features
 */
async function requireProAccess(ctx: QueryCtx | MutationCtx) {
	const { userId } = await requireAuth(ctx);
	const user = await ctx.db.get(userId);
	if (!(user && isPro(user))) {
		throw new Error('Real-time collaboration requires Pro subscription');
	}
	return { workosId: userId, user };
}

/**
 * Get current content from sync document (for reading before disable)
 */
export const getSyncContent = query({
	args: {
		documentId: v.id('documents'),
		guestToken: v.optional(v.string())
	},
	returns: v.union(v.any(), v.null()),
	handler: async (ctx, args) => {
		// Verify access
		await requireDocumentAccess(ctx, args.documentId, 'viewer', args.guestToken);

		try {
			const snapshot = await ctx.runQuery(components.prosemirrorSync.lib.getSnapshot, {
				id: String(args.documentId)
			});
			return snapshot?.content ?? null;
		} catch {
			return null;
		}
	}
});

/**
 * Sync content from prosemirrorSync back to documents.content
 * This ensures the DB stays up-to-date with collaborative edits.
 * Called before disabling real-time sync to prevent content loss.
 */
export const syncToDatabase = mutation({
	args: {
		documentId: v.id('documents'),
		guestToken: v.optional(v.string()),
		content: v.optional(v.string())
	},
	returns: v.object({
		success: v.boolean(),
		message: v.optional(v.string())
	}),
	handler: async (ctx, args) => {
		// Verify editor access
		const { document } = await requireDocumentAccess(
			ctx,
			args.documentId,
			'editor',
			args.guestToken
		);

		// If content is provided directly (from frontend editor), use it
		if (args.content) {
			await ctx.db.patch(args.documentId, {
				content: args.content,
				updatedAt: Date.now(),
				version: document.version + 1
			});
			return { success: true, message: 'Synced from provided content' };
		}

		// Otherwise, try to read from prosemirrorSync
		try {
			const snapshot = await ctx.runQuery(components.prosemirrorSync.lib.getSnapshot, {
				id: String(args.documentId)
			});

			if (!snapshot?.content) {
				return { success: false, message: 'No sync content found' };
			}

			// Write sync content back to documents.content
			await ctx.db.patch(args.documentId, {
				content: JSON.stringify(snapshot.content),
				updatedAt: Date.now(),
				version: document.version + 1
			});

			return { success: true, message: 'Synced from prosemirrorSync' };
		} catch (error) {
			console.error('[syncToDatabase] Failed to sync:', error);
			return { success: false, message: String(error) };
		}
	}
});

/**
 * Initialize sync document from existing content
 */
export const initializeFromExisting = mutation({
	args: {
		documentId: v.id('documents'),
		guestToken: v.optional(v.string()),
		seedContent: v.optional(v.any())
	},
	returns: v.object({
		status: v.union(v.literal('created'), v.literal('exists'), v.literal('failed'))
	}),
	handler: async (ctx, args) => {
		// Verify document access
		const { document: doc } = await requireDocumentAccess(
			ctx,
			args.documentId,
			'editor',
			args.guestToken
		);

		// Verify Real-Time Sync is enabled
		if (doc.settings?.realTimeEnabled !== true) {
			throw new Error('Real-time synchronization is not enabled for this document');
		}

		// Check if sync doc already exists
		const version = await ctx.runQuery(components.prosemirrorSync.lib.latestVersion, {
			id: String(args.documentId)
		});
		if (version !== null) {
			return { status: 'exists' as const };
		}

		// Prepare initial content
		let initialContent: Record<string, unknown>;

		if (args.seedContent) {
			initialContent = args.seedContent as Record<string, unknown>;
		} else {
			try {
				if (doc.content?.trim()) {
					initialContent = JSON.parse(doc.content);
				} else {
					initialContent = {
						type: 'doc',
						content: [{ type: 'paragraph', content: [] }]
					};
				}
			} catch {
				initialContent = {
					type: 'doc',
					content: [{ type: 'paragraph', content: [] }]
				};
			}
		}

		// Create the sync document
		await prosemirrorSync.create(ctx, String(args.documentId), initialContent);

		return { status: 'created' as const };
	}
});

/**
 * Check if a document has been initialized for sync
 */
export const hasSyncDoc = query({
	args: {
		documentId: v.id('documents')
	},
	returns: v.boolean(),
	handler: async (ctx, args) => {
		try {
			await requireProAccess(ctx);
		} catch {
			return false;
		}

		try {
			const version = await ctx.runQuery(components.prosemirrorSync.lib.latestVersion, {
				id: String(args.documentId)
			});
			return version !== null;
		} catch {
			return false;
		}
	}
});
