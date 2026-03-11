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
  updatedAt: number;
}

export interface LiveContractProjection {
  snapshot: CanonicalSnapshotRef;
  anchors: SealedBlockAnchor[];
  policies: LiveBlockPolicy[];
  chainHeads: RuntimeChainHead[];
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
