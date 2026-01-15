import { mutation } from '../_generated/server';
import { v } from 'convex/values';

/**
 * Create a new roadmap item
 */
export const create = mutation({
	args: {
		title: v.string(),
		description: v.string(),
		status: v.union(v.literal('planned'), v.literal('in_progress'), v.literal('completed')),
		quarter: v.string(),
		priority: v.union(v.literal('p0_critical'), v.literal('p1_high'), v.literal('p2_medium')),
		category: v.union(
			v.literal('core_engine'),
			v.literal('integration'),
			v.literal('business_model'),
			v.literal('sdk')
		),
		competitorKill: v.optional(v.string()),
		techStack: v.optional(v.string()),
		valueProposition: v.optional(v.string()),
		order: v.number(),
		isPublic: v.boolean()
	},
	handler: async (ctx, args) => {
		const now = Date.now();
		return await ctx.db.insert('roadmapItems', {
			...args,
			createdAt: now,
			updatedAt: now
		});
	}
});

/**
 * Update a roadmap item
 */
export const update = mutation({
	args: {
		id: v.id('roadmapItems'),
		title: v.optional(v.string()),
		description: v.optional(v.string()),
		status: v.optional(
			v.union(v.literal('planned'), v.literal('in_progress'), v.literal('completed'))
		),
		quarter: v.optional(v.string()),
		priority: v.optional(
			v.union(v.literal('p0_critical'), v.literal('p1_high'), v.literal('p2_medium'))
		),
		category: v.optional(
			v.union(
				v.literal('core_engine'),
				v.literal('integration'),
				v.literal('business_model'),
				v.literal('sdk')
			)
		),
		competitorKill: v.optional(v.string()),
		techStack: v.optional(v.string()),
		valueProposition: v.optional(v.string()),
		order: v.optional(v.number()),
		isPublic: v.optional(v.boolean())
	},
	handler: async (ctx, args) => {
		const { id, ...updates } = args;
		const existing = await ctx.db.get(id);
		if (!existing) {
			throw new Error('Roadmap item not found');
		}

		// Filter out undefined values
		const cleanUpdates = Object.fromEntries(
			Object.entries(updates).filter(([_, v]) => v !== undefined)
		);

		await ctx.db.patch(id, {
			...cleanUpdates,
			updatedAt: Date.now()
		});
	}
});

/**
 * Delete a roadmap item
 */
export const remove = mutation({
	args: { id: v.id('roadmapItems') },
	handler: async (ctx, args) => {
		await ctx.db.delete(args.id);
	}
});

/**
 * Seed the roadmap with the 10 kill-features
 * Run this once to populate initial data
 */
export const seedRoadmap = mutation({
	args: {},
	handler: async (ctx) => {
		const now = Date.now();

		// Check if already seeded
		const existing = await ctx.db.query('roadmapItems').first();
		if (existing) {
			return { status: 'already_seeded', count: 0 };
		}

		const killFeatures = [
			{
				title: 'The LiveStore Proxy',
				description:
					'Sub-100ms latency for bi-directional data sync between contract state and external apps.',
				status: 'planned' as const,
				quarter: 'Q1 2026',
				priority: 'p0_critical' as const,
				category: 'core_engine' as const,
				competitorKill: 'DocuSign/Adobe (Latency > 2000ms)',
				techStack: 'Svelte 5 Runes + Convex Subscriptions',
				valueProposition: 'Sub-100ms latency for bi-directional data sync',
				order: 1,
				isPublic: true
			},
			{
				title: 'No-Code Logic Components',
				description:
					'Visual block builder that compiles to TypeScript. Let non-technical users build complex math/formulas without code.',
				status: 'planned' as const,
				quarter: 'Q1 2026',
				priority: 'p0_critical' as const,
				category: 'core_engine' as const,
				competitorKill: 'Accord Project (High friction), Ironclad (Static logic)',
				techStack: 'Visual block builder → TypeScript compiler',
				valueProposition: 'Non-technical users can build complex contract logic',
				order: 2,
				isPublic: true
			},
			{
				title: 'The Ghost Dashboard',
				description:
					'Show the post-signature "Live State" UI while drafting. Preview your contract as a living app.',
				status: 'planned' as const,
				quarter: 'Q2 2026',
				priority: 'p1_high' as const,
				category: 'core_engine' as const,
				competitorKill: 'PandaDoc (Document-only view)',
				techStack: 'Svelte 5 Shared Components',
				valueProposition: 'See your contract as a live dashboard while drafting',
				order: 1,
				isPublic: true
			},
			{
				title: 'State-Triggered Payments',
				description:
					'In-Doc checkout that triggers based on contract state. Automatic late fees, milestone payments, and escrow releases.',
				status: 'planned' as const,
				quarter: 'Q2 2026',
				priority: 'p1_high' as const,
				category: 'integration' as const,
				competitorKill: 'Agree.com (Limited logic triggers)',
				techStack: 'Stripe Elements + Convex Action Triggers',
				valueProposition: 'Payments that respond to contract logic in real-time',
				order: 2,
				isPublic: true
			},
			{
				title: 'Optimistic Signing Engine',
				description:
					'Instant UI feedback on signature with background sync. No more "wait for reload" friction.',
				status: 'planned' as const,
				quarter: 'Q2 2026',
				priority: 'p0_critical' as const,
				category: 'core_engine' as const,
				competitorKill: 'Every iFrame-based competitor',
				techStack: 'Local-first state management',
				valueProposition: 'Instant signature feedback, zero perceived latency',
				order: 3,
				isPublic: true
			},
			{
				title: 'Generic App-Sync Bridge',
				description:
					'Sync any external JSON state to any document block. OpenAPI / JSON Schema ingestion.',
				status: 'planned' as const,
				quarter: 'Q3 2026',
				priority: 'p1_high' as const,
				category: 'integration' as const,
				competitorKill: 'Oneflow (Limited to specific CRM objects)',
				techStack: 'OpenAPI / JSON Schema ingestion',
				valueProposition: 'Connect any API to any contract field',
				order: 1,
				isPublic: true
			},
			{
				title: 'Versioned State Diffing',
				description:
					'Compare "Contract Value" or "Penalty Risk" across versions. Not just text diffs—semantic diffs.',
				status: 'planned' as const,
				quarter: 'Q3 2026',
				priority: 'p2_medium' as const,
				category: 'core_engine' as const,
				competitorKill: 'Concord (Text-only diffs)',
				techStack: 'Convex Mutation History + State Snapshotting',
				valueProposition: 'Understand business impact of contract changes',
				order: 2,
				isPublic: true
			},
			{
				title: 'Headless Component SDK',
				description:
					'Drop a HyprDoc block into any web app as a native component. No iFrames, full control.',
				status: 'planned' as const,
				quarter: 'Q4 2026',
				priority: 'p1_high' as const,
				category: 'sdk' as const,
				competitorKill: 'Dropbox Sign (iFrame legacy)',
				techStack: 'Web Components / Svelte Custom Elements',
				valueProposition: 'Embed contract logic anywhere with zero friction',
				order: 1,
				isPublic: true
			},
			{
				title: 'The Logic-to-Ledger Bridge',
				description:
					'Contract logic automatically creates recurring invoices. Direct integration with Xero/QuickBooks.',
				status: 'planned' as const,
				quarter: 'Q4 2026',
				priority: 'p2_medium' as const,
				category: 'integration' as const,
				competitorKill: 'Manual legal ops workflows',
				techStack: 'Accounting API Connectors (Xero/QuickBooks)',
				valueProposition: 'Contract → Invoice → Payment, automated',
				order: 2,
				isPublic: true
			},
			{
				title: 'The $0 Signature Hook',
				description:
					'Free signatures for individuals. Monetize on Logic Blocks and API Volume instead of per-envelope fees.',
				status: 'in_progress' as const,
				quarter: 'Q1 2026',
				priority: 'p0_critical' as const,
				category: 'business_model' as const,
				competitorKill: 'DocuSign (Envelope-based predatory pricing)',
				techStack: 'Usage-based billing on Polar.sh',
				valueProposition: 'Never pay per signature again',
				order: 3,
				isPublic: true
			}
		];

		for (const feature of killFeatures) {
			await ctx.db.insert('roadmapItems', {
				...feature,
				createdAt: now,
				updatedAt: now
			});
		}

		return { status: 'seeded', count: killFeatures.length };
	}
});
