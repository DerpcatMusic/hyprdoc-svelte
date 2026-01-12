// convex/documents/queries/list.ts
import { v } from 'convex/values';
import { query } from '@/convex/_generated/server';
import { requireAuth } from '@/convex/lib/auth';
import { blocksArrayValidator, documentSettingsValidator } from '@/convex/lib/schemas';
import { documentStatusValidator } from '@/convex/lib/validators';

/**
 * List user's documents with optional status filter.
 */
export const list = query({
	args: {
		status: v.optional(documentStatusValidator),
		limit: v.optional(v.number()),
		kind: v.optional(v.union(v.literal('template'), v.literal('envelope'))),
		sourceTemplateId: v.optional(v.id('documents')),
		category: v.optional(v.string())
	},
	// Note: Returns extended shape with signers/slots/stats - using object validator
	returns: v.array(
		v.object({
			_id: v.id('documents'),
			_creationTime: v.number(),
			ownerId: v.id('users'),
			title: v.string(),
			content: v.string(),
			blocks: blocksArrayValidator,
			settings: v.optional(documentSettingsValidator),
			status: documentStatusValidator,
			kind: v.optional(v.union(v.literal('template'), v.literal('envelope'))),
			version: v.number(),
			createdAt: v.number(),
			updatedAt: v.number(),
			// Extended fields
			currentUserRole: v.string(),
			owner: v.optional(
				v.object({
					name: v.string(),
					email: v.string(),
					imageUrl: v.optional(v.string())
				})
			),
			instanceStats: v.optional(
				v.object({
					completed: v.number(),
					pending: v.number(),
					draft: v.number()
				})
			),
			signers: v.array(
				v.object({
					_id: v.id('signers'),
					legalName: v.string(),
					email: v.string(),
					color: v.string(), // Always provided (fallback to #6366f1)
					status: v.string(),
					role: v.string(),
					sourceSlotId: v.optional(v.string())
				})
			),
			slots: v.array(
				v.object({
					_id: v.id('slots'),
					name: v.string(),
					color: v.string(),
					role: v.string()
				})
			),
			// Optional fields from schema
			contentHash: v.optional(v.string()),
			sealedAt: v.optional(v.number()),
			sealedVersion: v.optional(v.number()),
			completedAt: v.optional(v.number()), // Added for completed envelopes
			sourceTemplateId: v.optional(v.id('documents')),
			isPublic: v.optional(v.boolean()),
			instanceNumber: v.optional(v.number()),
			instanceCount: v.optional(v.number())
		})
	),
	handler: async (ctx, args) => {
		const { workosId } = await requireAuth(ctx);
		const limit = args.limit ?? 50;

		// 1. Fetch Owned Documents
		let ownedDocuments: any[];
		if (args.sourceTemplateId) {
			ownedDocuments = await ctx.db
				.query('documents')
				.withIndex('by_source_template', (q) => q.eq('sourceTemplateId', args.sourceTemplateId))
				.order('desc')
				.take(limit);
		} else if (args.status) {
			ownedDocuments = await ctx.db
				.query('documents')
				.withIndex('by_owner_and_status', (q) => q.eq('ownerId', workosId).eq('status', args.status!))
				.order('desc')
				.take(limit);
		} else {
			ownedDocuments = await ctx.db
				.query('documents')
				.withIndex('by_owner', (q) => q.eq('ownerId', workosId))
				.order('desc')
				.take(limit);
		}

		// 2. Fetch Shared Documents (via DocumentMembers)
		const memberships = await ctx.db
			.query('documentMembers')
			.withIndex('by_user', (q) => q.eq('workosId', workosId))
			.collect();

		const sharedDocIds = memberships.map((m) => m.documentId);

		// Fetch the actual shared documents
		const sharedDocsRaw = await Promise.all(sharedDocIds.map((id) => ctx.db.get(id)));

		// Filter and Apply args to shared docs
		let sharedDocuments = sharedDocsRaw.filter((doc) => doc !== null);

		if (args.status) {
			sharedDocuments = sharedDocuments.filter((d) => d.status === args.status);
		}
		if (args.sourceTemplateId) {
			sharedDocuments = sharedDocuments.filter((d) => d.sourceTemplateId === args.sourceTemplateId);
		}

		// 3. Combine and Deduplicate
		const allDocsMap = new Map();
		[...ownedDocuments, ...sharedDocuments].forEach((d) => {
			allDocsMap.set(d._id, d);
		});

		let combinedDocs = Array.from(allDocsMap.values());

		// 4. Global Filters (Document Type)
		if (args.kind) {
			combinedDocs = combinedDocs.filter(
				(d) => d.kind === args.kind || (args.kind === 'template' && d.kind === undefined)
			);
		}

		// 5. Category Filter
		if (args.category) {
			combinedDocs = combinedDocs.filter((d) => d.settings?.category === args.category);
		}

		// 5. Sort by Creation Time (Newest First)
		combinedDocs.sort((a, b) => b._creationTime - a._creationTime);

		// 6. Apply Limit
		const documents = combinedDocs.slice(0, limit);

		// 7. Enhance with Extras (Signers, Parties, Stats)
		const documentsWithExtras = await Promise.all(
			documents.map(async (doc) => {
				const signers = await ctx.db
					.query('signers')
					.withIndex('by_document', (q) => q.eq('documentId', doc._id))
					.collect();

				const slots = await ctx.db
					.query('slots')
					.withIndex('by_document', (q) => q.eq('documentId', doc._id))
					.collect();

				// Add 'role' to the document object if it's a shared doc
				const membership = memberships.find((m) => m.documentId === doc._id);
				const currentUserRole = doc.ownerId === workosId ? 'owner' : (membership?.role ?? 'viewer');

				// For shared docs, get owner info
				let owner: { name: string; email: string; imageUrl?: string } | undefined;
				if (doc.ownerId !== workosId) {
					const ownerUser = await ctx.db
						.query('users')
						.filter((q) => q.eq(q.field('_id'), doc.ownerId))
						.first();
					if (ownerUser) {
						owner = {
							name: ownerUser.name || 'Unknown',
							email: ownerUser.email,
							imageUrl: ownerUser.imageUrl
						};
					}
				}

				let statusCounts: { completed: number; pending: number; draft: number } | undefined;
				if (doc.kind === 'template' || !doc.kind) {
					const instances = await ctx.db
						.query('documents')
						.withIndex('by_source_template_status', (q) => q.eq('sourceTemplateId', doc._id))
						.collect();

					statusCounts = instances.reduce(
						(acc, inst) => {
							if (inst.status === 'completed') { acc.completed++; }
							else if (inst.status === 'pending_signatures') { acc.pending++; }
							else if (inst.status === 'draft') { acc.draft++; }
							return acc;
						},
						{ completed: 0, pending: 0, draft: 0 }
					);
				}

				return {
					...doc,
					currentUserRole,
					owner,
					instanceStats: statusCounts,
					signers: signers.map((s) => ({
						_id: s._id,
						legalName: s.legalName,
						email: s.email,
						color: s.color || '#6366f1', // Fallback to indigo if missing
						status: s.status,
						role: s.role,
						sourceSlotId: s.sourceSlotId
					})),
					slots: slots.map((p) => ({
						_id: p._id,
						name: p.name,
						color: p.color,
						role: p.role
					}))
				};
			})
		);

		return documentsWithExtras;
	}
});
