/**
 * globalVariables/queries.ts - Variable Queries
 * ════════════════════════════════════════════════════════════════════════════
 * Optimized queries using listForDocumentHelper for unified variable lists.
 */

import { zQuery, zProtectedQuery, z, zid } from "../lib/core";
import { listForDocumentHelper } from "./logic";

// ════════════════════════════════════════════════════════════════════════════
// LIST QUERIES
// ════════════════════════════════════════════════════════════════════════════

/**
 * List all variables available for a document.
 * Merges: system + signer-indexed + user + document scoped variables.
 */
export const listForDocument = zQuery({
	args: {
		documentId: zid("documents").optional(),
	},
	handler: async (ctx, args) => listForDocumentHelper(ctx, args),
});

/**
 * Search variables by name or display name.
 * Used by autocomplete and sidebar panel.
 */
export const search = zQuery({
	args: {
		query: z.string().optional(),
		documentId: zid("documents").optional(),
		category: z.string().optional(),
		limit: z.number().optional(),
	},
	handler: async (ctx, args) => {
		const allVars = await listForDocumentHelper(ctx, {
			documentId: args.documentId,
		});

		let filtered = allVars;

		// Filter by category if specified
		if (args.category) {
			filtered = filtered.filter((v) => v.category === args.category);
		}

		// Filter by search query
		if (args.query && args.query.trim()) {
			const q = args.query.toLowerCase();
			filtered = filtered.filter(
				(v) =>
					v.name.toLowerCase().includes(q) ||
					(v.displayName?.toLowerCase().includes(q) ?? false) ||
					(v.description?.toLowerCase().includes(q) ?? false),
			);
		}

		// Apply limit
		const limit = args.limit ?? 50;
		return filtered.slice(0, limit);
	},
});

/**
 * Get a single variable by name.
 * Used for resolving {{variable}} in documents.
 */
export const getByName = zQuery({
	args: {
		name: z.string(),
		documentId: zid("documents").optional(),
	},
	handler: async (ctx, args) => {
		const allVars = await listForDocumentHelper(ctx, {
			documentId: args.documentId,
		});
		return allVars.find((v) => v.name === args.name) ?? null;
	},
});

/**
 * Get a single variable by ID.
 */
export const get = zProtectedQuery({
	args: {
		id: zid("globalVariables"),
	},
	handler: async (ctx, args) => {
		return ctx.db.get(args.id);
	},
});

/**
 * List user-scoped variables only (for settings page).
 */
export const listUserVariables = zProtectedQuery({
	args: {},
	handler: async (ctx) => {
		return ctx.db
			.query("globalVariables")
			.withIndex("by_user", (q) => q.eq("workosId", ctx.user._id))
			.filter((q) => q.eq(q.field("scope"), "user"))
			.collect();
	},
});

/**
 * List all variable categories with counts.
 */
export const listCategories = zQuery({
	args: {
		documentId: zid("documents").optional(),
	},
	handler: async (ctx, args) => {
		const allVars = await listForDocumentHelper(ctx, {
			documentId: args.documentId,
		});

		const categoryCounts = new Map<string, number>();
		for (const v of allVars) {
			const cat = v.category ?? "Uncategorized";
			categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
		}

		return [...categoryCounts.entries()].map(([category, count]) => ({
			category,
			count,
		}));
	},
});
