export type ContractEventType =
  | "init"
  | "block_created"
  | "block_updated"
  | "block_deleted"
  | "sealed"
  | "signed"
  | "completed";

export interface ContractEventActor {
  workosId?: string;
  memberId?: string;
  displayName?: string;
}

export interface ContractEvent<TPayload = Record<string, unknown>> {
  type: ContractEventType;
  at: number;
  actor: ContractEventActor;
  reason?: string;
  how?: string;
  payload: TPayload;
}

export interface BlockLineageLink {
  blockId: string;
  parentBlockId?: string;
  previousHash?: string;
  hash: string;
}

export type HashHex = string;

export type LiveActorSource = "system" | "owner" | "signer" | "integration";

export type LiveBlockEventType =
  | "field_value_set"
  | "status_changed"
  | "calculation_refreshed"
  | "integration_synced"
  | "note_appended"
  | "acknowledged";

export type LiveBlockMutationOp =
  | "set"
  | "unset"
  | "append"
  | "remove"
  | "replace";

export interface CanonicalSnapshotRef {
  documentId: string;
  documentVersion: number;
  sealHash: HashHex;
  sealedAt: number;
}

export interface SealedBlockAnchor {
  blockId: string;
  blockType?: string;
  sealedBlockHash: HashHex;
  parentBlockId?: string;
  parentAnchorHash?: HashHex;
}

export interface LiveBlockMutation {
  op: LiveBlockMutationOp;
  path: string;
  value?: unknown;
  previousValue?: unknown;
  metadata?: Record<string, unknown>;
}

export interface LiveBlockEventActor extends ContractEventActor {
  source: LiveActorSource;
}

export interface LiveBlockEvent {
  eventId: string;
  documentId: string;
  blockId: string;
  blockType?: string;
  type: LiveBlockEventType;
  at: number;
  actor: LiveBlockEventActor;
  baseSealHash: HashHex;
  sealedBlockHash: HashHex;
  parentAnchorHash?: HashHex;
  previousEventHash?: HashHex;
  eventHash: HashHex;
  mutation: LiveBlockMutation;
}

export interface LiveBlockChainHead {
  documentId: string;
  blockId: string;
  baseSealHash: HashHex;
  sealedBlockHash: HashHex;
  headEventHash?: HashHex;
  stateHash?: HashHex;
  updatedAt: number;
}

export interface LiveBlockViewState {
  blockId: string;
  currentEventHash?: HashHex;
  acknowledgedEventHash?: HashHex;
  isBehind: boolean;
  shouldPulse: boolean;
}

export type {
  AuthorizedLiveMutation,
  LiveBlockCondition,
  LiveBlockIntegrationBinding,
  LiveBlockPolicy,
  LiveBlockPolicyMode,
  LiveContractProjection,
  ProjectionIntegrityState,
  ProjectionVerificationResult,
  ProofVerificationRequest,
  ProofVerificationResult,
  RuntimeActorSummary,
  RuntimeMutationEnvelope,
  RuntimeMutationRequest,
  RuntimeProjectionEnvelope,
  RuntimeChainHead,
  RuntimeLineageEvent,
  RuntimeLiveEvent,
  RuntimeResolvedBlockState,
} from "./runtime";

export { deriveLiveBlockPolicy } from "./runtime-policy";

export {
  extractSmartBlocksFromContent,
  normalizeSmartBlock,
  normalizeSmartBlockSnapshot,
  type CanonicalSmartBlock,
} from "./smart-blocks";

export {
  parseRuntimeMutationEnvelope,
  parseRuntimeMutationRequest,
  parseRuntimeProjectionEnvelope,
  runtimeMutationEnvelopeSchema,
  runtimeMutationRequestSchema,
  runtimeProjectionEnvelopeSchema,
} from "./runtime";

export type {
  AssignSignerRequest,
  AssignSignerResponse,
  CompleteSignerSessionResponse,
  CreateSigningSessionRequest,
  CreateSigningSessionResponse,
  RecordSignatureRequest,
  RecordSignatureResponse,
  RecordSignerViewRequest,
  RecordSignerViewResponse,
  SaveFieldValueRequest,
  SaveFieldValueResponse,
  SendAuthChallengeRequest,
  SendAuthChallengeResponse,
  SignatureCaptureType,
  SignerAssignmentStatus,
  SignerAuthMethod,
  SignerPortalExpired,
  SignerPortalView,
  SigningOrder,
  SigningSessionSettings,
  SigningSessionStatus,
  SigningSessionSummary,
  StartSigningSessionResponse,
  VerifyAuthChallengeRequest,
  VerifyAuthChallengeResponse,
} from "./signing";

export {
  assignSignerRequestSchema,
  assignSignerResponseSchema,
  completeSignerSessionResponseSchema,
  createSigningSessionRequestSchema,
  createSigningSessionResponseSchema,
  parseAssignSignerRequest,
  parseAssignSignerResponse,
  parseCompleteSignerSessionResponse,
  parseCreateSigningSessionRequest,
  parseCreateSigningSessionResponse,
  parseRecordSignatureRequest,
  parseRecordSignatureResponse,
  parseRecordSignerViewRequest,
  parseRecordSignerViewResponse,
  parseSaveFieldValueRequest,
  parseSaveFieldValueResponse,
  parseSendAuthChallengeRequest,
  parseSendAuthChallengeResponse,
  parseSignerPortalResponse,
  parseSigningSessionSummary,
  parseStartSigningSessionResponse,
  parseVerifyAuthChallengeRequest,
  parseVerifyAuthChallengeResponse,
  recordSignatureRequestSchema,
  recordSignatureResponseSchema,
  recordSignerViewRequestSchema,
  recordSignerViewResponseSchema,
  saveFieldValueRequestSchema,
  saveFieldValueResponseSchema,
  sendAuthChallengeRequestSchema,
  sendAuthChallengeResponseSchema,
  signerPortalExpiredSchema,
  signerPortalResponseSchema,
  signerPortalViewSchema,
  signingSessionSummarySchema,
  startSigningSessionResponseSchema,
  verifyAuthChallengeRequestSchema,
  verifyAuthChallengeResponseSchema,
} from "./signing";
