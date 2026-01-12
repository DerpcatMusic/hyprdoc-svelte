import { v } from 'convex/values';
import { query } from '@/convex/_generated/server';
import { requireAuth } from '@/convex/lib/auth';
import { auditMetadataValidator } from '@/convex/lib/schemas';

/**
 * Query all audit logs for a specific document.
 * This includes document-level events and all related signer/signature events.
 */
export const getByDocument = query({
	args: { documentId: v.id('documents') },
	returns: v.array(
		v.object({
			_id: v.id('auditLogs'),
			_creationTime: v.number(),
			workosId: v.optional(v.id('users')),
			signerId: v.optional(v.id('signers')),
			actorType: v.string(),
			documentId: v.optional(v.id('documents')),
			resourceType: v.string(),
			resourceId: v.string(),
			action: v.string(),
			level: v.string(),
			timestamp: v.number(),
			ipAddress: v.optional(v.string()),
			userAgent: v.optional(v.string()),
			geoLocation: v.optional(v.string()),
			sessionId: v.optional(v.string()),
			metadata: auditMetadataValidator,
			previousHash: v.optional(v.string()),
			entryHash: v.string()
		})
	),
	handler: async (ctx, args) => {
		// Verify ownership before showing logs (Admin/Owner check)
		const identity = await ctx.auth.getUserIdentity();
		if (identity) {
			const user = await ctx.db
				.query('users')
				.withIndex('by_workos_id', (q) => q.eq('workosId', identity.subject))
				.unique();

			if (user) {
				const document = await ctx.db.get(args.documentId);
				if (document && document.ownerId === user._id) {
					// Authorized owner
					return await ctx.db
						.query('auditLogs')
						.withIndex('by_document', (q) => q.eq('documentId', args.documentId))
						.order('desc')
						.collect();
				}
			}
		}

		// Signer check: if accessed via public signing page, we might need a different check
		// But usually getByAccessToken is used for signers.
		// For now, keep it simple and throw if not authorized.
		throw new Error('Not authorized to view audit logs for this document');
	}
});

/**
 * Query audit logs for a specific signer.
 */
export const getBySigner = query({
	args: { signerId: v.id('signers') },
	returns: v.array(
		v.object({
			_id: v.id('auditLogs'),
			_creationTime: v.number(),
			action: v.string(),
			level: v.string(),
			timestamp: v.number(),
			ipAddress: v.optional(v.string()),
			geoLocation: v.optional(v.string()),
			metadata: auditMetadataValidator,
			previousHash: v.optional(v.string()),
			entryHash: v.string()
		})
	),
	handler: async (ctx, args) => {
		const { userId } = await requireAuth(ctx);

		// Get the signer to verify ownership
		const signer = await ctx.db.get(args.signerId);
		if (!signer) {
			throw new Error('Signer not found');
		}

		// Verify document ownership
		const document = await ctx.db.get(signer.documentId);
		if (!document || document.ownerId !== userId) {
			throw new Error('Not authorized');
		}

		return await ctx.db
			.query('auditLogs')
			.withIndex('by_signer', (q) => q.eq('signerId', args.signerId))
			.order('desc')
			.collect();
	}
});

/**
 * Verify audit chain integrity.
 */
export const verifyChain = query({
	args: {
		startTimestamp: v.number(),
		endTimestamp: v.number()
	},
	returns: v.object({
		isValid: v.boolean(),
		entriesChecked: v.number(),
		firstInvalidIndex: v.optional(v.number())
	}),
	handler: async (ctx, args) => {
		await requireAuth(ctx);

		const entries = await ctx.db
			.query('auditLogs')
			.withIndex('by_timestamp')
			.order('asc')
			.collect();

		// Filter by timestamp range
		const filteredEntries = entries.filter(
			(e) => e.timestamp >= args.startTimestamp && e.timestamp <= args.endTimestamp
		);

		let isValid = true;
		let firstInvalidIndex: number | undefined;

		for (let i = 1; i < filteredEntries.length; i++) {
			const current = filteredEntries[i];
			const previous = filteredEntries[i - 1];

			if (current.previousHash !== previous.entryHash) {
				isValid = false;
				firstInvalidIndex = i;
				break;
			}
		}

		return {
			isValid,
			entriesChecked: filteredEntries.length,
			firstInvalidIndex
		};
	}
});

/**
 * Get recent audit logs for current user.
 */
export const getMyRecentLogs = query({
	args: {
		limit: v.optional(v.number())
	},
	returns: v.array(
		v.object({
			_id: v.id('auditLogs'),
			_creationTime: v.number(),
			resourceType: v.string(),
			resourceId: v.string(),
			action: v.string(),
			level: v.string(),
			timestamp: v.number(),
			metadata: auditMetadataValidator
		})
	),
	handler: async (ctx, args) => {
		const { userId } = await requireAuth(ctx);
		const limit = args.limit ?? 50;

		return await ctx.db
			.query('auditLogs')
			.withIndex('by_user', (q) => q.eq('workosId', userId))
			.order('desc')
			.take(limit);
	}
});

/**
 * Get all audit logs for signer's document (accessible via access token)
 */
export const getByAccessToken = query({
	args: { accessToken: v.string() },
	returns: v.array(
		v.object({
			_id: v.id('auditLogs'),
			_creationTime: v.number(),
			workosId: v.optional(v.id('users')),
			signerId: v.optional(v.id('signers')),
			actorType: v.string(),
			documentId: v.optional(v.id('documents')),
			resourceType: v.string(),
			resourceId: v.string(),
			action: v.string(),
			level: v.string(),
			timestamp: v.number(),
			ipAddress: v.optional(v.string()),
			userAgent: v.optional(v.string()),
			geoLocation: v.optional(v.string()),
			sessionId: v.optional(v.string()),
			metadata: auditMetadataValidator,
			previousHash: v.optional(v.string()),
			entryHash: v.string()
		})
	),
	handler: async (ctx, args) => {
		const signer = await ctx.db
			.query('signers')
			.withIndex('by_access_token', (q) => q.eq('accessToken', args.accessToken))
			.unique();

		if (!signer) { return []; }

		// Return all logs for this document
		return await ctx.db
			.query('auditLogs')
			.withIndex('by_document', (q) => q.eq('documentId', signer.documentId))
			.order('desc')
			.collect();
	}
});
