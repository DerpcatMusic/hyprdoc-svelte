/**
 * documents/queries/list.ts - List Documents
 */
import { v } from "convex/values";
import { protectedQuery } from "@/convex/lib/core";

export const list = protectedQuery({
	args: {
		status: v.optional(
			v.union(
				v.literal("draft"),
				v.literal("pending_signatures"),
				v.literal("completed"),
				v.literal("expired"),
				v.literal("voided"),
			),
		),
		limit: v.optional(v.number()),
		kind: v.optional(v.union(v.literal("template"), v.literal("envelope"))),
		sourceTemplateId: v.optional(v.id("documents")),
		category: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const limit = args.limit ?? 50;

		// RLS automatically filters to only docs user can read
		let documents = await ctx.db.query("documents").order("desc").take(limit * 2);

		if (args.status)
			documents = documents.filter((d) => d.status === args.status);
		if (args.kind) documents = documents.filter((d) => d.kind === args.kind);
		if (args.sourceTemplateId)
			documents = documents.filter(
				(d) => d.sourceTemplateId === args.sourceTemplateId,
			);
		if (args.category)
			documents = documents.filter(
				(d) => d.settings?.category === args.category,
			);

		return documents.slice(0, limit).map((doc) => ({
			...doc,
			currentUserRole: doc.ownerId === ctx.user._id ? "owner" : "viewer",
			signers: [],
			slots: [],
		}));
	},
});
