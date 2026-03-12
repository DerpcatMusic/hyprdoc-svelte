import { z } from "zod";
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

export interface RuntimeResolvedBlockState {
  blockId: string;
  path: string;
  value: string | number | boolean | null;
  source: LiveActorSource | "sealed";
  eventHash?: HashHex | null;
  updatedAt?: number | null;
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
  resolvedBlocks: RuntimeResolvedBlockState[];
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

export interface RuntimeProjectionEnvelope {
  provider: "phoenix" | "convex";
  fetchedAt: number;
  projection: LiveContractProjection;
}

export interface RuntimeMutationRequest {
  blockId: string;
  path: string;
  op: "set" | "unset" | "append" | "remove" | "replace";
  source: LiveActorSource;
  value?: unknown;
  reason: string;
  how?: string;
  metadata?: Record<string, unknown>;
}

export interface RuntimeMutationEnvelope {
  provider: "phoenix" | "convex";
  fetchedAt: number;
  result: {
    documentId: string;
    blockId: string;
    path: string;
    value?: unknown;
    eventHash: HashHex;
    stateHash: HashHex;
  };
}

const hashHexSchema = z.string();
const providerSchema = z.enum(["phoenix", "convex"]);
const liveActorSourceSchema = z.enum(["system", "owner", "signer", "integration"]);
const optionalStringSchema = z.string().nullish().transform((value) => value ?? undefined);
const optionalHashSchema = hashHexSchema.nullish().transform((value) => value ?? undefined);
const runtimeConditionOperatorSchema = z.enum([
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "in",
  "exists",
]);
const runtimeMutationOpSchema = z.enum(["set", "unset", "append", "remove", "replace"]);
const actorSummarySchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
});
const canonicalSnapshotRefSchema = z.object({
  documentId: z.string(),
  documentVersion: z.number(),
  sealHash: hashHexSchema,
  sealedAt: z.number(),
});
const sealedBlockAnchorSchema = z.object({
  blockId: z.string(),
  blockType: optionalStringSchema,
  sealedBlockHash: hashHexSchema,
  parentBlockId: optionalStringSchema,
  parentAnchorHash: optionalHashSchema,
});
const runtimeConditionSchema = z.object({
  field: z.string(),
  operator: runtimeConditionOperatorSchema,
  value: z.unknown().optional(),
});
const runtimeIntegrationSchema = z.object({
  integration: z.string(),
  externalObjectType: z.string(),
  externalObjectIdPath: z.string(),
  idempotencyKeyPath: z.string().optional(),
});
const runtimePolicySchema = z.object({
  blockId: z.string(),
  blockType: z.string(),
  mode: z.enum(["sealed", "live_append_only", "live_replaceable"]),
  allowedPaths: z.array(z.string()),
  condition: runtimeConditionSchema.nullish().transform((value) => value ?? undefined),
  integration: runtimeIntegrationSchema.nullish().transform((value) => value ?? undefined),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
const runtimeChainHeadSchema = z.object({
  documentId: z.string(),
  blockId: z.string(),
  baseSealHash: hashHexSchema,
  sealedBlockHash: hashHexSchema,
  currentEventHash: optionalHashSchema,
  currentStateHash: optionalHashSchema,
  matchedBy: optionalStringSchema,
  eventType: optionalStringSchema,
  source: liveActorSourceSchema.nullish().transform((value) => value ?? undefined),
  updatedAt: z.number(),
});
const runtimeLiveEventSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  eventType: z.string(),
  source: liveActorSourceSchema,
  payload: z.unknown(),
  createdAt: z.number(),
  eventHash: hashHexSchema,
  previousHash: hashHexSchema.nullish(),
  matchedBlockId: optionalStringSchema,
  matchedBy: optionalStringSchema,
  createdBy: actorSummarySchema.nullish(),
});
const runtimeLineageEventSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  blockId: z.string(),
  parentBlockId: z.string().nullish(),
  changeType: z.enum(["created", "updated", "deleted"]),
  reason: z.string().nullish(),
  how: z.string().nullish(),
  blockHash: hashHexSchema,
  previousBlockHash: hashHexSchema.nullish(),
  parentAnchorHash: hashHexSchema.nullish(),
  lineageHash: hashHexSchema,
  createdAt: z.number(),
  createdBy: actorSummarySchema.nullish(),
});
const runtimeResolvedBlockStateSchema = z.object({
  blockId: z.string(),
  path: z.string(),
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  source: z.enum(["system", "owner", "signer", "integration", "sealed"]),
  eventHash: hashHexSchema.nullish(),
  updatedAt: z.number().nullish(),
});
const projectionIntegrityStateSchema = z.object({
  baseSealHash: hashHexSchema,
  currentSealHash: hashHexSchema.nullish(),
  currentStateHash: hashHexSchema.nullish(),
  currentLastEventHash: hashHexSchema.nullish(),
  isSealAnchorCurrent: z.boolean(),
  totalLiveEventCount: z.number(),
  totalLineageEventCount: z.number(),
});
const liveContractProjectionSchema = z.object({
  snapshot: canonicalSnapshotRefSchema,
  anchors: z.array(sealedBlockAnchorSchema),
  policies: z.array(runtimePolicySchema),
  chainHeads: z.array(runtimeChainHeadSchema),
  resolvedBlocks: z.array(runtimeResolvedBlockStateSchema),
  liveEvents: z.array(runtimeLiveEventSchema),
  lineageEvents: z.array(runtimeLineageEventSchema),
  integrity: projectionIntegrityStateSchema,
});

export const runtimeProjectionEnvelopeSchema = z.object({
  provider: providerSchema,
  fetchedAt: z.number(),
  projection: liveContractProjectionSchema,
});

export const runtimeMutationRequestSchema = z.object({
  blockId: z.string().min(1),
  path: z.string().min(1),
  op: runtimeMutationOpSchema,
  source: liveActorSourceSchema,
  value: z.unknown().optional(),
  reason: z.string().min(1),
  how: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const runtimeMutationEnvelopeSchema = z.object({
  provider: providerSchema,
  fetchedAt: z.number(),
  result: z.object({
    documentId: z.string(),
    blockId: z.string(),
    path: z.string(),
    value: z.unknown().optional(),
    eventHash: hashHexSchema,
    stateHash: hashHexSchema,
  }),
});

export function parseRuntimeProjectionEnvelope(value: unknown): RuntimeProjectionEnvelope {
  return runtimeProjectionEnvelopeSchema.parse(value) as RuntimeProjectionEnvelope;
}

export function parseRuntimeMutationRequest(value: unknown): RuntimeMutationRequest {
  return runtimeMutationRequestSchema.parse(value) as RuntimeMutationRequest;
}

export function parseRuntimeMutationEnvelope(value: unknown): RuntimeMutationEnvelope {
  return runtimeMutationEnvelopeSchema.parse(value) as RuntimeMutationEnvelope;
}
