// Living Contract System - Hierarchical Schema
// Uses Zod v4 for validation and convex-helpers for patterns

import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

/**
 * HIERARCHICAL STRUCTURE:
 * 
 * Envelope (Contract Container)
 *   └── Template (Reusable Structure)
 *        └── Block (Hierarchical Content)
 *             └── Child Blocks (Nested Content)
 * 
 * Each level maintains parent-child relationships for robust tree traversal.
 */

export default defineSchema({
  // ============================================================================
  // TOP LEVEL: ENVELOPES (Contract Containers)
  // ============================================================================
  envelopes: defineTable({
    // Identity
    title: v.string(),
    description: v.optional(v.string()),
    envelopeNumber: v.string(), // e.g., "ENV-2026-001"
    
    // Hierarchy: References template it was created from
    templateId: v.optional(v.id('templates')),
    
    // Status machine
    status: v.union(
      v.literal('draft'),
      v.literal('in_review'),
      v.literal('pending_signature'),
      v.literal('partially_signed'),
      v.literal('fully_signed'),
      v.literal('active'),
      v.literal('expired'),
      v.literal('terminated'),
      v.literal('archived')
    ),
    
    // Legal classification
    category: v.union(
      v.literal('financial'),
      v.literal('healthcare'),
      v.literal('employment'),
      v.literal('commercial'),
      v.literal('consumer'),
      v.literal('real_estate'),
      v.literal('intellectual_property'),
      v.literal('service_agreement'),
      v.literal('other')
    ),
    jurisdiction: v.union(
      v.literal('US'),
      v.literal('EU'),
      v.literal('UK'),
      v.literal('CA'),
      v.literal('AU'),
      v.literal('other')
    ),
    
    // Document state (Tiptap + Yjs)
    documentJSON: v.any(), // Full Tiptap JSON content
    yState: v.optional(v.bytes()), // Yjs CRDT state for collaboration
    
    // Cryptographic integrity
    merkleRoot: v.optional(v.string()), // Root hash of all blocks
    coreTermsHash: v.optional(v.string()), // Hash of only frozen blocks
    
    // Live blocks manifest
    liveBlocks: v.array(v.object({
      blockId: v.string(),
      apiBindingHash: v.string(), // Hash of API config (not data)
      syncInterval: v.number(), // milliseconds
      lastSync: v.optional(v.number()), // timestamp
      lastSyncStatus: v.optional(v.union(
        v.literal('success'),
        v.literal('failed'),
        v.literal('pending')
      )),
    })),
    
    // Parties involved
    parties: v.array(v.object({
      partyId: v.string(), // Unique ID for this party in this envelope
      role: v.union(
        v.literal('author'),
        v.literal('counterparty'),
        v.literal('witness'),
        v.literal('notary'),
        v.literal('approver'),
        v.literal('viewer')
      ),
      userId: v.optional(v.id('users')),
      name: v.string(),
      email: v.string(),
      organization: v.optional(v.string()),
      signatureRequired: v.boolean(),
      signedAt: v.optional(v.number()),
      signatureType: v.optional(v.union(
        v.literal('SES'),
        v.literal('AES'),
        v.literal('QES'),
        v.literal('US_ESIGN')
      )),
    })),
    
    // Compliance & retention
    retentionPolicy: v.optional(v.string()), // e.g., 'SOX', 'HIPAA'
    retentionYears: v.optional(v.number()),
    retentionUntil: v.optional(v.number()), // timestamp
    canDelete: v.boolean(),
    
    // Important dates
    effectiveDate: v.optional(v.number()),
    expirationDate: v.optional(v.number()),
    renewalDate: v.optional(v.number()),
    
    // Metadata
    createdBy: v.id('users'),
    createdAt: v.number(),
    updatedBy: v.id('users'),
    updatedAt: v.number(),
    
    // Soft delete
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
    deletedBy: v.optional(v.id('users')),
  })
    .index('by_status', ['status', 'createdAt'])
    .index('by_category', ['category', 'createdAt'])
    .index('by_creator', ['createdBy', 'createdAt'])
    .index('by_template', ['templateId', 'createdAt'])
    .index('by_envelope_number', ['envelopeNumber'])
    .index('by_effective_date', ['effectiveDate'])
    .index('by_expiration_date', ['expirationDate'])
    .searchIndex('search_title', {
      searchField: 'title',
      filterFields: ['status', 'category', 'isDeleted'],
    }),

  // ============================================================================
  // TEMPLATES (Reusable Contract Structures)
  // ============================================================================
  templates: defineTable({
    // Identity
    name: v.string(),
    description: v.string(),
    version: v.string(), // Semantic versioning: "1.2.3"
    
    // Hierarchy: Parent template for versioning
    parentTemplateId: v.optional(v.id('templates')),
    isLatestVersion: v.boolean(),
    
    // Classification
    category: v.union(
      v.literal('financial'),
      v.literal('healthcare'),
      v.literal('employment'),
      v.literal('commercial'),
      v.literal('consumer'),
      v.literal('real_estate'),
      v.literal('intellectual_property'),
      v.literal('service_agreement'),
      v.literal('other')
    ),
    jurisdiction: v.union(
      v.literal('US'),
      v.literal('EU'),
      v.literal('UK'),
      v.literal('CA'),
      v.literal('AU'),
      v.literal('other')
    ),
    
    // Template structure (serialized Tiptap JSON)
    structure: v.any(), // Base Tiptap document structure
    
    // Required clauses (legal compliance)
    requiredClauses: v.array(v.object({
      clauseId: v.string(),
      title: v.string(),
      legalText: v.string(),
      isMandatory: v.boolean(),
      jurisdictionSpecific: v.boolean(),
      position: v.number(), // Order in document
    })),
    
    // Variable placeholders
    variables: v.array(v.object({
      variableId: v.string(),
      name: v.string(),
      type: v.union(
        v.literal('text'),
        v.literal('number'),
        v.literal('date'),
        v.literal('currency'),
        v.literal('email'),
        v.literal('phone'),
        v.literal('address'),
        v.literal('select'),
        v.literal('multiselect')
      ),
      defaultValue: v.optional(v.any()),
      validationSchema: v.optional(v.string()), // Zod schema as string
      isRequired: v.boolean(),
      helpText: v.optional(v.string()),
    })),
    
    // Block hierarchy (top-level blocks in template)
    rootBlockIds: v.array(v.string()), // References to top-level blocks
    
    // Compliance metadata
    compliance: v.object({
      regulations: v.array(v.string()), // ['SOX', 'GDPR', 'HIPAA']
      retentionYears: v.number(),
      signatureType: v.union(
        v.literal('SES'),
        v.literal('AES'),
        v.literal('QES'),
        v.literal('US_ESIGN')
      ),
      requiresNotary: v.boolean(),
      requiresWitness: v.boolean(),
    }),
    
    // Publishing
    isPublished: v.boolean(),
    publishedAt: v.optional(v.number()),
    publishedBy: v.optional(v.id('users')),
    
    // Access control
    isPublic: v.boolean(),
    organizationId: v.optional(v.id('organizations')),
    
    // Metadata
    createdBy: v.id('users'),
    createdAt: v.number(),
    updatedBy: v.id('users'),
    updatedAt: v.number(),
    
    // Soft delete
    isDeleted: v.boolean(),
    deletedAt: v.optional(v.number()),
  })
    .index('by_category', ['category', 'isPublished', 'isLatestVersion'])
    .index('by_organization', ['organizationId', 'isPublished'])
    .index('by_creator', ['createdBy', 'createdAt'])
    .index('by_parent', ['parentTemplateId', 'version'])
    .searchIndex('search_name', {
      searchField: 'name',
      filterFields: ['category', 'isPublished', 'isDeleted'],
    }),

  // ============================================================================
  // BLOCKS (Hierarchical Content Nodes)
  // ============================================================================
  blocks: defineTable({
    // Identity
    blockId: v.string(), // Unique ID for this block
    type: v.union(
      v.literal('paragraph'),
      v.literal('heading'),
      v.literal('table'),
      v.literal('list'),
      v.literal('signature'),
      v.literal('liveData'),
      v.literal('image'),
      v.literal('custom')
    ),
    
    // Hierarchy: Parent-child relationships
    envelopeId: v.optional(v.id('envelopes')),
    templateId: v.optional(v.id('templates')),
    parentBlockId: v.optional(v.string()), // Parent block (null = root)
    childBlockIds: v.array(v.string()), // Ordered array of child block IDs
    depth: v.number(), // Depth in tree (0 = root)
    position: v.number(), // Order among siblings
    
    // Content
    content: v.any(), // ProseMirror JSON content
    textContent: v.optional(v.string()), // Extracted text for search
    
    // Block attributes
    attrs: v.object({
      // Core attributes
      title: v.optional(v.string()),
      isEditable: v.boolean(),
      isRequired: v.boolean(),
      mustBeReviewed: v.boolean(),
      
      // Live data attributes
      isLive: v.boolean(),
      apiSource: v.optional(v.object({
        endpoint: v.string(),
        method: v.union(v.literal('GET'), v.literal('POST'), v.literal('PUT')),
        authentication: v.union(
          v.literal('none'),
          v.literal('apiKey'),
          v.literal('oauth'),
          v.literal('jwt'),
          v.literal('basic')
        ),
        headers: v.optional(v.any()), // Custom headers
        transform: v.string(), // JS expression to transform response
        fallback: v.any(), // Default value if API fails
      })),
      dataSchema: v.optional(v.string()), // Zod schema as string
      syncInterval: v.optional(v.number()), // milliseconds
      
      // Styling
      className: v.optional(v.string()),
      style: v.optional(v.any()),
    }),
    
    // Cryptographic hash
    hash: v.string(), // SHA-256 hash of block content + attrs
    
    // State tracking
    lastModified: v.number(),
    modifiedBy: v.id('users'),
    version: v.number(), // Incremental version number
    
    // Soft delete
    isDeleted: v.boolean(),
  })
    .index('by_envelope', ['envelopeId', 'position'])
    .index('by_template', ['templateId', 'position'])
    .index('by_parent', ['parentBlockId', 'position'])
    .index('by_type', ['type', 'envelopeId'])
    .index('by_blockId', ['blockId']),

  // ============================================================================
  // SIGNATURES (Multi-party Signing)
  // ============================================================================
  signatures: defineTable({
    // References
    envelopeId: v.id('envelopes'),
    partyId: v.string(), // References party in envelope.parties
    userId: v.optional(v.id('users')),
    
    // Signature type (compliance)
    type: v.union(
      v.literal('SES'), // Simple Electronic Signature
      v.literal('AES'), // Advanced Electronic Signature
      v.literal('QES'), // Qualified Electronic Signature
      v.literal('US_ESIGN') // US ESIGN Act
    ),
    
    // Signature data
    signatureValue: v.string(), // Base64 encoded signature
    signatureHash: v.string(), // SHA-256 hash of signature
    
    // Snapshot at signing
    snapshotId: v.id('contractSnapshots'),
    merkleRootAtSigning: v.string(),
    documentHashAtSigning: v.string(),
    
    // eIDAS compliance (EU)
    eudiWalletId: v.optional(v.string()),
    certificateChain: v.optional(v.array(v.string())),
    timestampAuthority: v.optional(v.string()), // RFC 3161
    qscdUsed: v.optional(v.boolean()), // Qualified Signature Creation Device
    
    // ESIGN compliance (US)
    intentConfirmation: v.optional(v.object({
      clickedAgree: v.boolean(),
      timestamp: v.number(),
      uiElement: v.string(),
    })),
    electronicConsent: v.optional(v.object({
      consentGiven: v.boolean(),
      consentText: v.string(),
      deviceCapabilities: v.any(),
    })),
    
    // Metadata
    signedAt: v.number(),
    ipAddress: v.string(),
    deviceFingerprint: v.optional(v.string()),
    userAgent: v.string(),
    geolocation: v.optional(v.object({
      country: v.string(),
      region: v.string(),
      city: v.string(),
    })),
  })
    .index('by_envelope', ['envelopeId', 'signedAt'])
    .index('by_user', ['userId', 'signedAt'])
    .index('by_party', ['partyId', 'envelopeId']),

  // ============================================================================
  // CONTRACT SNAPSHOTS (Version History)
  // ============================================================================
  contractSnapshots: defineTable({
    // References
    envelopeId: v.id('envelopes'),
    snapshotId: v.string(), // Unique snapshot ID
    
    // Event type
    eventType: v.union(
      v.literal('draft_save'),
      v.literal('review_milestone'),
      v.literal('signature_event'),
      v.literal('amendment'),
      v.literal('manual_snapshot')
    ),
    
    // Snapshot data
    yStateVector: v.bytes(), // Yjs state vector
    documentJSON: v.any(), // Full Tiptap JSON at snapshot time
    
    // Cryptographic integrity
    merkleRoot: v.string(),
    coreTermsHash: v.string(),
    blockHashes: v.any(), // Map of blockId -> hash
    
    // Live block states captured
    liveBlockStates: v.any(), // Map of blockId -> captured data
    
    // Signature info (if signature event)
    signedBy: v.optional(v.array(v.id('users'))),
    signatureHashes: v.optional(v.array(v.string())),
    
    // Parent snapshot (for amendments)
    parentSnapshotId: v.optional(v.string()),
    
    // Metadata
    createdBy: v.id('users'),
    createdAt: v.number(),
    description: v.optional(v.string()),
  })
    .index('by_envelope', ['envelopeId', 'createdAt'])
    .index('by_event_type', ['eventType', 'createdAt'])
    .index('by_snapshot_id', ['snapshotId']),

  // ============================================================================
  // AUDIT LOG (Immutable Activity Trail)
  // ============================================================================
  auditLog: defineTable({
    // References
    envelopeId: v.optional(v.id('envelopes')),
    templateId: v.optional(v.id('templates')),
    blockId: v.optional(v.string()),
    
    // Actor
    userId: v.id('users'),
    userEmail: v.string(),
    userRole: v.union(
      v.literal('author'),
      v.literal('reviewer'),
      v.literal('signer'),
      v.literal('approver'),
      v.literal('viewer'),
      v.literal('admin')
    ),
    
    // Action
    action: v.union(
      v.literal('created'),
      v.literal('viewed'),
      v.literal('edited'),
      v.literal('commented'),
      v.literal('approved'),
      v.literal('rejected'),
      v.literal('signed'),
      v.literal('downloaded'),
      v.literal('shared'),
      v.literal('deleted'),
      v.literal('restored'),
      v.literal('api_sync'),
      v.literal('exported_pdf'),
      v.literal('sent_for_signature')
    ),
    
    // Change details
    changeDetails: v.optional(v.object({
      before: v.any(),
      after: v.any(),
      diff: v.optional(v.string()),
    })),
    
    // Context metadata
    metadata: v.object({
      ipAddress: v.string(),
      userAgent: v.string(),
      deviceFingerprint: v.optional(v.string()),
      geolocation: v.optional(v.object({
        country: v.string(),
        region: v.string(),
        city: v.string(),
      })),
      sessionId: v.optional(v.string()),
    }),
    
    // Optional reason/comment
    reason: v.optional(v.string()),
    
    // Timestamp (immutable)
    timestamp: v.number(),
  })
    .index('by_envelope', ['envelopeId', 'timestamp'])
    .index('by_template', ['templateId', 'timestamp'])
    .index('by_user', ['userId', 'timestamp'])
    .index('by_action', ['action', 'timestamp'])
    .index('by_timestamp', ['timestamp']),

  // ============================================================================
  // WEBHOOK SUBSCRIPTIONS (Event-Driven Notifications)
  // ============================================================================
  webhookSubscriptions: defineTable({
    // Target
    webhookUrl: v.string(),
    secret: v.string(), // For HMAC signature verification
    
    // Scope
    envelopeId: v.optional(v.id('envelopes')),
    organizationId: v.optional(v.id('organizations')),
    
    // Events to listen for
    events: v.array(v.union(
      v.literal('envelope.created'),
      v.literal('envelope.updated'),
      v.literal('envelope.signed'),
      v.literal('envelope.fully_signed'),
      v.literal('envelope.expired'),
      v.literal('envelope.renewed'),
      v.literal('block.api_sync_failed'),
      v.literal('signature.requested'),
      v.literal('comment.added'),
      v.literal('review.completed'),
      v.literal('amendment.created')
    )),
    
    // Status
    isActive: v.boolean(),
    lastTriggered: v.optional(v.number()),
    failureCount: v.number(),
    
    // Metadata
    createdBy: v.id('users'),
    createdAt: v.number(),
  })
    .index('by_envelope', ['envelopeId', 'isActive'])
    .index('by_organization', ['organizationId', 'isActive']),

  // ============================================================================
  // USERS (System Users)
  // ============================================================================
  users: defineTable({
    // Identity
    email: v.string(),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
    
    // Authentication
    workosUserId: v.optional(v.string()),
    
    // Organization
    organizationId: v.optional(v.id('organizations')),
    role: v.union(
      v.literal('owner'),
      v.literal('admin'),
      v.literal('member'),
      v.literal('viewer')
    ),
    
    // Metadata
    createdAt: v.number(),
    lastLoginAt: v.optional(v.number()),
  })
    .index('by_email', ['email'])
    .index('by_organization', ['organizationId', 'role'])
    .index('by_workos_user', ['workosUserId']),

  // ============================================================================
  // ORGANIZATIONS (Multi-tenant Support)
  // ============================================================================
  organizations: defineTable({
    name: v.string(),
    slug: v.string(),
    logoUrl: v.optional(v.string()),
    
    // Subscription tier
    tier: v.union(
      v.literal('free'),
      v.literal('pro'),
      v.literal('enterprise')
    ),
    
    // Limits
    maxEnvelopes: v.number(),
    maxUsers: v.number(),
    maxTemplates: v.number(),
    
    // Metadata
    createdAt: v.number(),
  })
    .index('by_slug', ['slug']),
});
