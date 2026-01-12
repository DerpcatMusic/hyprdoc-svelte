// convex/signers/mutations/crud.ts
import { v } from 'convex/values';
import { internal } from '@/convex/_generated/api';
import { mutation } from '@/convex/_generated/server';
import { requireDocumentOwner } from '@/convex/lib/auth';
import { generateAccessToken } from '@/convex/lib/crypto';
import { requestContextValidator } from '@/convex/lib/validators';
import { TOKEN_EXPIRY_DAYS } from '@/convex/signers/constants';

/**
 * Add a signer to a document.
 */
export const addSigner = mutation({
	args: {
		documentId: v.id('documents'),
		email: v.string(),
		phone: v.string(),
		phoneCountryCode: v.optional(v.string()),
		legalName: v.string(),
		role: v.optional(v.string()),
		order: v.optional(v.number()),
		color: v.optional(v.string()),
		ctx: v.optional(requestContextValidator)
	},
	returns: v.id('signers'),
	handler: async (ctx, args) => {
		const { workosId, document } = await requireDocumentOwner(ctx, args.documentId);

		if (document.status !== 'draft' && document.status !== 'pending_signatures') {
			throw new Error('Cannot add signers to completed or voided documents');
		}

		const now = Date.now();
		const accessToken = generateAccessToken();

		const signerId = await ctx.db.insert('signers', {
			documentId: args.documentId,
			email: args.email.toLowerCase().trim(),
			phone: args.phone.trim(),
			phoneCountryCode: args.phoneCountryCode,
			legalName: args.legalName.trim(),
			role: args.role ?? 'signer',
			order: args.order ?? 1,
			color: args.color,
			accessToken,
			tokenExpiresAt: now + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
			verificationStatus: 'pending',
			status: 'pending',
			invitedAt: now
		});

		await ctx.scheduler.runAfter(0, internal.auditLogs.mutations.log, {
			workosId,
			actorType: 'user' as const,
			documentId: args.documentId,
			resourceType: 'document' as const,
			resourceId: args.documentId,
			action: 'signer.added',
			level: 'info' as const,
			ipAddress: args.ctx?.ipAddress,
			userAgent: args.ctx?.userAgent,
			metadata: { email: args.email, documentId: args.documentId }
		});

		return signerId;
	}
});

/**
 * Remove a signer from a document.
 */
export const removeSigner = mutation({
	args: {
		signerId: v.id('signers'),
		ctx: v.optional(requestContextValidator)
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const signer = await ctx.db.get(args.signerId);
		if (!signer) { throw new Error('Signer not found'); }

		const { workosId } = await requireDocumentOwner(ctx, signer.documentId);

		if (signer.status === 'signed') {
			throw new Error('Cannot remove a signer who has already signed');
		}

		await ctx.db.delete(args.signerId);

		await ctx.scheduler.runAfter(0, internal.auditLogs.mutations.log, {
			workosId,
			actorType: 'user' as const,
			documentId: signer.documentId,
			resourceType: 'document' as const,
			resourceId: signer.documentId,
			action: 'signer.removed',
			level: 'warn' as const,
			ipAddress: args.ctx?.ipAddress,
			userAgent: args.ctx?.userAgent,
			metadata: { email: signer.email }
		});

		return null;
	}
});

/**
 * Update a signer.
 */
export const updateSigner = mutation({
	args: {
		signerId: v.id('signers'),
		email: v.optional(v.string()),
		phone: v.optional(v.string()),
		phoneCountryCode: v.optional(v.string()),
		legalName: v.optional(v.string()),
		role: v.optional(v.string()),
		order: v.optional(v.number()),
		color: v.optional(v.string()),
		ctx: v.optional(requestContextValidator)
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const signer = await ctx.db.get(args.signerId);
		if (!signer) { throw new Error('Signer not found'); }

		const { workosId } = await requireDocumentOwner(ctx, signer.documentId);

		if (signer.status === 'signed') {
			throw new Error('Cannot update a signer who has already signed');
		}

		const updates: any = {};
		if (args.email !== undefined) { updates.email = args.email.toLowerCase().trim(); }
		if (args.phone !== undefined) { updates.phone = args.phone.trim(); }
		if (args.phoneCountryCode !== undefined) { updates.phoneCountryCode = args.phoneCountryCode; }
		if (args.legalName !== undefined) { updates.legalName = args.legalName.trim(); }
		if (args.role !== undefined) { updates.role = args.role; }
		if (args.order !== undefined) { updates.order = args.order; }
		if (args.color !== undefined) { updates.color = args.color; }

		await ctx.db.patch(args.signerId, updates);

		await ctx.scheduler.runAfter(0, internal.auditLogs.mutations.log, {
			workosId,
			actorType: 'user' as const,
			documentId: signer.documentId,
			resourceType: 'document' as const,
			resourceId: signer.documentId,
			action: 'signer.updated',
			level: 'info' as const,
			ipAddress: args.ctx?.ipAddress,
			userAgent: args.ctx?.userAgent,
			metadata: {
				updates: Object.keys(updates),
				email: signer.email
			}
		});

		return null;
	}
});
