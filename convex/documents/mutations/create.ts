/**
 * documents/mutations/create.ts - Create Document
 * ════════════════════════════════════════════════════════════════════════════
 * Creates a new document with default settings.
 */
import { v } from "convex/values";
import { protectedMutation } from "@/convex/lib/core";
import { DEFAULT_DOCUMENT_SETTINGS } from "@/convex/domains/settings";

export const create = protectedMutation({
	args: {
		title: v.string(),
		content: v.optional(v.string()),
		isPublic: v.optional(v.boolean()),
		kind: v.optional(v.union(v.literal("template"), v.literal("envelope"))),
	},
	handler: async (ctx, args) => {
		const now = Date.now();
		const kind = args.kind ?? "template";

		const settings = {
			...DEFAULT_DOCUMENT_SETTINGS,
			realTimeEnabled: false,
			...(args.isPublic !== undefined && { isPublic: args.isPublic }),
		};

		return ctx.db.insert("documents", {
			ownerId: ctx.user._id,
			title: args.title,
			content: args.content || JSON.stringify({ type: "doc", content: [] }),
			blocks: [],
			settings,
			status: "draft",
			kind,
			isPublic: args.isPublic || false,
			version: 1,
			createdAt: now,
			updatedAt: now,
		});
	},
});

export const createFromImport = protectedMutation({
	args: {
		title: v.string(),
		content: v.string(),
		blocks: v.optional(v.any()),
		slots: v.optional(v.array(v.any())),
	},
	handler: async (ctx, args) => {
		const now = Date.now();
		
		const documentId = await ctx.db.insert("documents", {
			ownerId: ctx.user._id,
			title: args.title,
			content: args.content,
			blocks: args.blocks ?? [],
			settings: DEFAULT_DOCUMENT_SETTINGS,
			status: "draft",
			kind: "template",
			version: 1,
			createdAt: now,
			updatedAt: now,
		});

		// Initialize slots if provided
		if (args.slots && Array.isArray(args.slots)) {
			for (let i = 0; i < args.slots.length; i++) {
				const s = args.slots[i];
				await ctx.db.insert("slots", {
					documentId,
					name: s.name || `Slot ${i + 1}`,
					role: s.role || "signer",
					color: s.color || "#3b82f6",
					order: i,
					createdAt: now,
				});
			}
		}

		return documentId;
	},
});
