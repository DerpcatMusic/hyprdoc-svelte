import type {
  BlockLineageLink,
  LiveContractProjection,
  ProjectionVerificationResult,
  RuntimeLineageEvent,
  RuntimeLiveEvent,
} from "@hyprdoc/domain-types";

export interface SealHashInput {
  title: string;
  content: string;
  blocks: unknown;
  settings: unknown;
}

export interface LiveEventHashInput {
  documentId: string;
  eventType: string;
  source: string;
  payload: unknown;
  createdAt: number;
  previousHash?: string | null;
}

export interface LineageHashInput {
  documentId: string;
  blockId: string;
  blockHash: string;
  previousBlockHash?: string | null;
  parentAnchorHash?: string | null;
  changeType: string;
  reason?: string | null;
  how?: string | null;
  createdAt: number;
}

type HyprproofModule = typeof import("./wasm/hyprproof_core.js");
let hyprproofModulePromise: Promise<HyprproofModule> | null = null;

function stableSerialize(input: unknown): string {
  if (input === null || typeof input !== "object") return JSON.stringify(input);
  if (Array.isArray(input)) return `[${input.map((x) => stableSerialize(x)).join(",")}]`;

  const entries = Object.entries(input as Record<string, unknown>)
    .filter(([, value]) => value !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));

  return `{${entries
    .map(([k, v]) => `${JSON.stringify(k)}:${stableSerialize(v)}`)
    .join(",")}}`;
}

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function loadHyprproofModule(): Promise<HyprproofModule> {
  if (!hyprproofModulePromise) {
    hyprproofModulePromise = import("./wasm/hyprproof_core.js").then(
      async (module) => {
        await module.default();
        return module;
      }
    );
  }

  return hyprproofModulePromise;
}

export async function computeSealHash(input: SealHashInput): Promise<string> {
  const module = await loadHyprproofModule();

  return module.compute_seal_hash_json(
    JSON.stringify({
      title: input.title,
      content: input.content,
      blocks: input.blocks,
      settings: input.settings,
    })
  );
}

export async function verifySealHash(
  input: SealHashInput,
  expectedHash: string
): Promise<{ computedHash: string; matches: boolean }> {
  const computedHash = await computeSealHash(input);

  return {
    computedHash,
    matches: computedHash === expectedHash,
  };
}

export async function computeLiveEventHash(input: LiveEventHashInput): Promise<string> {
  const module = await loadHyprproofModule();

  return module.compute_live_event_hash_json(
    JSON.stringify({
      document_id: input.documentId,
      event_type: input.eventType,
      source: input.source,
      payload: input.payload,
      created_at: input.createdAt,
      previous_hash: input.previousHash ?? null,
    })
  );
}

export async function verifyLiveEventHash(
  input: LiveEventHashInput,
  expectedHash: string
): Promise<{ computedHash: string; matches: boolean }> {
  const computedHash = await computeLiveEventHash(input);

  return {
    computedHash,
    matches: computedHash === expectedHash,
  };
}

export async function computeLineageHash(input: LineageHashInput): Promise<string> {
  const module = await loadHyprproofModule();

  return module.compute_lineage_hash_json(
    JSON.stringify({
      document_id: input.documentId,
      block_id: input.blockId,
      block_hash: input.blockHash,
      previous_block_hash: input.previousBlockHash ?? null,
      parent_anchor_hash: input.parentAnchorHash ?? null,
      change_type: input.changeType,
      reason: input.reason ?? null,
      how: input.how ?? null,
      created_at: input.createdAt,
    })
  );
}

export async function verifyLineageHash(
  input: LineageHashInput,
  expectedHash: string
): Promise<{ computedHash: string; matches: boolean }> {
  const computedHash = await computeLineageHash(input);

  return {
    computedHash,
    matches: computedHash === expectedHash,
  };
}

export async function hashLineage(input: Omit<BlockLineageLink, "hash">): Promise<string> {
  const canonical = stableSerialize(input);
  return sha256Hex(canonical);
}

function sortByCreatedAt<T extends { createdAt: number; id: string }>(items: readonly T[]): T[] {
  return [...items].sort(
    (left, right) => left.createdAt - right.createdAt || left.id.localeCompare(right.id)
  );
}

function latestMatchedEvent(events: RuntimeLiveEvent[], blockId: string) {
  return [...events]
    .filter((event) => event.matchedBlockId === blockId)
    .sort((left, right) => right.createdAt - left.createdAt || right.id.localeCompare(left.id))[0];
}

export async function verifyRuntimeProjection(
  projection: LiveContractProjection
): Promise<ProjectionVerificationResult> {
  const issues: string[] = [];
  const orderedEvents = sortByCreatedAt<RuntimeLiveEvent>(projection.liveEvents);
  const orderedLineage = sortByCreatedAt<RuntimeLineageEvent>(projection.lineageEvents);

  let previousEventHash: string | null = null;
  let invalidEventId: string | undefined;
  let verifiedEventCount = 0;

  for (const event of orderedEvents) {
    const verification = await verifyLiveEventHash(
      {
        documentId: event.documentId,
        eventType: event.eventType,
        source: event.source,
        payload: event.payload,
        createdAt: event.createdAt,
        previousHash: previousEventHash,
      },
      event.eventHash
    );

    const storedPreviousHash = event.previousHash ?? null;
    if (!verification.matches || storedPreviousHash !== previousEventHash) {
      invalidEventId = event.id;
      issues.push(`Live event chain mismatch at ${event.id}`);
      break;
    }

    previousEventHash = event.eventHash;
    verifiedEventCount += 1;
  }

  let invalidLineageId: string | undefined;
  let invalidLineageBlockId: string | undefined;
  let verifiedLineageCount = 0;
  const lastBlockHashByBlockId = new Map<string, string>();

  for (const event of orderedLineage) {
    const verification = await verifyLineageHash(
      {
        documentId: event.documentId,
        blockId: event.blockId,
        blockHash: event.blockHash,
        previousBlockHash: event.previousBlockHash ?? null,
        parentAnchorHash: event.parentAnchorHash ?? null,
        changeType: event.changeType,
        reason: event.reason ?? null,
        how: event.how ?? null,
        createdAt: event.createdAt,
      },
      event.lineageHash
    );

    const previousBlockHash = lastBlockHashByBlockId.get(event.blockId) ?? null;
    if (!verification.matches || (event.previousBlockHash ?? null) !== previousBlockHash) {
      invalidLineageId = event.id;
      invalidLineageBlockId = event.blockId;
      issues.push(`Lineage mismatch at ${event.blockId}:${event.id}`);
      break;
    }

    lastBlockHashByBlockId.set(event.blockId, event.blockHash);
    verifiedLineageCount += 1;
  }

  const anchorByBlockId = new Map<string, LiveContractProjection["anchors"][number]>(
    projection.anchors.map((anchor) => [anchor.blockId, anchor] as const)
  );

  let invalidHeadBlockId: string | undefined;
  let verifiedHeadCount = 0;
  for (const head of projection.chainHeads) {
    const anchor = anchorByBlockId.get(head.blockId);
    const latestEvent = latestMatchedEvent(orderedEvents, head.blockId);

    if (anchor && head.sealedBlockHash !== anchor.sealedBlockHash) {
      invalidHeadBlockId = head.blockId;
      issues.push(`Chain head anchor mismatch at ${head.blockId}`);
      break;
    }

    if ((head.currentEventHash ?? null) !== (latestEvent?.eventHash ?? null)) {
      invalidHeadBlockId = head.blockId;
      issues.push(`Chain head event mismatch at ${head.blockId}`);
      break;
    }

    verifiedHeadCount += 1;
  }

  const storedHeadHash = projection.integrity.currentLastEventHash ?? null;
  const eventHeadValid =
    invalidEventId === undefined && storedHeadHash === (previousEventHash ?? null);
  if (!eventHeadValid) {
    issues.push("Live event head hash does not match the verified chain");
  }

  const sealAnchorValid =
    projection.integrity.isSealAnchorCurrent &&
    (projection.integrity.currentSealHash ?? projection.integrity.baseSealHash) ===
      projection.integrity.baseSealHash;
  if (!sealAnchorValid) {
    issues.push("Projection seal anchor is not aligned with the current envelope seal");
  }

  return {
    valid:
      issues.length === 0 &&
      sealAnchorValid &&
      eventHeadValid &&
      invalidLineageId === undefined &&
      invalidHeadBlockId === undefined,
    issues,
    sealAnchor: {
      valid: sealAnchorValid,
      baseSealHash: projection.integrity.baseSealHash,
      currentSealHash: projection.integrity.currentSealHash ?? null,
    },
    eventChain: {
      valid: eventHeadValid,
      verifiedCount: verifiedEventCount,
      computedHeadHash: previousEventHash ?? null,
      storedHeadHash,
      invalidEventId,
    },
    lineage: {
      valid: invalidLineageId === undefined,
      verifiedCount: verifiedLineageCount,
      invalidEventId: invalidLineageId,
      invalidBlockId: invalidLineageBlockId,
    },
    chainHeads: {
      valid: invalidHeadBlockId === undefined,
      verifiedCount: verifiedHeadCount,
      invalidBlockId: invalidHeadBlockId,
    },
  };
}

export { stableSerialize };
