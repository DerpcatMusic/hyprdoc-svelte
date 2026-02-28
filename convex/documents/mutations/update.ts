import { zProtectedMutation, zid, z } from "../../lib/core";
import { DocumentSettingsSchema } from "../../domains/settings";
import { DocumentPartySchema } from "../../domains/parties";
import { hashContent } from "../../lib/crypto";
import { documentSealed } from "../../lib/errors";
import { isDocumentLocked } from "../../lib/services/sealing_service";
import { recordBlockLineageChanges } from "../../lib/services/block_lineage_service";

const MAX_TITLE_LENGTH = 255;

function normalizeParties(
	parties: Array<z.infer<typeof DocumentPartySchema>> | undefined,
) {
	if (!parties) return undefined;
	return parties.map((party) => ({
		...party,
		email: party.email ?? undefined,
		phone: party.phone ?? undefined,
		title: party.title ?? undefined,
		company: party.company ?? undefined,
	}));
}

/**
 * Quick update for real-time editing (no versioning).
 */
export const quickUpdate = zProtectedMutation({
	args: {
		documentId: zid("documents"),
		title: z.string().max(MAX_TITLE_LENGTH).optional(),
		content: z.string().optional(),
		blocks: z.any().optional(),
		parties: z.array(DocumentPartySchema).optional(),
		settings: DocumentSettingsSchema.partial().optional(),
		changeReason: z.string().optional(),
		changeHow: z.string().optional(),
	},
	handler: async (ctx, args) => {
		const document = await ctx.db.get(args.documentId);
		if (!document) throw new Error("Document not found");

		if (isDocumentLocked(document)) {
			throw documentSealed(args.documentId);
		}

		const newSettings = {
      ...(document.settings || {}),
      ...(args.settings || {})
    };
		const normalizedParties = normalizeParties(args.parties);
		const now = Date.now();
		const newVersion = document.version + 1;

		await ctx.db.insert("documentVersions", {
			documentId: args.documentId,
			version: document.version,
			content: document.content,
			blocks: document.blocks,
			parties: document.parties,
			contentHash: await hashContent(document.content),
			createdAt: now,
			createdBy: ctx.user._id,
		});

		await ctx.db.patch(args.documentId, {
			...(args.title !== undefined && { title: args.title }),
			...(args.content !== undefined && { content: args.content }),
			...(args.blocks !== undefined && { blocks: args.blocks }),
			...(normalizedParties !== undefined && { parties: normalizedParties }),
			...(args.settings !== undefined && { settings: newSettings }),
			updatedAt: now,
			version: newVersion,
		});

		if (args.blocks !== undefined) {
			await recordBlockLineageChanges(ctx, {
				documentId: args.documentId,
				previousBlocks: document.blocks,
				nextBlocks: args.blocks,
				changedBy: ctx.user._id,
				reason: args.changeReason ?? "editor_quick_update",
				how: args.changeHow ?? "quickUpdate",
			});
		}
	},
});

/**
 * Update document content (creates version snapshot).
 */
export const update = zProtectedMutation({
	args: {
		documentId: zid("documents"),
		title: z.string().max(MAX_TITLE_LENGTH).optional(),
		content: z.string().optional(),
		blocks: z.any().optional(),
		parties: z.array(DocumentPartySchema).optional(),
		settings: DocumentSettingsSchema.partial().optional(),
		isPublic: z.boolean().optional(),
		changeReason: z.string().optional(),
		changeHow: z.string().optional(),
	},
	handler: async (ctx, args) => {
		const document = await ctx.db.get(args.documentId);
		if (!document) throw new Error("Document not found");

		if (isDocumentLocked(document)) {
			throw documentSealed(args.documentId);
		}

		const now = Date.now();
		const newVersion = document.version + 1;

		// Create version snapshot
		await ctx.db.insert("documentVersions", {
			documentId: args.documentId,
			version: document.version,
			content: document.content,
			blocks: document.blocks,
			parties: document.parties,
			contentHash: await hashContent(document.content),
			createdAt: now,
			createdBy: ctx.user._id,
		});

		const newSettings = {
			...(document.settings || {}),
			...(args.settings || {}),
			...(args.isPublic !== undefined && { isPublic: args.isPublic }),
		};
		const normalizedParties = normalizeParties(args.parties);

		await ctx.db.patch(args.documentId, {
			...(args.title !== undefined && { title: args.title }),
			...(args.content !== undefined && { content: args.content }),
			...(args.blocks !== undefined && { blocks: args.blocks }),
			...(normalizedParties !== undefined && { parties: normalizedParties }),
			...(args.isPublic !== undefined && { isPublic: args.isPublic }),
			settings: newSettings,
			updatedAt: now,
			version: newVersion,
		});

		if (args.blocks !== undefined) {
			await recordBlockLineageChanges(ctx, {
				documentId: args.documentId,
				previousBlocks: document.blocks,
				nextBlocks: args.blocks,
				changedBy: ctx.user._id,
				reason: args.changeReason ?? "editor_update",
				how: args.changeHow ?? "update",
			});
		}

		return null;
	},
});
