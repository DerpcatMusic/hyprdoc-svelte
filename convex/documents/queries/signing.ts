// convex/documents/queries/signing.ts
import { v } from 'convex/values';
import { internalQuery, query } from '@/convex/_generated/server';
import {
	blocksArrayValidator,
	documentSettingsValidator,
	fieldValuesValidator
} from '@/convex/lib/schemas';
import { documentReturnValidator, signerReturnValidator } from '@/convex/lib/validators';

/**
 * Get document for signing (public, limited data until consent).
 */
export const getForSigning = query({
	args: { accessToken: v.string() },
	returns: v.union(
		v.object({
			title: v.string(),
			content: v.string(),
			blocks: blocksArrayValidator,
			settings: v.optional(documentSettingsValidator),
			ownerName: v.optional(v.string()),
			isRevealed: v.boolean(),
			slots: v.optional(
				v.array(
					v.object({
						id: v.string(),
						name: v.string(),
						color: v.string(),
						initials: v.string(),
						role: v.string(),
						sourceSlotId: v.optional(v.string())
					})
				)
			),
			signerSlotId: v.optional(v.string()),
			signerFieldValues: v.optional(fieldValuesValidator),
			documentStatus: v.optional(v.string()),
			_id: v.id('documents')
		}),
		v.null()
	),
	handler: async (ctx, args) => {
		const signer = await ctx.db
			.query('signers')
			.withIndex('by_access_token', (q) => q.eq('accessToken', args.accessToken))
			.unique();

		if (!signer) { return null; }
		if (signer.tokenExpiresAt < Date.now()) { return null; }

		const signers = await ctx.db
			.query('signers')
			.withIndex('by_document', (q) => q.eq('documentId', signer.documentId))
			.collect();

		const doc = await ctx.db.get(signer.documentId);
		if (!doc) { return null; }

		const isRevealed = !!signer.consentGivenAt;

		if (!isRevealed) {
			return {
				title: doc.title,
				content: '',
				blocks: [],
				settings: undefined,
				ownerName: undefined,
				isRevealed: false,
				_id: doc._id
			};
		}

		const owner = await ctx.db.get(doc.ownerId);

		return {
			title: doc.title,
			content: doc.content,
			blocks: doc.blocks,
			settings: doc.settings,
			ownerName: owner?.name,
			isRevealed: true,
			_id: doc._id,
			slots: signers.map((s) => ({
				id: String(s._id),
				name: s.legalName || s.email,
				color: s.color || '#000000',
				initials: (s.legalName || s.email).slice(0, 2).toUpperCase(),
				role: s.role,
				sourceSlotId: s.sourceSlotId
			})),
			signerId: String(signer._id),
			signerSlotId: signer.sourceSlotId || String(signer._id),
			signerFieldValues: signer.fieldValues,
			documentStatus: doc.status
		};
	}
});

/**
 * Get signers for email (internal).
 */
export const getSignersForEmail = internalQuery({
	args: { documentId: v.id('documents') },
	returns: v.array(
		v.object({
			email: v.optional(v.string()),
			legalName: v.optional(v.string())
		})
	),
	handler: async (ctx, args) => {
		const signers = await ctx.db
			.query('signers')
			.withIndex('by_document', (q) => q.eq('documentId', args.documentId))
			.collect();

		return signers.map((s) => ({
			email: s.email,
			legalName: s.legalName
		}));
	}
});

/**
 * Get data for PDF generation (internal).
 */
export const getForPdfGeneration = internalQuery({
	args: { documentId: v.id('documents') },
	returns: v.union(
		v.object({
			document: documentReturnValidator,
			signers: v.array(signerReturnValidator),
			signatures: v.array(
				v.object({
					_id: v.id('signatures'),
					_creationTime: v.number(),
					documentId: v.id('documents'),
					signerId: v.id('signers'),
					blockId: v.string(),
					signatureType: v.union(v.literal('draw'), v.literal('type'), v.literal('upload')),
					signatureData: v.string(),
					signatureHash: v.string(),
					signedAsName: v.string(),
					signedAt: v.number(),
					ipAddress: v.string(),
					userAgent: v.string(),
					geoLocation: v.optional(v.string()),
					emailVerificationHash: v.string(),
					phoneVerificationHash: v.string()
				})
			),
			auditLogs: v.array(
				v.object({
					_id: v.id('auditLogs'),
					_creationTime: v.number(),
					actorType: v.string(),
					resourceType: v.string(),
					resourceId: v.string(),
					action: v.string(),
					level: v.string(),
					timestamp: v.number(),
					entryHash: v.string(),
					documentId: v.optional(v.id('documents')),
					workosId: v.optional(v.id('users')),
					signerId: v.optional(v.id('signers')),
					ipAddress: v.optional(v.string()),
					userAgent: v.optional(v.string())
				})
			)
		}),
		v.null()
	),
	handler: async (ctx, args) => {
		const document = await ctx.db.get(args.documentId);
		if (!document) { return null; }

		const signers = await ctx.db
			.query('signers')
			.withIndex('by_document', (q) => q.eq('documentId', args.documentId))
			.collect();

		const signatures = await ctx.db
			.query('signatures')
			.withIndex('by_document', (q) => q.eq('documentId', args.documentId))
			.collect();

		const auditLogs = await ctx.db
			.query('auditLogs')
			.withIndex('by_resource', (q) =>
				q.eq('resourceType', 'document').eq('resourceId', args.documentId)
			)
			.order('asc')
			.collect();

		return { document, signers, signatures, auditLogs };
	}
});
