// convex/glossary/mutations.ts
import { v } from 'convex/values';
import { mutation } from '@/convex/_generated/server';

// Helper mutation to batch insert
export const insertBatch = mutation({
	args: {
		terms: v.array(
			v.object({
				term: v.string(),
				termLower: v.string(),
				definition: v.string(),
				category: v.string(),
				source: v.string()
			})
		)
	},
	handler: async (ctx, args) => {
		for (const term of args.terms) {
			await ctx.db.insert('glossaryTerms', {
				...term,
				termLower: term.termLower || term.term.toLowerCase()
			});
		}
	}
});

export const addTerm = mutation({
	args: {
		term: v.string(),
		definition: v.string(),
		category: v.string()
	},
	handler: async (ctx, args) => {
		const user = await ctx.auth.getUserIdentity();
		if (!user) { throw new Error('Unauthorized'); }

		// Check for duplicate
		const existing = await ctx.db
			.query('glossaryTerms')
			.withIndex('by_term', (q) => q.eq('term', args.term))
			.first();

		if (existing) {
			throw new Error('Term already exists');
		}

		const workosId = await ctx.db
			.query('users')
			.withIndex('by_workos_id', (q) => q.eq('workosId', user.subject))
			.first();

		await ctx.db.insert('glossaryTerms', {
			term: args.term,
			termLower: args.term.toLowerCase(),
			definition: args.definition,
			category: args.category,
			source: 'User',
			workosId: workosId?._id
		});
	}
});

/**
 * Update an existing glossary term
 */
export const updateTerm = mutation({
	args: {
		id: v.id('glossaryTerms'),
		term: v.string(),
		definition: v.string()
	},
	handler: async (ctx, args) => {
		const user = await ctx.auth.getUserIdentity();
		if (!user) { throw new Error('Unauthorized'); }

		const existingTerm = await ctx.db.get(args.id);
		if (!existingTerm) { throw new Error('Term not found'); }

		// Optional: Check ownership if workosId exists on term
		// For now, any authenticated user can update

		await ctx.db.patch(args.id, {
			term: args.term,
			termLower: args.term.toLowerCase(),
			definition: args.definition
		});
	}
});

/**
 * Delete a glossary term
 */
export const deleteTerm = mutation({
	args: {
		id: v.id('glossaryTerms')
	},
	handler: async (ctx, args) => {
		const user = await ctx.auth.getUserIdentity();
		if (!user) { throw new Error('Unauthorized'); }

		const existingTerm = await ctx.db.get(args.id);
		if (!existingTerm) { throw new Error('Term not found'); }

		// Optional: Check ownership
		// const dbUser = await ctx.db.query("users").withIndex("by_workos_id", q => q.eq("workosId", user.subject)).first();
		// if (existingTerm.workosId && existingTerm.workosId !== dbUser?._id) throw new Error("Unauthorized");

		await ctx.db.delete(args.id);
	}
});
