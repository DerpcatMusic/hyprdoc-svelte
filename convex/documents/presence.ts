/**
 * Real-Time Presence System
 * Tracks which users are actively viewing/editing a document
 * Pro-only feature using Convex presence component
 *
 * @module documents/presence
 */
import { Presence } from '@convex-dev/presence';
import { v } from 'convex/values';
import { components } from '@/convex/_generated/api';
import { mutation, query } from '@/convex/_generated/server';
import { requireDocumentAccess } from '@/convex/lib/auth';

// Initialize presence component
const presence = new Presence(components.presence);

/**
 * Heartbeat mutation - called periodically to maintain presence
 * Uses the presence component's heartbeat API
 *
 * NOTE: The usePresence hook requires this to return { roomToken, sessionToken }.
 * If user is not authenticated or not Pro, we throw an error rather than returning null.
 * The client should use "skip" pattern to prevent calling this for non-Pro users.
 */
export const heartbeat = mutation({
	args: {
		roomId: v.string(),
		workosId: v.string(),
		sessionId: v.string(),
		interval: v.number(),
		// Data is optional and can contain cursor/selection info
		data: v.optional(v.any())
	},
	handler: async (ctx, args) => {
		// Auth check
		const identity = await ctx.auth.getUserIdentity();

		// Extract guestToken from workosId if it's a guest (format: "guest:TOKEN")
		let guestToken: string | undefined;
		let effectiveworkosId = args.workosId;
		if (args.workosId.startsWith('guest:')) {
			guestToken = args.workosId.slice(6); // Remove "guest:" prefix
			effectiveworkosId = `guest:${guestToken.slice(0, 8)}`; // Shorten for display
		}

		if (!(identity || guestToken)) {
			throw new Error('Authentication required for presence');
		}

		// Check if document has Real-Time Sync enabled
		if (args.roomId.startsWith('doc:')) {
			const documentId = args.roomId.replace('doc:', '');
			const docId = ctx.db.normalizeId('documents', documentId);
			if (docId) {
				const { document } = await requireDocumentAccess(ctx, docId, 'viewer', guestToken);
				if (document.settings?.realTimeEnabled !== true) {
					throw new Error('Real-time presence is not enabled for this document');
				}
			}
		}

		// Call the presence component's heartbeat
		return await (presence as any).heartbeat(
			ctx,
			args.roomId,
			effectiveworkosId,
			args.sessionId,
			args.data
		);
	}
});

/**
 * Update presence data (cursor position, etc.)
 */
export const update = mutation({
	args: {
		roomToken: v.string(),
		data: v.any()
	},
	handler: async (ctx, args) => {
		// We trust the roomToken for auth here (it's signed/validated by presence lib)
		await (presence as any).update(ctx, args.roomToken, args.data);
	}
});

/**
 * List presence in a room
 * Returns list of users for a given room token
 */
export const list = query({
	args: {
		roomToken: v.string()
	},
	handler: async (ctx, args) => {
		// For list, we avoid per-user auth to share cache
		return await presence.list(ctx, args.roomToken);
	}
});

/**
 * Disconnect from presence (called on page unload via sendBeacon)
 */
export const disconnect = mutation({
	args: {
		sessionToken: v.string()
	},
	handler: async (ctx, args) => {
		// Can't reliably check auth here (called via sendBeacon on unload)
		return await presence.disconnect(ctx, args.sessionToken);
	}
});

/**
 * Helper: Generate a consistent color from a user ID
 */
export function generateColorFromId(id: string): string {
	const colors = [
		'#6366f1', // Indigo
		'#22c55e', // Green
		'#f59e0b', // Amber
		'#ec4899', // Pink
		'#8b5cf6', // Violet
		'#14b8a6', // Teal
		'#f43f5e', // Rose
		'#0ea5e9', // Sky
		'#d946ef', // Fuchsia
		'#84cc16' // Lime
	];

	let hash = 0;
	for (const char of id) {
		// biome-ignore lint/suspicious/noBitwiseOperators: Standard string hashing algorithm
		hash = char.charCodeAt(0) + ((hash << 5) - hash);
	}

	return colors[Math.abs(hash) % colors.length];
}
