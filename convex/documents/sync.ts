/**
 * Real-Time Document Synchronization API
 * Pro-only feature using Convex Prosemirror Sync component
 *
 * This file exports ONLY the functions required by @convex-dev/prosemirror-sync
 * (getSnapshot, submitSnapshot, latestVersion, getSteps, submitSteps).
 * Additional sync utilities are in sync_utils.ts.
 *
 * @module documents/sync
 */

import { v } from 'convex/values';
import { components } from '@/convex/_generated/api';
import type { MutationCtx, QueryCtx } from '@/convex/_generated/server';
import type { Doc, Id } from '@/convex/_generated/dataModel';
import { mutation, query } from '@/convex/_generated/server';
import { requireDocumentAccess } from '@/convex/lib/auth';

/**
 * Helper to parse combined ID and check access
 * Returns null if real-time sync is not enabled (graceful degradation)
 */
async function checkAccess(
	ctx: QueryCtx | MutationCtx,
	combinedId: string,
	level: 'viewer' | 'editor'
): Promise<{ documentId: string; docId: Id<'documents'>; document: Doc<'documents'> } | null> {
	if (!combinedId || combinedId === 'skip') {
		return null;
	}

	const [documentId, guestToken] = combinedId.split(':');
	const docId = ctx.db.normalizeId('documents', documentId);
	if (!docId) { return null; }

	try {
		const { document } = await requireDocumentAccess(ctx, docId, level, guestToken);

		// Return null if real-time is not enabled (graceful degradation)
		if (document.settings?.realTimeEnabled !== true) {
			return null;
		}

		return { documentId, docId, document };
	} catch {
		return null;
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// Manual Sync API Implementation
// ═══════════════════════════════════════════════════════════════════════════

export const getSnapshot = query({
	args: { id: v.optional(v.string()) },
	handler: async (ctx, args) => {
		if (!args.id) { return null; }
		const access = await checkAccess(ctx, args.id, 'viewer');
		if (!access) { return null; }
		return await ctx.runQuery(components.prosemirrorSync.lib.getSnapshot, {
			id: access.documentId
		});
	}
});

export const submitSnapshot = mutation({
	args: { id: v.optional(v.string()), content: v.string(), version: v.number() },
	handler: async (ctx, args) => {
		if (!args.id) { return; }
		const access = await checkAccess(ctx, args.id, 'editor');
		if (!access) { return; }
		return await ctx.runMutation(components.prosemirrorSync.lib.submitSnapshot, {
			id: access.documentId,
			content: args.content,
			version: args.version
		});
	}
});

export const latestVersion = query({
	args: { id: v.optional(v.string()) },
	handler: async (ctx, args) => {
		if (!args.id) { return null; }
		const access = await checkAccess(ctx, args.id, 'viewer');
		if (!access) { return null; }
		return await ctx.runQuery(components.prosemirrorSync.lib.latestVersion, {
			id: access.documentId
		});
	}
});

export const getSteps = query({
	args: { id: v.optional(v.string()), version: v.number() },
	handler: async (ctx, args) => {
		if (!args.id) { return null; }
		const access = await checkAccess(ctx, args.id, 'viewer');
		if (!access) { return null; }
		return await ctx.runQuery(components.prosemirrorSync.lib.getSteps, {
			id: access.documentId,
			version: args.version
		});
	}
});

export const submitSteps = mutation({
	args: {
		id: v.optional(v.string()),
		version: v.number(),
		steps: v.array(v.string()),
		clientId: v.union(v.string(), v.number())
	},
	handler: async (ctx, args) => {
		if (!args.id) { return; }
		const access = await checkAccess(ctx, args.id, 'editor');
		if (!access) { return; }
		return await ctx.runMutation(components.prosemirrorSync.lib.submitSteps, {
			id: access.documentId,
			version: args.version,
			steps: args.steps,
			clientId: String(args.clientId)
		});
	}
});
