import { internal } from '@/convex/_generated/api';
import { zProtectedMutation, zProtectedQuery, z, zid } from '@/convex/lib/core';
import { hashContent } from '@/convex/lib/crypto';
import { isDocumentSealed } from '@/convex/lib/services/sealing_service';
import { stableStringify } from '@/convex/lib/stable_json';

const signalValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const sourceSchema = z.enum(['system', 'owner', 'signer', 'integration']);
const actionTypeSchema = z.enum(['notify', 'set_variable', 'append_note']);
const requirementOperatorSchema = z.enum(['eq', 'gte', 'lte', 'present']);

const requirementSchema = z.object({
	id: z.string(),
	key: z.string(),
	operator: requirementOperatorSchema,
	target: signalValueSchema.optional(),
	met: z.boolean().default(false),
	metAt: z.number().optional(),
	onMet: z
		.array(
			z.object({
				type: actionTypeSchema,
				payload: z.any().optional(),
			}),
		)
		.default([]),
});

const queuedActionSchema = z.object({
	id: z.string(),
	requirementId: z.string(),
	type: actionTypeSchema,
	payload: z.any().optional(),
	status: z.enum(['pending', 'done', 'failed']),
	createdAt: z.number(),
	executedAt: z.number().optional(),
	error: z.string().optional(),
});

type Requirement = z.infer<typeof requirementSchema>;
type QueuedAction = z.infer<typeof queuedActionSchema>;

function evaluateRequirement(
	requirement: Requirement,
	variables: Record<string, string | number | boolean | null>,
): boolean {
	const value = variables[requirement.key];
	switch (requirement.operator) {
		case 'present':
			return value !== undefined && value !== null;
		case 'eq':
			return value === requirement.target;
		case 'gte':
			return typeof value === 'number' && typeof requirement.target === 'number'
				? value >= requirement.target
				: false;
		case 'lte':
			return typeof value === 'number' && typeof requirement.target === 'number'
				? value <= requirement.target
				: false;
		default:
			return false;
	}
}

async function computeStateHash(input: {
	baseSealHash: string;
	variables: Record<string, string | number | boolean | null>;
	requirements: Requirement[];
	pendingActions: QueuedAction[];
	status: 'active' | 'paused' | 'completed';
}): Promise<string> {
	return hashContent(stableStringify(input));
}

async function computeEventHash(input: {
	documentId: string;
	eventType: 'signal' | 'requirement_met' | 'action_enqueued' | 'action_executed';
	source: 'system' | 'owner' | 'signer' | 'integration';
	payload: unknown;
	createdAt: number;
	previousHash?: string;
}): Promise<string> {
	return hashContent(
		stableStringify({
			documentId: input.documentId,
			eventType: input.eventType,
			source: input.source,
			payload: input.payload,
			createdAt: input.createdAt,
			previousHash: input.previousHash ?? 'GENESIS',
		}),
	);
}

async function getOwnedEnvelopeOrThrow(
	ctx: any,
	documentId: any,
	userId: any,
) {
	const document = await ctx.db.get(documentId);
	if (!document) throw new Error('Document not found');
	if (document.ownerId !== userId) throw new Error('Not authorized');
	if (document.kind !== 'envelope') throw new Error('Live contracts are envelope-only');
	if (!isDocumentSealed(document))
		throw new Error('Envelope must be sealed before live state can start');
	if (!document.contentHash) throw new Error('Missing envelope seal hash');
	return document;
}

export const initializeLiveContract = zProtectedMutation({
	args: {
		documentId: zid('documents'),
		initialVariables: z.record(z.string(), signalValueSchema).optional(),
		requirements: z.array(requirementSchema).optional(),
	},
	handler: async (ctx, args) => {
		const document = await getOwnedEnvelopeOrThrow(ctx, args.documentId, ctx.user._id);

		const existing = await ctx.db
			.query('liveContractStates')
			.withIndex('by_document', (q) => q.eq('documentId', document._id))
			.first();
		if (existing) {
			return { stateId: existing._id, alreadyExists: true };
		}

		const now = Date.now();
		const variables = args.initialVariables ?? {};
		const requirements = (args.requirements ?? []).map((r) => ({
			...r,
			met: false,
			metAt: undefined,
		}));
		const pendingActions: QueuedAction[] = [];

		const stateHash = await computeStateHash({
			baseSealHash: document.contentHash,
			variables,
			requirements,
			pendingActions,
			status: 'active',
		});

		const stateId = await ctx.db.insert('liveContractStates', {
			documentId: document._id,
			baseSealHash: document.contentHash,
			schemaVersion: 1,
			variables,
			requirements,
			pendingActions,
			stateHash,
			status: 'active',
			createdAt: now,
			updatedAt: now,
			createdBy: ctx.user._id,
		});

		await ctx.scheduler.runAfter(0, internal.auditLogs.mutations.log, {
			workosId: ctx.user._id,
			actorType: 'user',
			documentId: document._id,
			resourceType: 'document',
			resourceId: String(document._id),
			action: 'live_contract.initialized',
			level: 'security',
			metadata: {
				stateId: String(stateId),
				baseSealHash: document.contentHash,
				requirementCount: requirements.length,
			},
		});

		return { stateId, alreadyExists: false };
	},
});

export const ingestSignal = zProtectedMutation({
	args: {
		documentId: zid('documents'),
		key: z.string(),
		value: signalValueSchema,
		source: sourceSchema.default('owner'),
		metadata: z.any().optional(),
	},
	handler: async (ctx, args) => {
		const document = await getOwnedEnvelopeOrThrow(ctx, args.documentId, ctx.user._id);
		const state = await ctx.db
			.query('liveContractStates')
			.withIndex('by_document', (q) => q.eq('documentId', document._id))
			.first();
		if (!state) throw new Error('Live contract state not initialized');
		if (state.status !== 'active') throw new Error('Live contract state is not active');

		const now = Date.now();
		const variables = {
			...(state.variables as Record<string, string | number | boolean | null>),
			[args.key]: args.value,
		};

		const updatedRequirements = [...(state.requirements as Requirement[])];
		const pendingActions = [...(state.pendingActions as QueuedAction[])];

		let lastEventHash = state.lastEventHash as string | undefined;
		const createdEvents: Array<{
			eventType: 'signal' | 'requirement_met' | 'action_enqueued' | 'action_executed';
			source: 'system' | 'owner' | 'signer' | 'integration';
			payload: unknown;
			createdAt: number;
		}> = [
			{
				eventType: 'signal',
				source: args.source,
				payload: { key: args.key, value: args.value, metadata: args.metadata ?? null },
				createdAt: now,
			},
		];

		for (let i = 0; i < updatedRequirements.length; i++) {
			const requirement = updatedRequirements[i];
			if (requirement.met) continue;
			if (!evaluateRequirement(requirement, variables)) continue;

			requirement.met = true;
			requirement.metAt = now;
			createdEvents.push({
				eventType: 'requirement_met',
				source: 'system',
				payload: { requirementId: requirement.id, key: requirement.key },
				createdAt: now,
			});

			for (const [actionIndex, action] of requirement.onMet.entries()) {
				const queued: QueuedAction = {
					id: `${requirement.id}:${now}:${actionIndex}`,
					requirementId: requirement.id,
					type: action.type,
					payload: action.payload,
					status: 'pending',
					createdAt: now,
				};
				pendingActions.push(queued);
				createdEvents.push({
					eventType: 'action_enqueued',
					source: 'system',
					payload: {
						actionId: queued.id,
						requirementId: requirement.id,
						type: queued.type,
						payload: queued.payload ?? null,
					},
					createdAt: now,
				});
			}
		}

		for (const event of createdEvents) {
			const eventHash = await computeEventHash({
				documentId: String(document._id),
				eventType: event.eventType,
				source: event.source,
				payload: event.payload,
				createdAt: event.createdAt,
				previousHash: lastEventHash,
			});
			await ctx.db.insert('liveContractEvents', {
				documentId: document._id,
				liveStateId: state._id,
				eventType: event.eventType,
				source: event.source,
				payload: event.payload,
				previousHash: lastEventHash,
				eventHash,
				createdAt: event.createdAt,
				createdBy: ctx.user._id,
			});
			lastEventHash = eventHash;
		}

		const stateHash = await computeStateHash({
			baseSealHash: state.baseSealHash,
			variables,
			requirements: updatedRequirements,
			pendingActions,
			status: state.status,
		});

		await ctx.db.patch(state._id, {
			variables,
			requirements: updatedRequirements,
			pendingActions,
			lastEventHash,
			stateHash,
			updatedAt: now,
		});

		await ctx.scheduler.runAfter(0, internal.auditLogs.mutations.log, {
			workosId: ctx.user._id,
			actorType: 'user',
			documentId: document._id,
			resourceType: 'document',
			resourceId: String(document._id),
			action: 'live_contract.signal_ingested',
			level: 'info',
			metadata: {
				key: args.key,
				source: args.source,
				lastEventHash,
				stateHash,
			},
		});

		return {
			stateId: state._id,
			stateHash,
			lastEventHash,
			queuedActionCount: pendingActions.filter((a) => a.status === 'pending').length,
		};
	},
});

export const executePendingAction = zProtectedMutation({
	args: {
		documentId: zid('documents'),
		actionId: z.string(),
		status: z.enum(['done', 'failed']),
		error: z.string().optional(),
	},
	handler: async (ctx, args) => {
		const document = await getOwnedEnvelopeOrThrow(ctx, args.documentId, ctx.user._id);
		const state = await ctx.db
			.query('liveContractStates')
			.withIndex('by_document', (q) => q.eq('documentId', document._id))
			.first();
		if (!state) throw new Error('Live contract state not initialized');

		const pendingActions = [...(state.pendingActions as QueuedAction[])];
		const actionIndex = pendingActions.findIndex((a) => a.id === args.actionId);
		if (actionIndex < 0) throw new Error('Action not found');
		if (pendingActions[actionIndex].status !== 'pending')
			throw new Error('Action is already finalized');

		const now = Date.now();
		pendingActions[actionIndex] = {
			...pendingActions[actionIndex],
			status: args.status,
			executedAt: now,
			error: args.status === 'failed' ? args.error ?? 'Unknown action failure' : undefined,
		};

		const eventHash = await computeEventHash({
			documentId: String(document._id),
			eventType: 'action_executed',
			source: 'system',
			payload: {
				actionId: args.actionId,
				status: args.status,
				error: pendingActions[actionIndex].error ?? null,
			},
			createdAt: now,
			previousHash: state.lastEventHash,
		});

		await ctx.db.insert('liveContractEvents', {
			documentId: document._id,
			liveStateId: state._id,
			eventType: 'action_executed',
			source: 'system',
			payload: {
				actionId: args.actionId,
				status: args.status,
				error: pendingActions[actionIndex].error ?? null,
			},
			previousHash: state.lastEventHash,
			eventHash,
			createdAt: now,
			createdBy: ctx.user._id,
		});

		const stateHash = await computeStateHash({
			baseSealHash: state.baseSealHash,
			variables: state.variables as Record<string, string | number | boolean | null>,
			requirements: state.requirements as Requirement[],
			pendingActions,
			status: state.status,
		});

		await ctx.db.patch(state._id, {
			pendingActions,
			lastEventHash: eventHash,
			stateHash,
			updatedAt: now,
		});

		return { stateHash, eventHash };
	},
});

export const getLiveContract = zProtectedQuery({
	args: {
		documentId: zid('documents'),
	},
	handler: async (ctx, args) => {
		const document = await getOwnedEnvelopeOrThrow(ctx, args.documentId, ctx.user._id);
		const state = await ctx.db
			.query('liveContractStates')
			.withIndex('by_document', (q) => q.eq('documentId', document._id))
			.first();
		if (!state) return null;

		const events = await ctx.db
			.query('liveContractEvents')
			.withIndex('by_document_and_created_at', (q) => q.eq('documentId', document._id))
			.order('desc')
			.take(100);

		return {
			state,
			events,
			seal: {
				sealedAt: document.sealedAt,
				contentHash: document.contentHash,
				baseSealHash: state.baseSealHash,
			},
		};
	},
});
