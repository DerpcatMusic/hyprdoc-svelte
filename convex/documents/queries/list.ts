/**
 * documents/queries/list.ts - List Documents
 */
import { zProtectedQuery, z, zid } from "@/convex/lib/core";

export const list = zProtectedQuery({
	args: {
		status: z.enum([
			"draft",
			"pending_signatures",
			"completed",
			"expired",
			"voided",
		]).optional(),
		limit: z.number().optional(),
		kind: z.enum(["template", "envelope"]).optional(),
		sourceTemplateId: zid("documents").optional(),
		category: z.string().optional(),
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
