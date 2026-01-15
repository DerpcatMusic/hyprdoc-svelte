/**
 * documents/queries/internal.ts - Internal Queries
 */
import { v } from "convex/values";
import { internalQuery } from "../../lib/core";

/**
 * List templates for RAG search.
 */
export const listTemplates = internalQuery({
	args: {
		genre: v.optional(v.string()),
		category: v.optional(v.string()),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		let query = ctx.db
			.query("documents")
			.withIndex("by_public_template", (q) => q.eq("isPublic", true).eq("kind", "template"));

		let templates = await query.collect();

		if (args.genre) {
			templates = templates.filter(t => (t.settings as any)?.genre === args.genre);
		}
		if (args.category) {
			templates = templates.filter(t => (t.settings as any)?.category === args.category);
		}

		return templates.slice(0, args.limit || 5);
	},
});
