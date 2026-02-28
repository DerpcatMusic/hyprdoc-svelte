import { internal } from '@/convex/_generated/api';
import { hashContent } from '@/convex/lib/crypto';
import { stableStringify } from '@/convex/lib/stable_json';

type BlockRecord = Record<string, unknown> & { id?: string };

export interface RecordBlockLineageInput {
	documentId: any;
	previousBlocks: unknown;
	nextBlocks: unknown;
	changedBy: any;
	reason?: string;
	how?: string;
}

function asBlockArray(value: unknown): BlockRecord[] {
	if (!Array.isArray(value)) return [];
	return value.filter((item) => item && typeof item === 'object') as BlockRecord[];
}

function getBlockId(block: BlockRecord): string | null {
	const id = block.id;
	return typeof id === 'string' && id.length > 0 ? id : null;
}

function getParentBlockId(block: BlockRecord): string | undefined {
	const candidates = [
		block.parentBlockId,
		block.parentId,
		block.sourceBlockId,
		block.createdFromBlockId,
	];
	for (const candidate of candidates) {
		if (typeof candidate === 'string' && candidate.length > 0) return candidate;
	}
	return undefined;
}

function buildBlockMap(blocks: BlockRecord[]): Map<string, BlockRecord> {
	const map = new Map<string, BlockRecord>();
	for (const block of blocks) {
		const id = getBlockId(block);
		if (id) map.set(id, block);
	}
	return map;
}

async function computeBlockHash(block: BlockRecord): Promise<string> {
	return hashContent(stableStringify(block));
}

async function computeLineageHash(input: {
	documentId: string;
	blockId: string;
	blockHash: string;
	previousBlockHash?: string;
	parentAnchorHash?: string;
	changeType: 'created' | 'updated' | 'deleted';
	reason?: string;
	how?: string;
	createdAt: number;
}): Promise<string> {
	return hashContent(
		stableStringify({
			documentId: input.documentId,
			blockId: input.blockId,
			blockHash: input.blockHash,
			previousBlockHash: input.previousBlockHash ?? null,
			parentAnchorHash: input.parentAnchorHash ?? null,
			changeType: input.changeType,
			reason: input.reason ?? null,
			how: input.how ?? null,
			createdAt: input.createdAt,
		}),
	);
}

async function getLatestBlockHash(
	ctx: any,
	documentId: any,
	blockId: string,
): Promise<string | undefined> {
	const latest = await ctx.db
		.query('blockLineageEvents')
		.withIndex('by_document_block_created_at', (q: any) =>
			q.eq('documentId', documentId).eq('blockId', blockId),
		)
		.order('desc')
		.first();
	return latest?.blockHash;
}

async function insertLineageEvent(ctx: any, input: {
	documentId: any;
	blockId: string;
	parentBlockId?: string;
	changeType: 'created' | 'updated' | 'deleted';
	blockHash: string;
	previousBlockHash?: string;
	parentAnchorHash?: string;
	reason?: string;
	how?: string;
	changeSummary?: unknown;
	createdBy?: any;
	createdAt: number;
}) {
	const lineageHash = await computeLineageHash({
		documentId: String(input.documentId),
		blockId: input.blockId,
		blockHash: input.blockHash,
		previousBlockHash: input.previousBlockHash,
		parentAnchorHash: input.parentAnchorHash,
		changeType: input.changeType,
		reason: input.reason,
		how: input.how,
		createdAt: input.createdAt,
	});

	await ctx.db.insert('blockLineageEvents', {
		documentId: input.documentId,
		blockId: input.blockId,
		parentBlockId: input.parentBlockId,
		changeType: input.changeType,
		reason: input.reason,
		how: input.how,
		changeSummary: input.changeSummary,
		previousBlockHash: input.previousBlockHash,
		parentAnchorHash: input.parentAnchorHash,
		blockHash: input.blockHash,
		lineageHash,
		createdAt: input.createdAt,
		createdBy: input.createdBy,
	});

	return lineageHash;
}

export async function recordInitialBlockLineage(
	ctx: any,
	input: {
		documentId: any;
		blocks: unknown;
		createdBy: any;
		reason?: string;
		how?: string;
	},
) {
	const blocks = asBlockArray(input.blocks);
	const blockMap = buildBlockMap(blocks);
	const now = Date.now();

	const summary: Array<Record<string, unknown>> = [];

	for (const block of blocks) {
		const blockId = getBlockId(block);
		if (!blockId) continue;

		const parentBlockId = getParentBlockId(block);
		const parentAnchorHash =
			parentBlockId && blockMap.get(parentBlockId)
				? await computeBlockHash(blockMap.get(parentBlockId) as BlockRecord)
				: undefined;
		const blockHash = await computeBlockHash(block);
		const lineageHash = await insertLineageEvent(ctx, {
			documentId: input.documentId,
			blockId,
			parentBlockId,
			changeType: 'created',
			blockHash,
			parentAnchorHash,
			reason: input.reason,
			how: input.how,
			createdBy: input.createdBy,
			createdAt: now,
		});

		summary.push({
			blockId,
			changeType: 'created',
			parentBlockId: parentBlockId ?? null,
			blockHash,
			parentAnchorHash: parentAnchorHash ?? null,
			lineageHash,
		});
	}

	if (summary.length > 0) {
		await ctx.scheduler.runAfter(0, internal.auditLogs.mutations.log, {
			workosId: input.createdBy,
			actorType: 'user',
			documentId: input.documentId,
			resourceType: 'document',
			resourceId: String(input.documentId),
			action: 'block.lineage_initialized',
			level: 'security',
			metadata: {
				reason: input.reason ?? 'initialization',
				how: input.how ?? 'system',
				changes: summary,
			},
		});
	}

	return summary.length;
}

export async function recordBlockLineageChanges(
	ctx: any,
	input: RecordBlockLineageInput,
) {
	const previousBlocks = asBlockArray(input.previousBlocks);
	const nextBlocks = asBlockArray(input.nextBlocks);
	const previousMap = buildBlockMap(previousBlocks);
	const nextMap = buildBlockMap(nextBlocks);
	const now = Date.now();

	const summary: Array<Record<string, unknown>> = [];

	for (const [blockId, nextBlock] of nextMap.entries()) {
		const prevBlock = previousMap.get(blockId);
		const prevHashDirect = prevBlock ? await computeBlockHash(prevBlock) : undefined;
		const nextHash = await computeBlockHash(nextBlock);
		const hasChanged = !prevBlock || prevHashDirect !== nextHash;
		if (!hasChanged) continue;

		const parentBlockId = getParentBlockId(nextBlock);
		const latestPreviousHash = await getLatestBlockHash(ctx, input.documentId, blockId);
		const previousBlockHash = latestPreviousHash ?? prevHashDirect;
		const parentAnchorHash = parentBlockId
			? await getLatestBlockHash(ctx, input.documentId, parentBlockId)
			: undefined;

		const changeType: 'created' | 'updated' = prevBlock ? 'updated' : 'created';
		const lineageHash = await insertLineageEvent(ctx, {
			documentId: input.documentId,
			blockId,
			parentBlockId,
			changeType,
			blockHash: nextHash,
			previousBlockHash,
			parentAnchorHash,
			reason: input.reason,
			how: input.how,
			changeSummary: {
				previous: prevBlock ?? null,
				next: nextBlock,
			},
			createdBy: input.changedBy,
			createdAt: now,
		});

		summary.push({
			blockId,
			changeType,
			parentBlockId: parentBlockId ?? null,
			previousBlockHash: previousBlockHash ?? null,
			parentAnchorHash: parentAnchorHash ?? null,
			blockHash: nextHash,
			lineageHash,
		});
	}

	for (const [blockId, prevBlock] of previousMap.entries()) {
		if (nextMap.has(blockId)) continue;

		const previousBlockHash =
			(await getLatestBlockHash(ctx, input.documentId, blockId)) ??
			(await computeBlockHash(prevBlock));
		const tombstoneHash = await hashContent(
			stableStringify({ blockId, tombstone: true, at: now }),
		);

		const lineageHash = await insertLineageEvent(ctx, {
			documentId: input.documentId,
			blockId,
			changeType: 'deleted',
			blockHash: tombstoneHash,
			previousBlockHash,
			reason: input.reason,
			how: input.how,
			changeSummary: {
				previous: prevBlock,
				next: null,
			},
			createdBy: input.changedBy,
			createdAt: now,
		});

		summary.push({
			blockId,
			changeType: 'deleted',
			previousBlockHash: previousBlockHash ?? null,
			blockHash: tombstoneHash,
			lineageHash,
		});
	}

	if (summary.length > 0) {
		await ctx.scheduler.runAfter(0, internal.auditLogs.mutations.log, {
			workosId: input.changedBy,
			actorType: 'user',
			documentId: input.documentId,
			resourceType: 'document',
			resourceId: String(input.documentId),
			action: 'block.lineage_updated',
			level: 'security',
			metadata: {
				reason: input.reason ?? 'editor_update',
				how: input.how ?? 'editor',
				changeCount: summary.length,
				changes: summary,
			},
		});
	}

	return summary.length;
}
