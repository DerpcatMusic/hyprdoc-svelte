// convex/globalVariables/queries.ts
import { v } from 'convex/values';
import { query } from '@/convex/_generated/server';
import { listForDocumentHelper } from './logic';

/**
 * List all variables available for a document.
 * Merges: system variables + user variables + document variables
 * Document variables override user variables with same name.
 */
export const listForDocument = query({
	args: {
		documentId: v.optional(v.id('documents'))
	},
	handler: async (ctx, args) => listForDocumentHelper(ctx, args)
});

/**
 * Search variables by name (for suggestion popup)
 */
export const search = query({
	args: {
		query: v.string(),
		documentId: v.optional(v.id('documents'))
	},
	handler: async (ctx, args) => {
		const allVars = await listForDocumentHelper(ctx, {
			documentId: args.documentId
		});

		if (!args.query) {
			return allVars.slice(0, 20);
		}

		const q = args.query.toLowerCase();
		return allVars
			.filter(
				(v) =>
					v.name.toLowerCase().includes(q) || (v.displayName?.toLowerCase().includes(q) ?? false)
			)
			.slice(0, 20);
	}
});

/**
 * Get a single variable by name (for resolution)
 */
export const getByName = query({
	args: {
		name: v.string(),
		documentId: v.optional(v.id('documents'))
	},
	handler: async (ctx, args) => {
		const allVars = await listForDocumentHelper(ctx, {
			documentId: args.documentId
		});
		return allVars.find((variable) => variable.name === args.name) ?? null;
	}
});
