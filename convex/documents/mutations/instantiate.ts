import { v } from 'convex/values';
import { internal } from '@/convex/_generated/api';
import type { Id, Doc } from '@/convex/_generated/dataModel';
import { requireDocumentAccess } from '@/convex/lib/auth';
import { DEFAULT_DOCUMENT_SETTINGS } from '@/convex/lib/constants';
import { resolveDocumentVariables } from '@/convex/lib/content_transform';
import { generateAccessToken, hashContent } from '@/convex/lib/crypto';
import { authenticatedMutation } from '@/convex/lib/procedures';
import { partialDocumentSettingsValidator } from '@/convex/lib/schemas';
import { INPUT_BLOCK_TYPE_SET } from '@/convex/lib/definitions'; // SHARED DEFINITION

/**
 * Instantiate a new envelope from a template.
 */
export const instantiateEnvelope = authenticatedMutation({
	args: {
		templateId: v.id('documents'),
		title: v.optional(v.string()),
		settings: v.optional(partialDocumentSettingsValidator),
		signerData: v.optional(
			v.array(
				v.object({
					slotId: v.string(),
					legalName: v.string(),
					email: v.string(),
					phone: v.optional(v.string()),
					phoneCountryCode: v.optional(v.string())
				})
			)
		)
	},
	handler: async (ctx, args) => {
		const { workosId } = ctx.user;
		await requireDocumentAccess(ctx, args.templateId, 'viewer');

		const template = (await ctx.db.get(args.templateId)) as Doc<'documents'> | null;
		if (!template) { throw new Error('Template not found'); }

		// Use shared logic for validation
		const templateBlocks = template.blocks || [];
		
		const unassignedInputBlocks = templateBlocks.filter((block: any) => {
			const blockType = block.type;
			// Use shared Set
			if (!(blockType && INPUT_BLOCK_TYPE_SET.has(blockType))) { return false; }
			return !block.slotId || block.slotId === '';
		});

		if (unassignedInputBlocks.length > 0) {
			const blockLabels = unassignedInputBlocks
				.slice(0, 3)
				.map((b: any) => b.label || b.variableName || 'Unknown')
				.join(', ');
			const suffix =
				unassignedInputBlocks.length > 3 ? ` and ${unassignedInputBlocks.length - 3} more` : '';
			throw new Error(
				`Cannot create envelope: ${unassignedInputBlocks.length} block(s) are not assigned to any signer (${blockLabels}${suffix}). Please assign all fields to signers before sending.`
			);
		}

		const now = Date.now();
		const newInstanceNumber = (template.instanceCount || 0) + 1;

		await ctx.db.patch(args.templateId, {
			instanceCount: newInstanceNumber,
			kind: 'template'
		});

		const templateSlots = await ctx.db
			.query('slots')
			.withIndex('by_document', (q) => q.eq('documentId', args.templateId))
			.collect();

		const slotToSignerMap = new Map<string, string>();
		const newSignerIds: string[] = [];

		for (const slot of templateSlots) {
			const signerInput = args.signerData?.find((s: any) => String(s.slotId) === String(slot._id));
			const newSignerId = await ctx.db.insert('signers', {
				documentId: args.templateId,
				legalName: signerInput?.legalName?.trim() || slot.name || `Slot ${slot.order}`,
				email: signerInput?.email?.trim() || '',
				phone: signerInput?.phone?.trim() || '',
				phoneCountryCode: signerInput?.phoneCountryCode || '+1',
				role: slot.name || slot.role || 'Signer',
				color: slot.color,
				order: slot.order || 1,
				sourceSlotId: String(slot._id),
				accessToken: generateAccessToken(),
				tokenExpiresAt: now + 7 * 24 * 60 * 60 * 1000,
				verificationStatus: 'pending',
				status: 'pending',
				invitedAt: now
			});

			slotToSignerMap.set(String(slot._id), newSignerId);
			newSignerIds.push(newSignerId);
		}

		const newContentString = template.content;
		const newBlocksArray = template.blocks;

		const docTitle = args.title || `${template.title} #${newInstanceNumber}`;
		const mergedSettings = {
			...DEFAULT_DOCUMENT_SETTINGS,
			...template.settings,
			...(args.settings || {})
		};

		const resolvedContent = resolveDocumentVariables(newContentString, {
			blocks: newBlocksArray || [],
			slots: (args.signerData || []).map((s: any) => ({
				name: s.legalName,
				legalName: s.legalName,
				email: s.email,
				role: ''
			})),
			documentSettings: {
				title: docTitle,
				...mergedSettings
			}
		} as any);

		const contentHash = await hashContent(
			JSON.stringify({
				content: resolvedContent,
				blocks: newBlocksArray,
				settings: mergedSettings,
				createdAt: now
			})
		);

		const documentId = await ctx.db.insert('documents', {
			ownerId: workosId,
			title: docTitle,
			content: resolvedContent,
			blocks: newBlocksArray as any,
			settings: mergedSettings,
			status: 'pending_signatures',
			kind: 'envelope',
			sourceTemplateId: args.templateId,
			instanceNumber: newInstanceNumber,
			contentHash,
			sealedVersion: 1,
			createdAt: now,
			updatedAt: now,
			version: 1
		});

		for (const id of newSignerIds) {
			await ctx.db.patch(id as Id<'signers'>, { documentId });
		}

		await ctx.scheduler.runAfter(0, internal.auditLogs.mutations.log, {
			workosId,
			actorType: 'user' as const,
			documentId,
			resourceType: 'document' as const,
			resourceId: documentId,
			action: 'envelope.created',
			level: 'info' as const,
			metadata: {
				templateId: String(args.templateId),
				signerCount: newSignerIds.length,
				signerIds: newSignerIds,
				title: docTitle,
				instanceNumber: newInstanceNumber
			}
		});

		return { envelopeId: documentId, signerIds: newSignerIds as Id<'signers'>[] };
	}
});
