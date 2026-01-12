// convex/signing/mutations.ts
import { v } from 'convex/values';
import { nanoid } from 'nanoid';
import { mutation } from '@/convex/_generated/server';
import { hashContent } from '@/convex/lib/crypto';
import { requestContextValidator } from '@/convex/lib/validators';

/**
 * Find existing signer or create new one for shared signing
 */
export const findOrCreateSigner = mutation({
	args: {
		slug: v.string(),
		email: v.string(),
		name: v.optional(v.string()),
		ctx: v.optional(requestContextValidator)
	},
	returns: v.union(
		v.object({
			success: v.literal(true),
			accessToken: v.string(),
			isNewSigner: v.boolean()
		}),
		v.object({
			success: v.literal(false),
			error: v.string()
		})
	),
	handler: async (ctx, args) => {
		const document = await ctx.db
			.query('documents')
			.withIndex('by_shared_slug', (q) => q.eq('sharedSigningSlug', args.slug))
			.first();

		if (!document) {
			return { success: false, error: 'Document not found' } as const;
		}

		if (!document.sharedSigningEnabled) {
			return { success: false, error: 'Shared signing is not enabled for this document' } as const;
		}

		if (document.status !== 'pending_signatures') {
			return { success: false, error: 'Document is not open for signing' } as const;
		}

		const settings = document.sharedSigningSettings;

		const existingSigner = await ctx.db
			.query('signers')
			.withIndex('by_document', (q) => q.eq('documentId', document._id))
			.filter((q) => q.eq(q.field('email'), args.email.toLowerCase().trim()))
			.first();

		if (existingSigner) {
			return {
				success: true,
				accessToken: existingSigner.accessToken,
				isNewSigner: false
			} as const;
		}

		if (settings?.requireEmailMatch) {
			return {
				success: false,
				error: 'Email not found. Only invited signers can access this document.'
			} as const;
		}

		if (!settings?.allowSelfRegistration) {
			return {
				success: false,
				error: 'Self-registration is not allowed for this document'
			} as const;
		}

		if (settings?.maxSigners) {
			const currentSignerCount = await ctx.db
				.query('signers')
				.withIndex('by_document', (q) => q.eq('documentId', document._id))
				.collect();

			if (currentSignerCount.length >= settings.maxSigners) {
				return { success: false, error: 'Maximum number of signers reached' } as const;
			}
		}

		const accessToken = nanoid(32);
		const now = Date.now();
		const tokenExpiresAt = now + 7 * 24 * 60 * 60 * 1000;

		const colors = [
			'#6366f1',
			'#8b5cf6',
			'#d946ef',
			'#ec4899',
			'#f43f5e',
			'#f97316',
			'#eab308',
			'#22c55e',
			'#14b8a6',
			'#0ea5e9'
		];
		const randomColor = colors[Math.floor(Math.random() * colors.length)];

		const signers = await ctx.db
			.query('signers')
			.withIndex('by_document', (q) => q.eq('documentId', document._id))
			.collect();
		const maxOrder = signers.reduce((max, s) => Math.max(max, s.order), 0);

		await ctx.db.insert('signers', {
			documentId: document._id,
			email: args.email.toLowerCase().trim(),
			phone: '',
			legalName: args.name || args.email.split('@')[0],
			role: 'Signer',
			order: maxOrder + 1,
			color: randomColor,
			accessToken,
			tokenExpiresAt,
			verificationStatus: 'pending',
			status: 'pending',
			invitedAt: now
		});

		return {
			success: true,
			accessToken,
			isNewSigner: true
		} as const;
	}
});

/**
 * Enable shared signing for a document.
 */
export const enableSharedSigning = mutation({
	args: {
		documentId: v.id('documents'),
		settings: v.optional(
			v.object({
				allowSelfRegistration: v.boolean(),
				maxSigners: v.optional(v.number()),
				requireEmailMatch: v.optional(v.boolean())
			})
		)
	},
	returns: v.object({
		success: v.boolean(),
		slug: v.optional(v.string()),
		error: v.optional(v.string())
	}),
	handler: async (ctx, args) => {
		const document = await ctx.db.get(args.documentId);

		if (!document) {
			return { success: false, error: 'Document not found' };
		}

		let slug = document.sharedSigningSlug;
		if (!slug) {
			slug = nanoid(12);
			const existing = await ctx.db
				.query('documents')
				.withIndex('by_shared_slug', (q) => q.eq('sharedSigningSlug', slug))
				.first();

			if (existing) {
				slug = nanoid(16);
			}
		}

		const patch: any = {
			sharedSigningSlug: slug,
			sharedSigningEnabled: true,
			sharedSigningSettings: args.settings ?? {
				allowSelfRegistration: true,
				maxSigners: undefined,
				requireEmailMatch: false
			}
		};

		if (document.status === 'draft') {
			const now = Date.now();
			const contentHash = await hashContent(
				JSON.stringify({
					content: document.content,
					blocks: document.blocks,
					settings: document.settings,
					sealedAt: now
				})
			);

			patch.status = 'pending_signatures';
			patch.contentHash = contentHash;
			patch.sealedAt = now;
			patch.sealedVersion = document.version;
		}

		await ctx.db.patch(args.documentId, patch);

		return { success: true, slug };
	}
});

/**
 * Disable shared signing for a document
 */
export const disableSharedSigning = mutation({
	args: {
		documentId: v.id('documents')
	},
	returns: v.object({
		success: v.boolean()
	}),
	handler: async (ctx, args) => {
		const document = await ctx.db.get(args.documentId);

		if (!document) { return { success: false }; }

		await ctx.db.patch(args.documentId, {
			sharedSigningEnabled: false
		});

		return { success: true };
	}
});

/**
 * Update shared signing settings
 */
export const updateSharedSigningSettings = mutation({
	args: {
		documentId: v.id('documents'),
		settings: v.object({
			allowSelfRegistration: v.boolean(),
			maxSigners: v.optional(v.number()),
			requireEmailMatch: v.optional(v.boolean())
		})
	},
	returns: v.object({
		success: v.boolean()
	}),
	handler: async (ctx, args) => {
		const document = await ctx.db.get(args.documentId);

		if (!document) { return { success: false }; }

		await ctx.db.patch(args.documentId, {
			sharedSigningSettings: args.settings
		});

		return { success: true };
	}
});
