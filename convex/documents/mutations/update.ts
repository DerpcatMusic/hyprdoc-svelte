import { v, type Infer } from 'convex/values';
import { mutation } from '@/convex/_generated/server';
import { requireDocumentAccess } from '@/convex/lib/auth';
import { DEFAULT_DOCUMENT_SETTINGS } from '@/convex/lib/constants';
import { hashContent } from '@/convex/lib/crypto';
import { documentSealed } from '@/convex/lib/errors';
import { blocksArrayValidator, documentSettingsValidator, partialDocumentSettingsValidator } from '@/convex/lib/schemas';
import { isDocumentLocked } from '@/convex/lib/services/sealing_service';
import { requestContextValidator } from '@/convex/lib/validators';

const MAX_TITLE_LENGTH = 255;
const MAX_MARGIN = 5000;
const MAX_PAGE_DIMENSION = 10_000;

function validateSettings(settings: Infer<typeof partialDocumentSettingsValidator>) {
	if (!settings) { return; }

	// Validates margins
	const checks = [
		{ key: 'marginVertical', label: 'Vertical margin' },
		{ key: 'marginHorizontal', label: 'Horizontal margin' },
		{ key: 'marginLeft', label: 'Left margin' },
		{ key: 'marginRight', label: 'Right margin' }
	];

	for (const { key, label } of checks) {
		const val = (settings as any)[key];
		if (val !== undefined && (val < 0 || val > MAX_MARGIN)) {
				throw new Error(`${label} must be between 0 and ${MAX_MARGIN}`);
			}
	}

	// Validate Page Dimensions
	if (
		settings.pageWidth !== undefined &&
		(settings.pageWidth < 100 || settings.pageWidth > MAX_PAGE_DIMENSION)
	) {
		throw new Error(`Page width must be between 100 and ${MAX_PAGE_DIMENSION}px`);
	}
	if (
		settings.pageHeight !== undefined &&
		(settings.pageHeight < 100 || settings.pageHeight > MAX_PAGE_DIMENSION)
	) {
		throw new Error(`Page height must be between 100 and ${MAX_PAGE_DIMENSION}px`);
	}
}

/**
 * Quick update for real-time collaboration.
 */
export const quickUpdate = mutation({
	args: {
		documentId: v.id('documents'),
		guestToken: v.optional(v.string()),
		title: v.optional(v.string()),
		content: v.optional(v.string()),
		blocks: v.optional(blocksArrayValidator),
		settings: v.optional(partialDocumentSettingsValidator)
	},
	handler: async (ctx, args) => {
		const { document } = await requireDocumentAccess(
			ctx,
			args.documentId,
			'editor',
			args.guestToken
		);

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

		const newSettings = {
			...currentSettings,
			...(args.settings || {})
		};

		await ctx.db.patch(args.documentId, {
			...(args.title !== undefined && { title: args.title }),
			...(args.content !== undefined && { content: args.content }),
			...(args.blocks !== undefined && { blocks: args.blocks }),
			...(args.settings !== undefined && { settings: newSettings }),
			updatedAt: Date.now(),
			version: document.version + 1
		});
	}
});

/**
 * Update document content (creates version snapshot).
 */
export const update = mutation({
	args: {
		documentId: v.string(),
		guestToken: v.optional(v.string()),
		title: v.optional(v.string()),
		content: v.optional(v.string()),
		blocks: v.optional(blocksArrayValidator),
		settings: v.optional(partialDocumentSettingsValidator),
		isPublic: v.optional(v.boolean()),
		ctx: v.optional(requestContextValidator)
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const docId = ctx.db.normalizeId('documents', args.documentId);
		if (!docId) { throw new Error('Invalid document ID'); }

		const { workosId, memberId, document } = await requireDocumentAccess(
			ctx,
			docId,
			'editor',
			args.guestToken
		);

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

		await ctx.db.insert('documentVersions', {
			documentId: docId,
			version: document.version,
			content: document.content,
			blocks: document.blocks,
			contentHash: await hashContent(document.content),
			createdAt: now,
			createdBy: workosId,
			createdByMemberId: memberId
		});

		const newSettings: Infer<typeof documentSettingsValidator> = {
			...(document.settings || DEFAULT_DOCUMENT_SETTINGS),
			...(args.settings || {}),
			...(args.isPublic !== undefined && { isPublic: args.isPublic })
		};

		await ctx.db.patch(docId, {
			...(args.title !== undefined && { title: args.title }),
			...(args.content !== undefined && { content: args.content }),
			...(args.blocks !== undefined && { blocks: args.blocks }),
			...(args.isPublic !== undefined && { isPublic: args.isPublic }),
			settings: newSettings,
			updatedAt: now,
			version: newVersion
		});

		return null;
	}
});
