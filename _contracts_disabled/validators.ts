// Living Contract System - Zod v4 Validators
// Validation schemas for runtime type checking and API contracts

import { z } from 'zod';

// ============================================================================
// CORE TYPE VALIDATORS
// ============================================================================

export const envelopeStatusSchema = z.enum([
  'draft',
  'in_review',
  'pending_signature',
  'partially_signed',
  'fully_signed',
  'active',
  'expired',
  'terminated',
  'archived',
]);

export const contractCategorySchema = z.enum([
  'financial',
  'healthcare',
  'employment',
  'commercial',
  'consumer',
  'real_estate',
  'intellectual_property',
  'service_agreement',
  'other',
]);

export const jurisdictionSchema = z.enum(['US', 'EU', 'UK', 'CA', 'AU', 'other']);

export const signatureTypeSchema = z.enum(['SES', 'AES', 'QES', 'US_ESIGN']);

export const partyRoleSchema = z.enum([
  'author',
  'counterparty',
  'witness',
  'notary',
  'approver',
  'viewer',
]);

// ============================================================================
// API BINDING VALIDATORS
// ============================================================================

export const apiAuthenticationSchema = z.enum(['none', 'apiKey', 'oauth', 'jwt', 'basic']);

export const apiMethodSchema = z.enum(['GET', 'POST', 'PUT']);

export const apiBindingSchema = z.object({
  endpoint: z.string().url('API endpoint must be a valid URL'),
  method: apiMethodSchema,
  authentication: apiAuthenticationSchema,
  headers: z.record(z.string()).optional(),
  transform: z.string().min(1, 'Transform expression is required'),
  fallback: z.any(),
});

// ============================================================================
// LIVE BLOCK VALIDATORS
// ============================================================================

export const blockTypeSchema = z.enum([
  'paragraph',
  'heading',
  'table',
  'list',
  'signature',
  'liveData',
  'image',
  'custom',
]);

export const blockAttrsSchema = z.object({
  title: z.string().optional(),
  isEditable: z.boolean(),
  isRequired: z.boolean(),
  mustBeReviewed: z.boolean(),
  isLive: z.boolean(),
  apiSource: apiBindingSchema.optional(),
  dataSchema: z.string().optional(), // Zod schema as string
  syncInterval: z.number().int().positive().optional(),
  className: z.string().optional(),
  style: z.record(z.any()).optional(),
});

export const blockSchema = z.object({
  blockId: z.string().uuid('Block ID must be a valid UUID'),
  type: blockTypeSchema,
  parentBlockId: z.string().uuid().optional(),
  childBlockIds: z.array(z.string().uuid()),
  depth: z.number().int().min(0).max(10, 'Maximum nesting depth is 10'),
  position: z.number().int().min(0),
  content: z.any(), // ProseMirror JSON
  attrs: blockAttrsSchema,
  hash: z.string().regex(/^[a-f0-9]{64}$/, 'Hash must be a SHA-256 hex string'),
  version: z.number().int().positive(),
});

// ============================================================================
// PARTY & SIGNATURE VAL IDATORS
// ============================================================================

export const partySchema = z.object({
  partyId: z.string().uuid(),
  role: partyRoleSchema,
  userId: z.string().optional(),
  name: z.string().min(1, 'Party name is required'),
  email: z.string().email('Invalid email address'),
  organization: z.string().optional(),
  signatureRequired: z.boolean(),
  signedAt: z.number().int().positive().optional(),
  signatureType: signatureTypeSchema.optional(),
});

export const eudiWalletSchema = z.object({
  eudiWalletId: z.string(),
  certificateChain: z.array(z.string()),
  timestampAuthority: z.string().url(),
  qscdUsed: z.boolean(),
});

export const esignConsentSchema = z.object({
  consentGiven: z.boolean(),
  consentText: z.string(),
  deviceCapabilities: z.object({
    deviceType: z.string(),
    browserCapable: z.boolean(),
    pdfViewerAvailable: z.boolean(),
  }),
});

export const signatureSchema = z.object({
  envelopeId: z.string(),
  partyId: z.string().uuid(),
  userId: z.string().optional(),
  type: signatureTypeSchema,
  signatureValue: z.string().base64(),
  signatureHash: z.string().regex(/^[a-f0-9]{64}$/),
  snapshotId: z.string(),
  merkleRootAtSigning: z.string().regex(/^[a-f0-9]{64}$/),
  documentHashAtSigning: z.string().regex(/^[a-f0-9]{64}$/),
  eudiWallet: eudiWalletSchema.optional(),
  esignConsent: esignConsentSchema.optional(),
  signedAt: z.number().int().positive(),
  ipAddress: z.string().ip(),
  deviceFingerprint: z.string().optional(),
  userAgent: z.string(),
  geolocation: z.object({
    country: z.string(),
    region: z.string(),
    city: z.string(),
  }).optional(),
});

// ============================================================================
// ENVELOPE VALIDATORS
// ============================================================================

export const liveBlockManifestItemSchema = z.object({
  blockId: z.string().uuid(),
  apiBindingHash: z.string().regex(/^[a-f0-9]{64}$/),
  syncInterval: z.number().int().positive(),
  lastSync: z.number().int().positive().optional(),
  lastSyncStatus: z.enum(['success', 'failed', 'pending']).optional(),
});

export const envelopeSchema = z.object({
  title: z.string().min(1, 'Envelope title is required').max(255),
  description: z.string().optional(),
  envelopeNumber: z.string().regex(/^ENV-\d{4}-\d+$/, 'Invalid envelope number format'),
  templateId: z.string().optional(),
  status: envelopeStatusSchema,
  category: contractCategorySchema,
  jurisdiction: jurisdictionSchema,
  documentJSON: z.any(), // Tiptap JSON
  yState: z.instanceof(Uint8Array).optional(),
  merkleRoot: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  coreTermsHash: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  liveBlocks: z.array(liveBlockManifestItemSchema),
  parties: z.array(partySchema).min(2, 'At least two parties are required'),
  retentionPolicy: z.string().optional(),
  retentionYears: z.number().int().positive().max(100).optional(),
  retentionUntil: z.number().int().positive().optional(),
  canDelete: z.boolean(),
  effectiveDate: z.number().int().positive().optional(),
  expirationDate: z.number().int().positive().optional(),
  renewalDate: z.number().int().positive().optional(),
  createdBy: z.string(),
  createdAt: z.number().int().positive(),
  updatedBy: z.string(),
  updatedAt: z.number().int().positive(),
  isDeleted: z.boolean(),
  deletedAt: z.number().int().positive().optional(),
  deletedBy: z.string().optional(),
});

// ============================================================================
// TEMPLATE VALIDATORS
// ============================================================================

export const requiredClauseSchema = z.object({
  clauseId: z.string().uuid(),
  title: z.string().min(1),
  legalText: z.string().min(1),
  isMandatory: z.boolean(),
  jurisdictionSpecific: z.boolean(),
  position: z.number().int().min(0),
});

export const templateVariableSchema = z.object({
  variableId: z.string().uuid(),
  name: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Invalid variable name'),
  type: z.enum(['text', 'number', 'date', 'currency', 'email', 'phone', 'address', 'select', 'multiselect']),
  defaultValue: z.any().optional(),
  validationSchema: z.string().optional(), // Zod schema as string
  isRequired: z.boolean(),
  helpText: z.string().optional(),
});

export const complianceMetadataSchema = z.object({
  regulations: z.array(z.string()).min(1, 'At least one regulation must be specified'),
  retentionYears: z.number().int().positive().max(100),
  signatureType: signatureTypeSchema,
  requiresNotary: z.boolean(),
  requiresWitness: z.boolean(),
});

export const templateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be semantic (e.g., 1.0.0)'),
  parentTemplateId: z.string().optional(),
  isLatestVersion: z.boolean(),
  category: contractCategorySchema,
  jurisdiction: jurisdictionSchema,
  structure: z.any(), // Tiptap JSON
  requiredClauses: z.array(requiredClauseSchema),
  variables: z.array(templateVariableSchema),
  rootBlockIds: z.array(z.string().uuid()),
  compliance: complianceMetadataSchema,
  isPublished: z.boolean(),
  publishedAt: z.number().int().positive().optional(),
  publishedBy: z.string().optional(),
  isPublic: z.boolean(),
  organizationId: z.string().optional(),
  createdBy: z.string(),
  createdAt: z.number().int().positive(),
  updatedBy: z.string(),
  updatedAt: z.number().int().positive(),
  isDeleted: z.boolean(),
  deletedAt: z.number().int().positive().optional(),
});

// ============================================================================
// SNAPSHOT VALIDATORS
// ============================================================================

export const snapshotEventTypeSchema = z.enum([
  'draft_save',
  'review_milestone',
  'signature_event',
  'amendment',
  'manual_snapshot',
]);

export const contractSnapshotSchema = z.object({
  envelopeId: z.string(),
  snapshotId: z.string().uuid(),
  eventType: snapshotEventTypeSchema,
  yStateVector: z.instanceof(Uint8Array),
  documentJSON: z.any(),
  merkleRoot: z.string().regex(/^[a-f0-9]{64}$/),
  coreTermsHash: z.string().regex(/^[a-f0-9]{64}$/),
  blockHashes: z.record(z.string().uuid(), z.string().regex(/^[a-f0-9]{64}$/)),
  liveBlockStates: z.record(z.string().uuid(), z.any()),
  signedBy: z.array(z.string()).optional(),
  signatureHashes: z.array(z.string().regex(/^[a-f0-9]{64}$/)).optional(),
  parentSnapshotId: z.string().uuid().optional(),
  createdBy: z.string(),
  createdAt: z.number().int().positive(),
  description: z.string().optional(),
});

// ============================================================================
// AUDIT LOG VALIDATORS
// ============================================================================

export const auditActionSchema = z.enum([
  'created',
  'viewed',
  'edited',
  'commented',
  'approved',
  'rejected',
  'signed',
  'downloaded',
  'shared',
  'deleted',
  'restored',
  'api_sync',
  'exported_pdf',
  'sent_for_signature',
]);

export const auditMetadataSchema = z.object({
  ipAddress: z.string().ip(),
  userAgent: z.string(),
  deviceFingerprint: z.string().optional(),
  geolocation: z.object({
    country: z.string(),
    region: z.string(),
    city: z.string(),
  }).optional(),
  sessionId: z.string().uuid().optional(),
});

export const auditLogEntrySchema = z.object({
  envelopeId: z.string().optional(),
  templateId: z.string().optional(),
  blockId: z.string().uuid().optional(),
  userId: z.string(),
  userEmail: z.string().email(),
  userRole: partyRoleSchema,
  action: auditActionSchema,
  changeDetails: z.object({
    before: z.any().optional(),
    after: z.any().optional(),
    diff: z.string().optional(),
  }).optional(),
  metadata: auditMetadataSchema,
  reason: z.string().optional(),
  timestamp: z.number().int().positive(),
});

// ============================================================================
// WEBHOOK VALIDATORS
// ============================================================================

export const webhookEventSchema = z.enum([
  'envelope.created',
  'envelope.updated',
  'envelope.signed',
  'envelope.fully_signed',
  'envelope.expired',
  'envelope.renewed',
  'block.api_sync_failed',
  'signature.requested',
  'comment.added',
  'review.completed',
  'amendment.created',
]); 

export const webhookSubscriptionSchema = z.object({
  webhookUrl: z.string().url('Webhook URL must be valid'),
  secret: z.string().min(32, 'Secret must be at least 32 characters'),
  envelopeId: z.string().optional(),
  organizationId: z.string().optional(),
  events: z.array(webhookEventSchema).min(1, 'At least one event must be selected'),
  isActive: z.boolean(),
  lastTriggered: z.number().int().positive().optional(),
  failureCount: z.number().int().min(0),
  createdBy: z.string(),
  createdAt: z.number().int().positive(),
});

// ============================================================================
// INPUT VALIDATORS (For API Endpoints)
// ============================================================================

export const createEnvelopeInputSchema = envelopeSchema.omit({
  envelopeNumber: true,
  createdAt: true,
  updatedAt: true,
  isDeleted: true,
  merkleRoot: true,
  coreTermsHash: true,
}).extend({
  title: z.string().min(1).max(255),
  category: contractCategorySchema,
  jurisdiction: jurisdictionSchema,
});

export const createTemplateInputSchema = templateSchema.omit({
  createdAt: true,
  updatedAt: true,
  isDeleted: true,
  isPublished: true,
  publishedAt: true,
  publishedBy: true,
}).extend({
  name: z.string().min(1).max(255),
  description: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
});

export const signEnvelopeInputSchema = z.object({
  envelopeId: z.string(),
  partyId: z.string().uuid(),
  signatureType: signatureTypeSchema,
  signatureValue: z.string().base64(),
  eudiWalletId: z.string().optional(),
  consentGiven: z.boolean().refine((val) => val === true, {
    message: 'Consent must be explicitly given',
  }),
});

export const updateBlockInputSchema = z.object({
  blockId: z.string().uuid(),
  content: z.any(), // ProseMirror JSON
  attrs: blockAttrsSchema.partial(),
});

export const syncLiveBlockInputSchema = z.object({
  envelopeId: z.string(),
  blockId: z.string().uuid(),
  syncedData: z.any(),
  syncStatus: z.enum(['success', 'failed']),
  errorMessage: z.string().optional(),
});

// ============================================================================
// RETENTION POLICY VALIDATORS
// ============================================================================

export const retentionPolicySchema = z.object({
  regulation: z.enum(['SOX', 'HIPAA', 'GDPR', 'FLSA', 'UCC', 'CCPA']),
  years: z.number().int().positive().max(100),
});

export const retentionPoliciesSchema = z.record(
  contractCategorySchema,
  retentionPolicySchema
);

// ============================================================================
// MERKLE TREE VALIDATORS
// ============================================================================

export const merkleProofSchema = z.object({
  blockId: z.string().uuid(),
  blockHash: z.string().regex(/^[a-f0-9]{64}$/),
  siblingHashes: z.array(z.string().regex(/^[a-f0-9]{64}$/)),
  rootHash: z.string().regex(/^[a-f0-9]{64}$/),
});

export const merkleTreeSchema = z.object({
  rootHash: z.string().regex(/^[a-f0-9]{64}$/),
  leafHashes: z.array(z.string().regex(/^[a-f0-9]{64}$/)),
  depth: z.number().int().positive(),
  totalBlocks: z.number().int().positive(),
});

// ============================================================================
// TYPE EXPORTS (Inferred from Zod schemas)
// ============================================================================

export type EnvelopeStatus = z.infer<typeof envelopeStatusSchema>;
export type ContractCategory = z.infer<typeof contractCategorySchema>;
export type Jurisdiction = z.infer<typeof jurisdictionSchema>;
export type SignatureType = z.infer<typeof signatureTypeSchema>;
export type PartyRole = z.infer<typeof partyRoleSchema>;
export type BlockType = z.infer<typeof blockTypeSchema>;
export type APIAuthentication = z.infer<typeof apiAuthenticationSchema>;
export type APIMethod = z.infer<typeof apiMethodSchema>;
export type APIBinding = z.infer<typeof apiBindingSchema>;
export type BlockAttrs = z.infer<typeof blockAttrsSchema>;
export type Block = z.infer<typeof blockSchema>;
export type Party = z.infer<typeof partySchema>;
export type Signature = z.infer<typeof signatureSchema>;
export type Envelope = z.infer<typeof envelopeSchema>;
export type Template = z.infer<typeof templateSchema>;
export type ContractSnapshot = z.infer<typeof contractSnapshotSchema>;
export type AuditLogEntry = z.infer<typeof auditLogEntrySchema>;
export type WebhookSubscription = z.infer<typeof webhookSubscriptionSchema>;
export type MerkleProof = z.infer<typeof merkleProofSchema>;
export type MerkleTree = z.infer<typeof merkleTreeSchema>;

// Input types
export type CreateEnvelopeInput = z.infer<typeof createEnvelopeInputSchema>;
export type CreateTemplateInput = z.infer<typeof createTemplateInputSchema>;
export type SignEnvelopeInput = z.infer<typeof signEnvelopeInputSchema>;
export type UpdateBlockInput = z.infer<typeof updateBlockInputSchema>;
export type SyncLiveBlockInput = z.infer<typeof syncLiveBlockInputSchema>;
