/**
 * ai/templates.ts - AI Template Search (RAG)
 * ════════════════════════════════════════════════════════════════════════════
 * Action for performing vector searches on templates.
 */
import { v } from "convex/values";
import { action } from "../lib/core";
import { internal } from "../_generated/api";

/**
 * Perform a RAG search for templates based on user prompt.
 */
export const searchTemplates = action({
  args: {
    query: v.string(),
    genre: v.optional(v.string()),
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
	handler: async (ctx, args): Promise<Array<{ title: string; content: string }>> => {
		// Placeholder: In a real system, you'd generate an embedding here
		// for the query and call vectorSearch.
		// For now, we'll return a simple list or search by text if available.
		
		// Fallback: Just return some relevant templates for testing
		const templates: any[] = await ctx.runQuery(internal.documents.queries.internal.listTemplates, {
			genre: args.genre,
			category: args.category,
			limit: args.limit || 2,
		});

		return templates.map((t: any) => ({
			title: t.title,
			content: t.content,
		}));
	},
});
