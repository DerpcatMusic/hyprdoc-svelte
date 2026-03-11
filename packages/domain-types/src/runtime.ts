import type { CanonicalSnapshotRef, HashHex, LiveActorSource, SealedBlockAnchor } from "./index";

export type LiveBlockPolicyMode = "sealed" | "live_append_only" | "live_replaceable";

export interface LiveBlockCondition {
  field: string;
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "exists";
  value?: unknown;
}

export interface LiveBlockIntegrationBinding {
  integration: string;
  externalObjectType: string;
  externalObjectIdPath: string;
  idempotencyKeyPath?: string;
}

export interface LiveBlockPolicy {
  blockId: string;
  blockType: string;
  mode: LiveBlockPolicyMode;
  allowedPaths: string[];
  condition?: LiveBlockCondition;
  integration?: LiveBlockIntegrationBinding;
  metadata?: Record<string, unknown>;
}

export interface AuthorizedLiveMutation {
  documentId: string;
  blockId: string;
  source: LiveActorSource;
  op: "set" | "unset" | "append" | "remove" | "replace";
  path: string;
  value?: unknown;
  previousValue?: unknown;
  reason: string;
  how?: string;
  metadata?: Record<string, unknown>;
}

export interface RuntimeChainHead {
  documentId: string;
  blockId: string;
  baseSealHash: HashHex;
  sealedBlockHash: HashHex;
  currentEventHash?: HashHex;
  currentStateHash?: HashHex;
  matchedBy?: string;
  eventType?: string;
  source?: LiveActorSource;
  updatedAt: number;
}

export interface RuntimeActorSummary {
  id: string;
  name: string | null;
  email: string | null;
}

export interface RuntimeLiveEvent {
  id: string;
  documentId: string;
  eventType: string;
  source: LiveActorSource;
  payload: unknown;
  createdAt: number;
  eventHash: HashHex;
  previousHash?: HashHex | null;
  matchedBlockId?: string;
  matchedBy?: string;
  createdBy?: RuntimeActorSummary | null;
}

export interface RuntimeLineageEvent {
  id: string;
  documentId: string;
  blockId: string;
  parentBlockId?: string | null;
  changeType: "created" | "updated" | "deleted";
  reason?: string | null;
  how?: string | null;
  blockHash: HashHex;
  previousBlockHash?: HashHex | null;
  parentAnchorHash?: HashHex | null;
  lineageHash: HashHex;
  createdAt: number;
  createdBy?: RuntimeActorSummary | null;
}

export interface ProjectionIntegrityState {
  baseSealHash: HashHex;
  currentSealHash?: HashHex | null;
  currentStateHash?: HashHex | null;
  currentLastEventHash?: HashHex | null;
  isSealAnchorCurrent: boolean;
  totalLiveEventCount: number;
  totalLineageEventCount: number;
}

export interface LiveContractProjection {
  snapshot: CanonicalSnapshotRef;
  anchors: SealedBlockAnchor[];
  policies: LiveBlockPolicy[];
  chainHeads: RuntimeChainHead[];
  liveEvents: RuntimeLiveEvent[];
  lineageEvents: RuntimeLineageEvent[];
  integrity: ProjectionIntegrityState;
}

export interface ProofVerificationRequest {
  snapshot: CanonicalSnapshotRef;
  anchors: SealedBlockAnchor[];
  events: Array<Record<string, unknown>>;
}

export interface ProofVerificationResult {
  valid: boolean;
  sealHash: HashHex;
  latestStateHash?: HashHex;
  failureCode?: "seal_mismatch" | "event_hash_mismatch" | "unauthorized_mutation";
  details?: Record<string, unknown>;
}

export interface ProjectionVerificationResult {
  valid: boolean;
  issues: string[];
  sealAnchor: {
    valid: boolean;
    baseSealHash: HashHex;
    currentSealHash?: HashHex | null;
  };
  eventChain: {
    valid: boolean;
    verifiedCount: number;
    computedHeadHash?: HashHex | null;
    storedHeadHash?: HashHex | null;
    invalidEventId?: string;
  };
  lineage: {
    valid: boolean;
    verifiedCount: number;
    invalidEventId?: string;
    invalidBlockId?: string;
  };
  chainHeads: {
    valid: boolean;
    verifiedCount: number;
    invalidBlockId?: string;
  };
}
