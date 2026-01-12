// convex/globalVariables/mutations.ts
import { v } from 'convex/values';
import { mutation } from '@/convex/_generated/server';
import { requireDocumentAccess } from '@/convex/lib/auth';

/**
 * Create a new variable
 */
export const create = mutation({
	args: {
		name: v.string(),
		displayName: v.optional(v.string()),
		value: v.union(v.string(), v.number(), v.boolean(), v.null()),
		type: v.union(
			v.literal('text'),
			v.literal('number'),
			v.literal('date'),
			v.literal('currency'),
			v.literal('boolean')
		),
		fallback: v.optional(v.string()),
		scope: v.union(v.literal('document'), v.literal('user')),
		category: v.optional(v.string()),
		documentId: v.optional(v.id('documents'))
	},
	handler: async (ctx, args) => {
		const user = await ctx.auth.getUserIdentity();
		if (!user) { throw new Error('Unauthorized'); }

		const dbUser = await ctx.db
			.query('users')
			.withIndex('by_workos_id', (q) => q.eq('workosId', user.subject))
			.first();

		if (!dbUser) { throw new Error('User not found'); }

		// Validate name format
		if (!/^[A-Za-z]\w*$/.test(args.name)) {
			throw new Error(
				'Variable name must start with a letter and contain only letters, numbers, and underscores'
			);
		}

		// Check for duplicates within scope
		if (args.scope === 'document' && args.documentId) {
			const existing = await ctx.db
				.query('globalVariables')
				.withIndex('by_name_and_document', (q) =>
					q.eq('name', args.name).eq('documentId', args.documentId)
				)
				.first();

			if (existing) { throw new Error('Variable with this name already exists in this document'); }
		} else if (args.scope === 'user') {
			const existing = await ctx.db
				.query('globalVariables')
				.withIndex('by_name_and_user', (q) => q.eq('name', args.name).eq('workosId', dbUser._id))
				.first();

			if (existing) { throw new Error('Variable with this name already exists'); }
		}

		const now = Date.now();
		const id = await ctx.db.insert('globalVariables', {
			name: args.name,
			displayName:
				args.displayName ??
				args.name.replaceAll('_', ' ').replaceAll(/\b\w/g, (c) => c.toUpperCase()),
			value: args.value,
			type: args.type,
			fallback: args.fallback,
			scope: args.scope,
			category: args.category,
			documentId: args.scope === 'document' ? args.documentId : undefined,
			workosId: dbUser._id,
			createdAt: now,
			updatedAt: now
		});

		return id;
	}
});

/**
 * Update an existing variable
 */
export const update = mutation({
	args: {
		id: v.id('globalVariables'),
		value: v.optional(v.union(v.string(), v.number(), v.boolean(), v.null())),
		displayName: v.optional(v.string()),
		fallback: v.optional(v.string()),
		category: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const user = await ctx.auth.getUserIdentity();
		if (!user) { throw new Error('Unauthorized'); }

		const variable = await ctx.db.get(args.id);
		if (!variable) { throw new Error('Variable not found'); }

		if (variable.scope === 'system') {
			throw new Error('Cannot modify system variables');
		}

		if (variable.scope === 'document') {
			if (!variable.documentId) { throw new Error('Invalid document variable state'); }
			// Check document access (allows owners and editors)
			await requireDocumentAccess(ctx, variable.documentId, 'editor');
		} else {
			// User scope check
			const dbUser = await ctx.db
				.query('users')
				.withIndex('by_workos_id', (q) => q.eq('workosId', user.subject))
				.first();

			if (!dbUser) { throw new Error('User not found'); }
			if (variable.workosId !== dbUser._id) { throw new Error('Unauthorized'); }
		}

		const { id, ...updates } = args;
		await ctx.db.patch(id, {
			...updates,
			updatedAt: Date.now()
		});
	}
});

/**
 * Delete a variable
 */
export const remove = mutation({
	args: {
		id: v.id('globalVariables')
	},
	handler: async (ctx, args) => {
		const user = await ctx.auth.getUserIdentity();
		if (!user) { throw new Error('Unauthorized'); }

		const variable = await ctx.db.get(args.id);
		if (!variable) { throw new Error('Variable not found'); }

		if (variable.scope === 'system') {
			throw new Error('Cannot delete system variables');
		}

		if (variable.scope === 'document') {
			if (!variable.documentId) { throw new Error('Invalid document variable state'); }
			// Check document access (allows owners and editors)
			await requireDocumentAccess(ctx, variable.documentId, 'editor');
		} else {
			// User scope check
			const dbUser = await ctx.db
				.query('users')
				.withIndex('by_workos_id', (q) => q.eq('workosId', user.subject))
				.first();

			if (!dbUser) { throw new Error('User not found'); }
			if (variable.workosId !== dbUser._id) { throw new Error('Unauthorized'); }
		}

		await ctx.db.delete(args.id);
	}
});
