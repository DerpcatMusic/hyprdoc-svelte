/**
 * documents/mutations/update.ts - Document Update
 * ════════════════════════════════════════════════════════════════════════════
 * Document update mutations with settings validation and version snapshot.
 */
import { v } from "convex/values";
import type { Infer } from "convex/values";
import { protectedMutation } from "@/convex/lib/core";
import {
	DEFAULT_DOCUMENT_SETTINGS,
	documentSettingsValidator,
	partialDocumentSettingsValidator,
} from "@/convex/domains/settings";
import { hashContent } from "@/convex/lib/crypto";
import { documentSealed } from "@/convex/lib/errors";
import { isDocumentLocked } from "@/convex/lib/services/sealing_service";

const MAX_TITLE_LENGTH = 255;
const MAX_MARGIN = 5000;
const MAX_PAGE_DIMENSION = 10_000;

function validateSettings(
	settings: Infer<typeof partialDocumentSettingsValidator>,
): void {
	if (!settings) return;

	const checks = [
		{ key: "marginVertical", label: "Vertical margin" },
		{ key: "marginHorizontal", label: "Horizontal margin" },
		{ key: "marginLeft", label: "Left margin" },
		{ key: "marginRight", label: "Right margin" },
	];

	for (const { key, label } of checks) {
		const val = (settings as Record<string, unknown>)[key];
		if (typeof val === "number" && (val < 0 || val > MAX_MARGIN)) {
			throw new Error(`${label} must be between 0 and ${MAX_MARGIN}`);
		}
	}

	if (
		settings.pageWidth !== undefined &&
		(settings.pageWidth < 100 || settings.pageWidth > MAX_PAGE_DIMENSION)
	) {
		throw new Error(
			`Page width must be between 100 and ${MAX_PAGE_DIMENSION}px`,
		);
	}
	if (
		settings.pageHeight !== undefined &&
		(settings.pageHeight < 100 || settings.pageHeight > MAX_PAGE_DIMENSION)
	) {
		throw new Error(
			`Page height must be between 100 and ${MAX_PAGE_DIMENSION}px`,
		);
	}
}

/**
 * Quick update for real-time editing (no versioning).
 */
export const quickUpdate = protectedMutation({
	args: {
		documentId: v.id("documents"),
		title: v.optional(v.string()),
		content: v.optional(v.string()),
		blocks: v.optional(v.any()),
		settings: v.optional(partialDocumentSettingsValidator),
	},
	handler: async (ctx, args) => {
		// RLS ensures we can only update our own documents
		const document = await ctx.db.get(args.documentId);
		if (!document) throw new Error("Document not found");

		if (isDocumentLocked(document)) {
			throw documentSealed(args.documentId);
		}

		if (args.title && args.title.length > MAX_TITLE_LENGTH) {
			throw new Error(`Title cannot exceed ${MAX_TITLE_LENGTH} characters`);
		}

		if (args.settings) {
			validateSettings(args.settings);
		}

		const currentSettings = document.settings || DEFAULT_DOCUMENT_SETTINGS;
		const newSettings = { ...currentSettings, ...(args.settings || {}) };

		await ctx.db.patch(args.documentId, {
			...(args.title !== undefined && { title: args.title }),
			...(args.content !== undefined && { content: args.content }),
			...(args.blocks !== undefined && { blocks: args.blocks }),
			...(args.settings !== undefined && { settings: newSettings }),
			updatedAt: Date.now(),
			version: document.version + 1,
		});
	},
});

/**
 * Update document content (creates version snapshot).
 */
export const update = protectedMutation({
	args: {
		documentId: v.id("documents"),
		title: v.optional(v.string()),
		content: v.optional(v.string()),
		blocks: v.optional(v.any()),
		settings: v.optional(partialDocumentSettingsValidator),
		isPublic: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		// RLS ensures we can only update our own documents
		const document = await ctx.db.get(args.documentId);
		if (!document) throw new Error("Document not found");

		if (isDocumentLocked(document)) {
			throw documentSealed(args.documentId);
		}

		if (args.title && args.title.length > MAX_TITLE_LENGTH) {
			throw new Error(`Title cannot exceed ${MAX_TITLE_LENGTH} characters`);
		}

		if (args.settings) {
			validateSettings(args.settings);
		}

		const now = Date.now();
		const newVersion = document.version + 1;

		// Create version snapshot
		await ctx.db.insert("documentVersions", {
			documentId: args.documentId,
			version: document.version,
			content: document.content,
			blocks: document.blocks,
			contentHash: await hashContent(document.content),
			createdAt: now,
			createdBy: ctx.user._id,
		});

		const newSettings: Infer<typeof documentSettingsValidator> = {
			...(document.settings || DEFAULT_DOCUMENT_SETTINGS),
			...(args.settings || {}),
			...(args.isPublic !== undefined && { isPublic: args.isPublic }),
		};

		await ctx.db.patch(args.documentId, {
			...(args.title !== undefined && { title: args.title }),
			...(args.content !== undefined && { content: args.content }),
			...(args.blocks !== undefined && { blocks: args.blocks }),
			...(args.isPublic !== undefined && { isPublic: args.isPublic }),
			settings: newSettings,
			updatedAt: now,
			version: newVersion,
		});

		return null;
	},
});
