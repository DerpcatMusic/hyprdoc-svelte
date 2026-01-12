// convex/signers/mutations/lifecycle.ts
import { v } from 'convex/values';
import { internal } from '@/convex/_generated/api';
import { internalMutation, mutation } from '@/convex/_generated/server';
import { hashValue } from '@/convex/lib/crypto';
import { fieldChangeValueValidator, fieldValuesValidator } from '@/convex/lib/schemas';
import { requestContextValidator } from '@/convex/lib/validators';

/**
 * Mark a signer as having viewed the document.
 */
export const markViewed = mutation({
	args: {
		accessToken: v.string(),
		ctx: requestContextValidator
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const signer = await ctx.db
			.query('signers')
			.withIndex('by_access_token', (q) => q.eq('accessToken', args.accessToken))
			.unique();

		if (!signer) { throw new Error('Invalid signing link'); }

		if (signer.status === 'pending') {
			await ctx.db.patch(signer._id, { status: 'viewed' });

			await ctx.scheduler.runAfter(0, internal.auditLogs.mutations.log, {
				signerId: signer._id,
				actorType: 'signer' as const,
				documentId: signer.documentId,
				resourceType: 'document' as const,
				resourceId: signer.documentId,
				action: 'document.viewed',
				level: 'info' as const,
				ipAddress: args.ctx.ipAddress,
				userAgent: args.ctx.userAgent,
				geoLocation: args.ctx.geoLocation,
				metadata: { signerEmail: signer.email }
			});
		}

		return null;
	}
});

/**
 * Mark a signer as signed (internal).
 */
export const markSigned = internalMutation({
	args: {
		signerId: v.id('signers'),
		ipAddress: v.string()
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		await ctx.db.patch(args.signerId, {
			status: 'signed',
			signedAt: Date.now()
		});
		return null;
	}
});

/**
 * Save signer's field values during signing.
 * Enhanced for eIDAS 2.0 compliance with detailed audit logging.
 */
export const saveFieldValues = mutation({
	args: {
		accessToken: v.string(),
		fieldValues: fieldValuesValidator,

		// Enhanced field change tracking
		lastUpdatedBlockId: v.optional(v.string()),
		lastUpdatedLabel: v.optional(v.string()),
		lastUpdatedBlockType: v.optional(v.string()),
		lastUpdatedPreviousValue: v.optional(fieldChangeValueValidator),
		lastUpdatedFieldPosition: v.optional(v.number()),
		lastUpdatedIsRequired: v.optional(v.boolean()),

		ctx: requestContextValidator
	},
	returns: v.object({ success: v.boolean() }),
	handler: async (ctx, args) => {
		const signer = await ctx.db
			.query('signers')
			.withIndex('by_access_token', (q) => q.eq('accessToken', args.accessToken))
			.unique();

		if (!signer) { throw new Error('Invalid signing link'); }
		if (signer.status === 'signed') { throw new Error('Document already signed'); }

		await ctx.db.patch(signer._id, {
			fieldValues: args.fieldValues,
			fieldValuesUpdatedAt: Date.now()
		});

		if (args.lastUpdatedBlockId) {
			const blockType = args.lastUpdatedBlockType || 'text_input';
			const isSensitive = blockType === 'signature' || blockType === 'initials';
			const newValue = args.fieldValues[args.lastUpdatedBlockId];

			// Compute SHA-256 hash of value for integrity verification
			const valueHash = await hashValue(newValue);

			// Use enhanced logFieldUpdate with full field change data
			await ctx.scheduler.runAfter(0, internal.auditLogs.mutations.logFieldUpdate, {
				signerId: signer._id,
				documentId: signer.documentId,
				fieldChange: {
					blockId: args.lastUpdatedBlockId,
					blockType,
					label: args.lastUpdatedLabel || 'Field',
					previousValue: args.lastUpdatedPreviousValue,
					newValue,
					valueHash,
					fieldPosition: args.lastUpdatedFieldPosition,
					isRequired: args.lastUpdatedIsRequired,
					isSensitive
				},
				ctx: {
					ipAddress: args.ctx.ipAddress,
					userAgent: args.ctx.userAgent,
					geoLocation: args.ctx.geoLocation
				}
			});
		} else {
			// Bulk update without specific field tracking
			await ctx.scheduler.runAfter(0, internal.auditLogs.mutations.log, {
				signerId: signer._id,
				actorType: 'signer' as const,
				documentId: signer.documentId,
				resourceType: 'document' as const,
				resourceId: signer.documentId,
				action: 'signer.fields_bulk_updated',
				level: 'info' as const,
				ipAddress: args.ctx.ipAddress,
				userAgent: args.ctx.userAgent,
				geoLocation: args.ctx.geoLocation,
				metadata: {
					signerEmail: signer.email,
					fieldCount: Object.keys(args.fieldValues || {}).length
				}
			});
		}

		return { success: true };
	}
});
