import { v, type Infer } from 'convex/values';
import { mutation } from '@/convex/_generated/server';
import { requireDocumentOwner } from '@/convex/lib/auth';
import { resolveDocumentVariables, type ResolveVariablesOptions } from '@/convex/lib/content_transform';
import { hashContent } from '@/convex/lib/crypto';
import { documentSettingsValidator, partialDocumentSettingsValidator } from '@/convex/lib/schemas';
import { validateForSealing } from '@/convex/lib/services/sealing_service';
import { requestContextValidator } from '@/convex/lib/validators';

/**
 * Share a document - seals it and starts audit trail.
 */
export const shareDocument = mutation({
	args: {
		documentId: v.id('documents'),
		settings: v.optional(partialDocumentSettingsValidator),
		ctx: v.optional(requestContextValidator)
	},
	returns: v.object({
		contentHash: v.string(),
		sealedAt: v.number()
	}),
	handler: async (ctx, args) => {
		const { workosId, document } = await requireDocumentOwner(ctx, args.documentId);

		if (document.kind === 'template') {
			throw new Error('Templates cannot be shared directly. Send as an envelope first.');
		}

		let currentSettings: Infer<typeof documentSettingsValidator> = document.settings || {
			fontBody: 'Inter',
			fontHeading: 'Outfit',
			paperColor: '#ffffff',
			paperTexture: 'none',
			paperTextureOpacity: 0,
			paperTextureScale: 1,
			marginVertical: 40,
			marginHorizontal: 40,
			showMargins: false,
			mirrorMargins: false,
			timeFormat: '12h' as const
		};

		if (args.settings) {
			currentSettings = { ...currentSettings, ...args.settings };
			await ctx.db.patch(args.documentId, { settings: currentSettings });
		}

		if (document.status === 'pending_signatures' && document.contentHash && document.sealedAt) {
			return { contentHash: document.contentHash, sealedAt: document.sealedAt };
		}

		// Use sealing service for validation
		const validationError = validateForSealing(document);
		if (validationError) { throw new Error(validationError); }

		const signers = await ctx.db
			.query('signers')
			.withIndex('by_document', (q) => q.eq('documentId', args.documentId))
			.collect();

		if (signers.length === 0) { throw new Error('Add at least one signer before sharing'); }

		const resolvedContent = resolveDocumentVariables(document.content, {
			blocks: document.blocks || [],
			slots: signers.map((s) => ({
				name: s.legalName,
				legalName: s.legalName,
				email: s.email,
				role: s.role
			})),
			documentSettings: {
				title: document.title,
				...currentSettings
			}
		} as ResolveVariablesOptions);

		const now = Date.now();
		const contentHash = await hashContent(
			JSON.stringify({
				content: resolvedContent,
				blocks: document.blocks,
				settings: currentSettings,
				sealedAt: now
			})
		);

		await ctx.db.insert('documentVersions', {
			documentId: args.documentId,
			version: document.version,
			content: document.content,
			blocks: document.blocks,
			contentHash,
			createdAt: now,
			createdBy: workosId
		});

		await ctx.db.patch(args.documentId, {
			status: 'pending_signatures',
			content: resolvedContent,
			contentHash,
			sealedAt: now,
			version: document.version + 1,
			settings: currentSettings
		});

		return { contentHash, sealedAt: now };
	}
});

/**
 * Revoke sharing - returns document to draft mode.
 */
export const revokeSharing = mutation({
	args: {
		documentId: v.id('documents'),
		ctx: v.optional(requestContextValidator)
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const { document } = await requireDocumentOwner(ctx, args.documentId);

		if (document.status !== 'pending_signatures') {
			throw new Error('Can only revoke sharing for pending documents');
		}

		const signers = await ctx.db
			.query('signers')
			.withIndex('by_document', (q) => q.eq('documentId', args.documentId))
			.collect();

		const anySigned = signers.some((s) => s.status === 'signed');
		if (anySigned) { throw new Error('Cannot revoke sharing after someone has signed'); }

		for (const signer of signers) {
			await ctx.db.patch(signer._id, {
				tokenExpiresAt: Date.now() - 1,
				verificationStatus: 'expired'
			});
		}

		await ctx.db.patch(args.documentId, {
			status: 'draft',
			contentHash: undefined,
			sealedAt: undefined
		});

		return null;
	}
});
