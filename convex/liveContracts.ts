import { internal } from '@/convex/_generated/api';
import type { Doc, Id } from '@/convex/_generated/dataModel';
import { zProtectedMutation, zProtectedQuery, z, zid } from '@/convex/lib/core';
import {
	deriveLiveBlockPolicy,
	extractSmartBlocksFromContent,
	normalizeSmartBlockSnapshot,
} from '@hyprdoc/domain-types';
import { hashContent } from '@/convex/lib/crypto';
import { isDocumentSealed } from '@/convex/lib/services/sealing_service';
import { stableStringify } from '@/convex/lib/stable_json';

const signalValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const sourceSchema = z.enum(['system', 'owner', 'signer', 'integration']);
const actionTypeSchema = z.enum(['notify', 'set_variable', 'append_note']);
const requirementOperatorSchema = z.enum(['eq', 'gte', 'lte', 'present']);
const mutationOpSchema = z.enum(['set', 'unset', 'append', 'remove', 'replace']);

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
type SignalValue = z.infer<typeof signalValueSchema>;
type LiveSource = z.infer<typeof sourceSchema>;
type MutationOp = z.infer<typeof mutationOpSchema>;
type OwnedEnvelope = Doc<'documents'> & { kind: 'envelope'; contentHash: string };
type RuntimeBlock = ReturnType<typeof normalizeSmartBlockSnapshot>[number];
type LiveEventType =
	| 'signal'
	| 'requirement_met'
	| 'action_enqueued'
	| 'action_executed'
	| 'authorized_mutation';

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
	eventType: LiveEventType;
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

function getEnvelopeBlocks(document: Doc<'documents'>): RuntimeBlock[] {
	const normalized = normalizeSmartBlockSnapshot(document.blocks);
	return normalized.length > 0 ? normalized : extractSmartBlocksFromContent(document.content);
}

function getScalarVariableKey(blockId: string, path: string) {
	return `block:${blockId}:${path}`;
}

function getBlockValue(block: RuntimeBlock, path: string): SignalValue | undefined {
	if (path === 'data.value') {
		const value = block.data.value;
		return typeof value === 'string' ||
			typeof value === 'number' ||
			typeof value === 'boolean' ||
			value === null
			? value
			: undefined;
	}

	return undefined;
}

function applyScalarMutation(
	previousValue: SignalValue | undefined,
	op: MutationOp,
	nextValue: SignalValue | undefined,
): SignalValue | undefined {
	switch (op) {
		case 'set':
		case 'replace':
			return nextValue ?? null;
		case 'unset':
		case 'remove':
			return null;
		case 'append':
			if (typeof previousValue === 'string' || previousValue === null || previousValue === undefined) {
				return `${previousValue ?? ''}${String(nextValue ?? '')}`;
			}
			return nextValue ?? previousValue ?? null;
		default:
			return nextValue;
	}
}

function evaluateLiveCondition(
	condition: { field: string; operator: string; value?: unknown } | undefined,
	variables: Record<string, SignalValue>,
) {
	if (!condition) return true;

	const currentValue = variables[condition.field];
	switch (condition.operator) {
		case 'exists':
			return currentValue !== undefined && currentValue !== null;
		case 'eq':
			return currentValue === condition.value;
		case 'neq':
			return currentValue !== condition.value;
		case 'gt':
			return typeof currentValue === 'number' && typeof condition.value === 'number'
				? currentValue > condition.value
				: false;
		case 'gte':
			return typeof currentValue === 'number' && typeof condition.value === 'number'
				? currentValue >= condition.value
				: false;
		case 'lt':
			return typeof currentValue === 'number' && typeof condition.value === 'number'
				? currentValue < condition.value
				: false;
		case 'lte':
			return typeof currentValue === 'number' && typeof condition.value === 'number'
				? currentValue <= condition.value
				: false;
		case 'in':
			return Array.isArray(condition.value) ? condition.value.includes(currentValue) : false;
		default:
			return false;
	}
}

function requireLiveStateStatus(state: Doc<'liveContractStates'>) {
	if (state.status !== 'active') {
		throw new Error('Live contract state is not active');
	}
}

async function getOwnedEnvelopeOrThrow(
	ctx: { db: { get: (id: Id<'documents'>) => Promise<Doc<'documents'> | null> } },
	documentId: Id<'documents'>,
	userId: Id<'users'>,
): Promise<OwnedEnvelope> {
	const document = await ctx.db.get(documentId);
	if (!document) throw new Error('Document not found');
	if (document.ownerId !== userId) throw new Error('Not authorized');
	if (document.kind !== 'envelope') throw new Error('Live contracts are envelope-only');
	if (!isDocumentSealed(document))
		throw new Error('Envelope must be sealed before live state can start');
	if (!document.contentHash) throw new Error('Missing envelope seal hash');
	return document as OwnedEnvelope;
}

async function getLiveStateOrThrow(
	ctx: {
		db: {
			query: (table: 'liveContractStates') => {
				withIndex: (
					name: 'by_document',
					callback: (q: { eq: (field: 'documentId', value: Id<'documents'>) => unknown }) => unknown,
				) => { first: () => Promise<Doc<'liveContractStates'> | null> };
			};
		};
	},
	documentId: Id<'documents'>,
) {
	const state = await ctx.db
		.query('liveContractStates')
		.withIndex('by_document', (q) => q.eq('documentId', documentId))
		.first();
	if (!state) throw new Error('Live contract state not initialized');
	requireLiveStateStatus(state);
	return state;
}

async function appendLiveEvent(ctx: {
	db: {
		insert: (table: 'liveContractEvents', value: Record<string, unknown>) => Promise<unknown>;
	};
	user: { _id: Id<'users'> };
}, input: {
	documentId: Id<'documents'>;
	liveStateId: Id<'liveContractStates'>;
	eventType: LiveEventType;
	source: LiveSource;
	payload: unknown;
	createdAt: number;
	previousHash?: string;
}) {
	const eventHash = await computeEventHash({
		documentId: String(input.documentId),
		eventType: input.eventType,
		source: input.source,
		payload: input.payload,
		createdAt: input.createdAt,
		previousHash: input.previousHash,
	});

	await ctx.db.insert('liveContractEvents', {
		documentId: input.documentId,
		liveStateId: input.liveStateId,
		eventType: input.eventType,
		source: input.source,
		payload: input.payload,
		previousHash: input.previousHash,
		eventHash,
		createdAt: input.createdAt,
		createdBy: ctx.user._id,
	});

	return eventHash;
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
		const state = await getLiveStateOrThrow(ctx, document._id);

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
			const eventHash = await appendLiveEvent(ctx, {
				documentId: document._id,
				liveStateId: state._id,
				eventType: event.eventType,
				source: event.source,
				payload: event.payload,
				createdAt: event.createdAt,
				previousHash: lastEventHash,
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
		const state = await getLiveStateOrThrow(ctx, document._id);

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

		const eventHash = await appendLiveEvent(ctx, {
			documentId: document._id,
			liveStateId: state._id,
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

export const applyAuthorizedBlockMutation = zProtectedMutation({
	args: {
		documentId: zid('documents'),
		blockId: z.string(),
		path: z.string(),
		op: mutationOpSchema.default('set'),
		value: signalValueSchema.optional(),
		source: sourceSchema.default('owner'),
		reason: z.string(),
		how: z.string().optional(),
		metadata: z.any().optional(),
	},
	handler: async (ctx, args) => {
		const document = await getOwnedEnvelopeOrThrow(ctx, args.documentId, ctx.user._id);
		const state = await getLiveStateOrThrow(ctx, document._id);
		const blocks = getEnvelopeBlocks(document);
		const block = blocks.find((candidate) => candidate.id === args.blockId);
		if (!block) throw new Error('Block not found on sealed envelope');

		const policy = deriveLiveBlockPolicy(block);
		if (policy.mode === 'sealed') {
			throw new Error('Block is sealed against post-sign mutation');
		}
		if (!policy.allowedPaths.includes(args.path)) {
			throw new Error(`Path ${args.path} is not allowed for this live block`);
		}

		const variables = {
			...(state.variables as Record<string, SignalValue>),
		};
		if (!evaluateLiveCondition(policy.condition, variables)) {
			throw new Error('Live block condition is not satisfied');
		}

		const previousValue =
			variables[getScalarVariableKey(args.blockId, args.path)] ?? getBlockValue(block, args.path);
		const nextValue = applyScalarMutation(previousValue, args.op, args.value);
		const variableKey = getScalarVariableKey(args.blockId, args.path);
		variables[variableKey] = nextValue ?? null;

		const now = Date.now();
		const payload = {
			blockId: args.blockId,
			blockType: block.blockType,
			path: args.path,
			op: args.op,
			value: nextValue ?? null,
			previousValue: previousValue ?? null,
			reason: args.reason,
			how: args.how ?? null,
			baseSealHash: state.baseSealHash,
			sealedBlockHash: await hashContent(stableStringify(block)),
			parentAnchorHash: null,
			metadata: args.metadata ?? null,
		};

		const eventHash = await appendLiveEvent(ctx, {
			documentId: document._id,
			liveStateId: state._id,
			eventType: 'authorized_mutation',
			source: args.source,
			payload,
			createdAt: now,
			previousHash: state.lastEventHash,
		});

		const stateHash = await computeStateHash({
			baseSealHash: state.baseSealHash,
			variables,
			requirements: state.requirements as Requirement[],
			pendingActions: state.pendingActions as QueuedAction[],
			status: state.status,
		});

		await ctx.db.patch(state._id, {
			variables,
			lastEventHash: eventHash,
			stateHash,
			updatedAt: now,
		});

		await ctx.scheduler.runAfter(0, internal.auditLogs.mutations.log, {
			workosId: ctx.user._id,
			actorType: 'user',
			documentId: document._id,
			resourceType: 'document',
			resourceId: String(document._id),
			action: 'live_contract.authorized_block_mutation',
			level: 'security',
			metadata: {
				blockId: args.blockId,
				path: args.path,
				op: args.op,
				reason: args.reason,
				how: args.how ?? null,
				eventHash,
				stateHash,
			},
		});

		return {
			documentId: document._id,
			blockId: args.blockId,
			path: args.path,
			value: nextValue ?? null,
			eventHash,
			stateHash,
		};
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

export const verifyLiveContractIntegrity = zProtectedQuery({
	args: {
		documentId: zid('documents'),
	},
	handler: async (ctx, args) => {
		const document = await getOwnedEnvelopeOrThrow(ctx, args.documentId, ctx.user._id);
		const state = await ctx.db
			.query('liveContractStates')
			.withIndex('by_document', (q) => q.eq('documentId', document._id))
			.first();
		if (!state) throw new Error('Live contract state not initialized');

		const canonicalStateHash = await computeStateHash({
			baseSealHash: state.baseSealHash,
			variables: state.variables as Record<string, string | number | boolean | null>,
			requirements: state.requirements as Requirement[],
			pendingActions: state.pendingActions as QueuedAction[],
			status: state.status,
		});

		const events = await ctx.db
			.query('liveContractEvents')
			.withIndex('by_document_and_created_at', (q) => q.eq('documentId', document._id))
			.order('asc')
			.collect();

		let previousHash: string | undefined;
		let eventChainValid = true;
		for (const event of events) {
			const expectedEventHash = await computeEventHash({
				documentId: String(event.documentId),
				eventType: event.eventType,
				source: event.source,
				payload: event.payload,
				createdAt: event.createdAt,
				previousHash,
			});

			if (event.previousHash !== previousHash || event.eventHash !== expectedEventHash) {
				eventChainValid = false;
				break;
			}
			previousHash = event.eventHash;
		}

		return {
			documentId: document._id,
			baseSealHash: document.contentHash,
			storedStateHash: state.stateHash,
			computedStateHash: canonicalStateHash,
			stateHashValid: state.stateHash === canonicalStateHash,
			storedLastEventHash: state.lastEventHash ?? null,
			computedLastEventHash: previousHash ?? null,
			lastEventHashValid: (state.lastEventHash ?? null) === (previousHash ?? null),
			eventChainValid,
			eventCount: events.length,
		};
	},
});
