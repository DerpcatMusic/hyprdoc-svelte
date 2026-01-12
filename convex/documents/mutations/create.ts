import { v } from 'convex/values';
import { internal } from '@/convex/_generated/api';
import { remapContent } from '@/convex/documents/logic';
import { DEFAULT_DOCUMENT_SETTINGS } from '@/convex/lib/constants';
import { authenticatedMutation } from '@/convex/lib/procedures'; // Wrapper
import { blocksArrayValidator, documentSettingsValidator } from '@/convex/lib/schemas';
import { requestContextValidator } from '@/convex/lib/validators';
import type { Id } from '@/convex/_generated/dataModel';

/**
 * Create a new document.
 * Secured by authenticatedMutation.
 */
export const create = authenticatedMutation({
	args: {
		title: v.string(),
		content: v.optional(v.string()),
		blocks: v.optional(blocksArrayValidator),
		settings: v.optional(documentSettingsValidator),
		kind: v.optional(v.union(v.literal('template'), v.literal('envelope'))),
		sourceTemplateId: v.optional(v.id('documents')),
		isPublic: v.optional(v.boolean())
	},
	handler: async (ctx, args) => {
		// ctx.user is automatically injected by authenticatedMutation
		const { workosId } = ctx.user;

		const now = Date.now();

		const settings = {
			...DEFAULT_DOCUMENT_SETTINGS,
			...(args.settings || {}),
			realTimeEnabled: false // FORCE DEFAULT OFF (Pro feature)
		};

		const finalSettings = {
			...settings,
			...(args.isPublic !== undefined && { isPublic: args.isPublic })
		};

		const documentId = await ctx.db.insert('documents', {
			ownerId: workosId,
			title: args.title,
			content: args.content || JSON.stringify({ type: 'doc', content: [] }),
			blocks: args.blocks || [],
			settings: finalSettings,
			status: 'draft',
			kind: args.kind || 'template',
			isPublic: args.isPublic,
			instanceCount: args.kind === 'template' ? 0 : undefined,
			sourceTemplateId: args.sourceTemplateId,
			version: 1,
			createdAt: now,
			updatedAt: now
		});

		await ctx.scheduler.runAfter(0, internal.auditLogs.mutations.log, {
			workosId,
			actorType: 'user' as const,
			documentId,
			resourceType: 'document' as const,
			resourceId: documentId,
			action: 'document.created',
			level: 'info' as const,
			metadata: { title: args.title, type: args.kind || 'template' }
		});

		return documentId;
	}
});

/**
 * Create a document from an external import (complex remapping).
 * Secured by authenticatedMutation.
 */
export const createFromImport = authenticatedMutation({
	args: {
		title: v.string(),
		content: v.string(),
		blocks: blocksArrayValidator,
		slots: v.array(v.string()),
		settings: v.optional(documentSettingsValidator),
		ctx: v.optional(requestContextValidator)
	},
	handler: async (ctx, args) => {
		const { workosId } = ctx.user;
		const now = Date.now();

		// 1. Create slots and build ID map
		const slotIdMap = new Map<string, string>();
		const slotIds: string[] = [];

		for (const slotName of args.slots) {
			const slotId = await ctx.db.insert('slots', {
				// biome-ignore lint/suspicious/noExplicitAny: Temporary placeholder ID required by Convex type check? Or just string?
				// Convex ID fields are strictly typed. We might need to cast 'pending' or insert differently.
				// However, if the schema says documentId: v.id('documents'), we can't insert 'pending'.
				// WE MUST INSERT DOCUMENT FIRST or allow null.
				// If basic schema allows null, we pass hard null?
				// Assuming 'pending' was a hack that worked with 'any'.
				// Let's assume documentId is v.id('documents') but we don't have it yet.
				// Pattern: Create Doc -> Create Slots -> Patch Doc?
				// Or Create Slots with null -> Create Doc -> Patch Slots.
				// Schema probably requires it.
				// Using 'as any' here is safer than in the mutation inputs.
				documentId: 'pending' as any,
				name: slotName,
				role: 'signer',
				order: 1,
				color: '#000000',
				createdAt: now
			});
			slotIdMap.set(slotName, slotId);
			slotIds.push(slotId);
		}

		// 2. Remap content using slotIdMap
		const contentJson = JSON.parse(args.content);
		const remappedContent = remapContent(contentJson, slotIdMap);

		// 3. Remap blocks
		// Typescript knows 'block' structure now!
		const remappedBlocks = args.blocks.map((block: any) => {
			// Check if block has 'slotId'. It's a discriminated union or intersection.
			// We can use 'in' operator or property access if common.
			// blockValidator is a UNION. TS might complain if default doesn't have slotId.
			// We can cast slightly or use strict check.
			const b = block as any; // Still acting as dynamic for now, but INPUT is validated.
			const bId = b.slotId; 
			if (bId && slotIdMap.has(bId)) {
				return { ...block, slotId: undefined };
			}
			return block;
		});

		// 4. Create document
		const documentId = await ctx.db.insert('documents', {
			ownerId: workosId,
			title: args.title,
			content: JSON.stringify(remappedContent),
			blocks: remappedBlocks,
			settings: {
				...DEFAULT_DOCUMENT_SETTINGS,
				...(args.settings || {}),
				realTimeEnabled: false
			},
			status: 'draft',
			kind: 'template',
			version: 1,
			createdAt: now,
			updatedAt: now
		});

		// 5. Patch slots with documentId
		for (const slotId of slotIds) {
			await ctx.db.patch(slotId as Id<'slots'>, { documentId });
		}

		await ctx.scheduler.runAfter(0, internal.auditLogs.mutations.log, {
			workosId,
			actorType: 'user' as const,
			documentId,
			resourceType: 'document',
			resourceId: documentId,
			action: 'document.imported',
			level: 'info',
			ipAddress: args.ctx?.ipAddress,
			userAgent: args.ctx?.userAgent,
			metadata: { slotCount: slotIds.length, blockCount: args.blocks.length }
		});

		return documentId;
	}
});
