import { z } from "zod";

export type SigningOrder = "parallel" | "sequential";

export type SigningSessionStatus =
  | "draft"
  | "pending"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "expired";

export type SignerAuthMethod = "none" | "email" | "phone" | "both";

export type SignerAssignmentStatus =
  | "pending"
  | "invited"
  | "viewed"
  | "authenticating"
  | "ready"
  | "signing"
  | "signed"
  | "declined";

export type SignatureCaptureType = "draw" | "type" | "upload";

export interface SigningSessionSettings {
  allowDecline?: boolean;
  allowPrintAndSign?: boolean;
  requireEmailVerification?: boolean;
  requirePhoneVerification?: boolean;
  requireBoth?: boolean;
}

export interface CreateSigningSessionRequest {
  documentId: string;
  signingOrder: SigningOrder;
  expiresAt?: number;
  reminderIntervalHours?: number;
  settings?: SigningSessionSettings;
}

export interface CreateSigningSessionResponse {
  sessionId: string;
  reused: boolean;
}

export interface AssignSignerRequest {
  slotId?: string;
  partyId?: string;
  email: string;
  phone?: string;
  phoneCountryCode?: string;
  legalName: string;
  role: string;
  color?: string;
  order: number;
  authMethod: SignerAuthMethod;
}

export interface AssignSignerResponse {
  assignmentId: string;
  reused: boolean;
}

export interface StartSigningSessionResponse {
  success: boolean;
  signerCount: number;
  alreadyStarted: boolean;
}

export interface SigningSessionSignerSummary {
  id: string;
  legalName: string;
  email: string;
  role: string;
  status: SignerAssignmentStatus;
  signedAt?: number;
}

export interface SigningSessionSummary {
  _id: string;
  documentId: string;
  status: SigningSessionStatus;
  signingOrder: SigningOrder;
  currentSignerIndex?: number;
  expiresAt?: number;
  reminderIntervalHours?: number;
  completedAt?: number;
  completedHash?: string;
  initiatedAt: number;
  updatedAt: number;
  settings?: SigningSessionSettings;
  signers: SigningSessionSignerSummary[];
}

export interface RecordSignerViewRequest {
  metadata: {
    ipAddress: string;
    userAgent: string;
    deviceFingerprint?: string;
  };
}

export interface RecordSignerViewResponse {
  assignmentId: string;
  documentId: string;
  legalName: string;
  role: string;
  authMethod: SignerAuthMethod;
  needsEmailVerification: boolean;
  needsPhoneVerification: boolean;
}

export interface SendAuthChallengeRequest {
  type: "email" | "phone";
}

export interface SendAuthChallengeResponse {
  challengeId: string;
  sentTo: string;
  expiresAt: number;
}

export interface VerifyAuthChallengeRequest {
  code: string;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
  };
}

export interface VerifyAuthChallengeResponse {
  verified: boolean;
  isFullyVerified: boolean;
  needsAdditionalVerification: boolean;
}

export interface SaveFieldValueRequest {
  blockId: string;
  value: string;
}

export interface SaveFieldValueResponse {
  blockId: string;
  stored: boolean;
}

export interface RecordSignatureRequest {
  blockId: string;
  signatureType: SignatureCaptureType;
  signatureData: string;
  metadata: {
    ipAddress: string;
    userAgent: string;
    deviceFingerprint?: string;
    geolocation?: {
      country: string;
      region: string;
      city: string;
    };
  };
}

export interface RecordSignatureResponse {
  signatureId: string;
}

export interface CompleteSignerSessionResponse {
  completed: boolean;
  sessionStatus: SigningSessionStatus;
}

export interface SignerPortalView {
  assignmentId: string;
  documentId: string;
  documentTitle: string;
  documentContent?: string;
  signerName: string;
  partyName: string;
  partyColor: string;
  status: SignerAssignmentStatus;
  emailVerified: boolean;
  phoneVerified: boolean;
  maskedEmail: string;
  maskedPhone?: string;
  assignedBlocks: unknown[];
  fieldValues: Record<string, string>;
  settings: {
    requireEmailVerification: boolean;
    requirePhoneVerification: boolean;
    requireBoth: boolean;
  };
  signer: {
    legalName: string;
    role: string;
    status: SignerAssignmentStatus;
    emailVerified: boolean;
    phoneVerified: boolean;
    authMethod: SignerAuthMethod;
  };
  session: {
    status: SigningSessionStatus;
    signingOrder: SigningOrder;
  };
}

export interface SignerPortalExpired {
  error: "expired";
}

const signingOrderSchema = z.enum(["parallel", "sequential"]);
const signingSessionStatusSchema = z.enum([
  "draft",
  "pending",
  "in_progress",
  "completed",
  "cancelled",
  "expired",
]);
const signerAuthMethodSchema = z.enum(["none", "email", "phone", "both"]);
const signerAssignmentStatusSchema = z.enum([
  "pending",
  "invited",
  "viewed",
  "authenticating",
  "ready",
  "signing",
  "signed",
  "declined",
]);
const signatureCaptureTypeSchema = z.enum(["draw", "type", "upload"]);

const signingSessionSettingsSchema = z.object({
  allowDecline: z.boolean().optional(),
  allowPrintAndSign: z.boolean().optional(),
  requireEmailVerification: z.boolean().optional(),
  requirePhoneVerification: z.boolean().optional(),
  requireBoth: z.boolean().optional(),
});

const optionalStringSchema = z.string().nullish().transform((value) => value ?? undefined);
const optionalNumberSchema = z.number().nullish().transform((value) => value ?? undefined);

export const createSigningSessionRequestSchema = z.object({
  documentId: z.string(),
  signingOrder: signingOrderSchema,
  expiresAt: z.number().optional(),
  reminderIntervalHours: z.number().optional(),
  settings: signingSessionSettingsSchema.optional(),
});

export const createSigningSessionResponseSchema = z.object({
  sessionId: z.string(),
  reused: z.boolean(),
});

export const assignSignerRequestSchema = z.object({
  slotId: optionalStringSchema,
  partyId: optionalStringSchema,
  email: z.string().email(),
  phone: optionalStringSchema,
  phoneCountryCode: optionalStringSchema,
  legalName: z.string().min(2),
  role: z.string().min(1),
  color: optionalStringSchema,
  order: z.number().int().nonnegative(),
  authMethod: signerAuthMethodSchema,
});

export const assignSignerResponseSchema = z.object({
  assignmentId: z.string(),
  reused: z.boolean(),
});

export const startSigningSessionResponseSchema = z.object({
  success: z.boolean(),
  signerCount: z.number().int().nonnegative(),
  alreadyStarted: z.boolean(),
});

export const signingSessionSummarySchema = z.object({
  _id: z.string(),
  documentId: z.string(),
  status: signingSessionStatusSchema,
  signingOrder: signingOrderSchema,
  currentSignerIndex: optionalNumberSchema,
  expiresAt: optionalNumberSchema,
  reminderIntervalHours: optionalNumberSchema,
  completedAt: optionalNumberSchema,
  completedHash: optionalStringSchema,
  initiatedAt: z.number(),
  updatedAt: z.number(),
  settings: signingSessionSettingsSchema.optional(),
  signers: z.array(
    z.object({
      id: z.string(),
      legalName: z.string(),
      email: z.string(),
      role: z.string(),
      status: signerAssignmentStatusSchema,
      signedAt: optionalNumberSchema,
    })
  ),
});

export const recordSignerViewRequestSchema = z.object({
  metadata: z.object({
    ipAddress: z.string(),
    userAgent: z.string(),
    deviceFingerprint: z.string().optional(),
  }),
});

export const recordSignerViewResponseSchema = z.object({
  assignmentId: z.string(),
  documentId: z.string(),
  legalName: z.string(),
  role: z.string(),
  authMethod: signerAuthMethodSchema,
  needsEmailVerification: z.boolean(),
  needsPhoneVerification: z.boolean(),
});

export const sendAuthChallengeRequestSchema = z.object({
  type: z.enum(["email", "phone"]),
});

export const sendAuthChallengeResponseSchema = z.object({
  challengeId: z.string(),
  sentTo: z.string(),
  expiresAt: z.number(),
});

export const verifyAuthChallengeRequestSchema = z.object({
  code: z.string().length(6),
  metadata: z
    .object({
      ipAddress: z.string().optional(),
      userAgent: z.string().optional(),
    })
    .optional(),
});

export const verifyAuthChallengeResponseSchema = z.object({
  verified: z.boolean(),
  isFullyVerified: z.boolean(),
  needsAdditionalVerification: z.boolean(),
});

export const saveFieldValueRequestSchema = z.object({
  blockId: z.string(),
  value: z.string(),
});

export const saveFieldValueResponseSchema = z.object({
  blockId: z.string(),
  stored: z.boolean(),
});

export const recordSignatureRequestSchema = z.object({
  blockId: z.string(),
  signatureType: signatureCaptureTypeSchema,
  signatureData: z.string().min(1),
  metadata: z.object({
    ipAddress: z.string(),
    userAgent: z.string(),
    deviceFingerprint: z.string().optional(),
    geolocation: z
      .object({
        country: z.string(),
        region: z.string(),
        city: z.string(),
      })
      .optional(),
  }),
});

export const recordSignatureResponseSchema = z.object({
  signatureId: z.string(),
});

export const completeSignerSessionResponseSchema = z.object({
  completed: z.boolean(),
  sessionStatus: signingSessionStatusSchema,
});

export const signerPortalViewSchema = z.object({
  assignmentId: z.string(),
  documentId: z.string(),
  documentTitle: z.string(),
  documentContent: optionalStringSchema,
  signerName: z.string(),
  partyName: z.string(),
  partyColor: z.string(),
  status: signerAssignmentStatusSchema,
  emailVerified: z.boolean(),
  phoneVerified: z.boolean(),
  maskedEmail: z.string(),
  maskedPhone: optionalStringSchema,
  assignedBlocks: z.array(z.unknown()),
  fieldValues: z.record(z.string(), z.string()),
  settings: z.object({
    requireEmailVerification: z.boolean(),
    requirePhoneVerification: z.boolean(),
    requireBoth: z.boolean(),
  }),
  signer: z.object({
    legalName: z.string(),
    role: z.string(),
    status: signerAssignmentStatusSchema,
    emailVerified: z.boolean(),
    phoneVerified: z.boolean(),
    authMethod: signerAuthMethodSchema,
  }),
  session: z.object({
    status: signingSessionStatusSchema,
    signingOrder: signingOrderSchema,
  }),
});

export const signerPortalExpiredSchema = z.object({
  error: z.literal("expired"),
});

export const signerPortalResponseSchema = z.union([
  signerPortalViewSchema,
  signerPortalExpiredSchema,
]);

export function parseCreateSigningSessionRequest(value: unknown): CreateSigningSessionRequest {
  return createSigningSessionRequestSchema.parse(value);
}

export function parseCreateSigningSessionResponse(value: unknown): CreateSigningSessionResponse {
  return createSigningSessionResponseSchema.parse(value);
}

export function parseAssignSignerRequest(value: unknown): AssignSignerRequest {
  return assignSignerRequestSchema.parse(value);
}

export function parseAssignSignerResponse(value: unknown): AssignSignerResponse {
  return assignSignerResponseSchema.parse(value);
}

export function parseStartSigningSessionResponse(value: unknown): StartSigningSessionResponse {
  return startSigningSessionResponseSchema.parse(value);
}

export function parseSigningSessionSummary(value: unknown): SigningSessionSummary {
  return signingSessionSummarySchema.parse(value);
}

export function parseRecordSignerViewRequest(value: unknown): RecordSignerViewRequest {
  return recordSignerViewRequestSchema.parse(value);
}

export function parseRecordSignerViewResponse(value: unknown): RecordSignerViewResponse {
  return recordSignerViewResponseSchema.parse(value);
}

export function parseSendAuthChallengeRequest(value: unknown): SendAuthChallengeRequest {
  return sendAuthChallengeRequestSchema.parse(value);
}

export function parseSendAuthChallengeResponse(value: unknown): SendAuthChallengeResponse {
  return sendAuthChallengeResponseSchema.parse(value);
}

export function parseVerifyAuthChallengeRequest(value: unknown): VerifyAuthChallengeRequest {
  return verifyAuthChallengeRequestSchema.parse(value);
}

export function parseVerifyAuthChallengeResponse(value: unknown): VerifyAuthChallengeResponse {
  return verifyAuthChallengeResponseSchema.parse(value);
}

export function parseSaveFieldValueRequest(value: unknown): SaveFieldValueRequest {
  return saveFieldValueRequestSchema.parse(value);
}

export function parseSaveFieldValueResponse(value: unknown): SaveFieldValueResponse {
  return saveFieldValueResponseSchema.parse(value);
}

export function parseRecordSignatureRequest(value: unknown): RecordSignatureRequest {
  return recordSignatureRequestSchema.parse(value);
}

export function parseRecordSignatureResponse(value: unknown): RecordSignatureResponse {
  return recordSignatureResponseSchema.parse(value);
}

export function parseCompleteSignerSessionResponse(
  value: unknown
): CompleteSignerSessionResponse {
  return completeSignerSessionResponseSchema.parse(value);
}

export function parseSignerPortalResponse(
  value: unknown
): SignerPortalView | SignerPortalExpired {
  return signerPortalResponseSchema.parse(value);
}
