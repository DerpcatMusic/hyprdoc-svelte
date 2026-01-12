// convex/slots/mutations.ts
import { v } from 'convex/values';
import { mutation } from '@/convex/_generated/server';
import { requireAuth } from '@/convex/lib/auth';
import { PARTY_COLORS } from '@/convex/lib/constants';

/**
 * Add a new slot to a template
 */
export const addSlot = mutation({
	args: {
		documentId: v.id('documents'),
		name: v.string(),
		role: v.optional(v.string()),
		color: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const { userId } = await requireAuth(ctx);

		const document = await ctx.db.get(args.documentId);
		if (!document || document.ownerId !== userId) {
			throw new Error('Document not found or access denied');
		}

		if (document.kind === 'envelope') {
			throw new Error('Cannot add slots to envelopes. Add signers instead.');
		}

		const existingSlots = await ctx.db
			.query('slots')
			.withIndex('by_document', (q) => q.eq('documentId', args.documentId))
			.collect();

		const nextOrder = existingSlots.length + 1;
		const autoColor = PARTY_COLORS[(nextOrder - 1) % PARTY_COLORS.length];

		const slotId = await ctx.db.insert('slots', {
			documentId: args.documentId,
			name: args.name.trim(),
			role: args.role?.trim() || args.name.trim(),
			color: args.color || autoColor,
			order: nextOrder,
			createdAt: Date.now()
		});

		return slotId;
	}
});

/**
 * Update an existing slot
 */
export const updateSlot = mutation({
	args: {
		slotId: v.id('slots'),
		name: v.optional(v.string()),
		role: v.optional(v.string()),
		color: v.optional(v.string()),
		order: v.optional(v.number()),
		defaultFields: v.optional(
			v.array(
				v.object({
					type: v.string(),
					label: v.string(),
					required: v.boolean()
				})
			)
		)
	},
	handler: async (ctx, args) => {
		const { userId } = await requireAuth(ctx);

		const slot = await ctx.db.get(args.slotId);
		if (!slot) { throw new Error('Slot not found'); }

		const document = await ctx.db.get(slot.documentId);
		if (!document || document.ownerId !== userId) {
			throw new Error('Access denied');
		}

		const updates: any = {};
		if (args.name !== undefined) { updates.name = args.name.trim(); }
		if (args.role !== undefined) { updates.role = args.role.trim(); }
		if (args.color !== undefined) { updates.color = args.color; }
		if (args.order !== undefined) { updates.order = args.order; }
		if (args.defaultFields !== undefined) { updates.defaultFields = args.defaultFields; }

		await ctx.db.patch(args.slotId, updates);
		return null;
	}
});

/**
 * Remove a slot from a template
 */
export const removeSlot = mutation({
	args: { slotId: v.id('slots') },
	handler: async (ctx, args) => {
		const { userId } = await requireAuth(ctx);

		const slot = await ctx.db.get(args.slotId);
		if (!slot) { throw new Error('Slot not found'); }

		const document = await ctx.db.get(slot.documentId);
		if (!document || document.ownerId !== userId) {
			throw new Error('Access denied');
		}

		if (document.sealedAt) {
			throw new Error('Cannot modify slots on sealed documents');
		}

		await ctx.db.delete(args.slotId);

		const remainingSlots = await ctx.db
			.query('slots')
			.withIndex('by_document', (q) => q.eq('documentId', slot.documentId))
			.collect();

		const sortedSlots = remainingSlots.sort((a, b) => a.order - b.order);
		for (let i = 0; i < sortedSlots.length; i++) {
			if (sortedSlots[i].order !== i + 1) {
				await ctx.db.patch(sortedSlots[i]._id, { order: i + 1 });
			}
		}

		return null;
	}
});

/**
 * Reorder slots (drag and drop)
 */
export const reorderSlots = mutation({
	args: {
		documentId: v.id('documents'),
		slotIds: v.array(v.id('slots'))
	},
	handler: async (ctx, args) => {
		const { userId } = await requireAuth(ctx);

		const document = await ctx.db.get(args.documentId);
		if (!document || document.ownerId !== userId) {
			throw new Error('Access denied');
		}

		for (let i = 0; i < args.slotIds.length; i++) {
			await ctx.db.patch(args.slotIds[i], { order: i + 1 });
		}

		return null;
	}
});
