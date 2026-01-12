import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

import {
	aiTemplateMetadataValidator,
	auditMetadataValidator,
	blocksArrayValidator,
	documentSettingsValidator,
	fieldValuesValidator
} from './lib/schemas';

export default defineSchema(
	{
		// ═══════════════════════════════════════════════════════════════
		// USERS - Synced from Auth (Clerk or WorkOS)
		// ═══════════════════════════════════════════════════════════════
		users: defineTable({
			workosId: v.optional(v.string()), // New Auth Provider
			email: v.string(),
			name: v.optional(v.string()),
			imageUrl: v.optional(v.string()),

			// Branding
			brandLogoUrl: v.optional(v.string()),
			brandLogoPosition: v.optional(
				v.union(v.literal('left'), v.literal('center'), v.literal('right'))
			),
			brandEnabled: v.optional(v.boolean()),
			brandLogoColor: v.optional(v.string()), // Color tint for logo
			corporateModeEnabled: v.optional(v.boolean()), // Boring mode

			// Clock Settings
			clockEnabled: v.optional(v.boolean()),
			clockOpacity: v.optional(v.number()),
			clockSize: v.optional(v.string()), // "sm", "md", "lg", "xl"
			clockPosition: v.optional(
				v.union(v.literal('left'), v.literal('center'), v.literal('right'))
			),

			// Document Default Settings
			defaultPaperTexture: v.optional(v.string()),
			defaultPaperTextureOpacity: v.optional(v.number()),
			defaultShowMargins: v.optional(v.boolean()),
			defaultMarginVertical: v.optional(v.number()),
			defaultMarginHorizontal: v.optional(v.number()),

			// AI Writer Usage Tracking
			aiGenerationsThisMonth: v.optional(v.number()),
			aiGenerationResetDate: v.optional(v.string()), // ISO month "2025-12"

			// Inline AI Usage Tracking (separate limits)
			inlineAiUsesThisMonth: v.optional(v.number()),
			inlineAiUsesThisDay: v.optional(v.number()),
			inlineAiDayResetDate: v.optional(v.string()), // ISO date "2025-12-30"
			inlineAiMonthResetDate: v.optional(v.string()), // ISO month "2025-12"

			// Envelope Sending Limits
			envelopesSentThisMonth: v.optional(v.number()),
			envelopeMonthResetDate: v.optional(v.string()), // ISO month "2025-12"

			// Subscription Tier (modular tier system)
			subscriptionTier: v.optional(
				v.union(v.literal('free'), v.literal('pro'), v.literal('enterprise'), v.literal('custom'))
			),

			// Polar.sh Subscription Fields
			polarCustomerId: v.optional(v.string()),
			polarSubscriptionId: v.optional(v.string()),
			subscriptionStatus: v.optional(
				v.union(
					v.literal('active'),
					v.literal('canceled'),
					v.literal('past_due'),
					v.literal('trialing'),
					v.literal('incomplete'),
					v.literal('none')
				)
			),
			subscriptionExpiresAt: v.optional(v.number()),
			subscriptionProductId: v.optional(v.string()),

			// Terms of Service Acceptance
			termsAcceptedAt: v.optional(v.number()),
			termsVersion: v.optional(v.string()),

			// HyprSign Auto-Fill Profile
			autoFillProfile: v.optional(
				v.object({
					firstName: v.optional(v.string()),
					lastName: v.optional(v.string()),
					fullName: v.optional(v.string()),
					email: v.optional(v.string()),
					phoneNumber: v.optional(v.string()),
					phoneCountryCode: v.optional(v.string()),
					physicalAddress: v.optional(v.string()),
					city: v.optional(v.string()),
					state: v.optional(v.string()),
					zipCode: v.optional(v.string()),
					country: v.optional(v.string()),
					companyName: v.optional(v.string()),
					jobTitle: v.optional(v.string()),
					dateOfBirth: v.optional(v.string())
				})
			),

			// HyprSign Usage Tracking
			hyprSignUsesThisMonth: v.optional(v.number()),
			hyprSignMonthResetDate: v.optional(v.string()), // ISO month "2026-01"

			// Onboarding Flags
			autoFillOnboardingCompleted: v.optional(v.boolean()),
			hasCompletedPlanSelection: v.optional(v.boolean()), // True when user has chosen any plan (including free)

			createdAt: v.number(),
			lastSeenAt: v.number()
		})
			.index('by_workos_id', ['workosId'])
			.index('by_email', ['email']),

		// ═══════════════════════════════════════════════════════════════
		// DOCUMENTS - User's created documents
		// ═══════════════════════════════════════════════════════════════
		documents: defineTable({
			ownerId: v.id('users'),
			title: v.string(),
			content: v.string(),
			// 2025-12-21: Strict block validation enabled after prod cleanup
			blocks: blocksArrayValidator,

			status: v.union(
				v.literal('draft'),
				v.literal('pending_signatures'),
				v.literal('completed'),
				v.literal('expired'),
				v.literal('voided')
			),

			// Template-Instance Relationship (Phase 2 Unified Model)
			kind: v.union(v.literal('template'), v.literal('envelope')), // Strict duality: Template vs Envelope
			sourceTemplateId: v.optional(v.id('documents')), // Parent template
			instanceNumber: v.optional(v.number()), // e.g., "Envelope #47"
			instanceCount: v.optional(v.number()), // Templates only: total instances created
			isLocked: v.optional(v.boolean()), // For published templates
			isPublic: v.optional(v.boolean()), // Promoted for indexing
			publishedAt: v.optional(v.number()),

			// Tamper-Proof Sealing
			contentHash: v.optional(v.string()),
			sealedAt: v.optional(v.number()),
			sealedVersion: v.optional(v.number()),

			// Completion
			completedAt: v.optional(v.number()),
			completedHash: v.optional(v.string()),

			// Signed PDF Storage (Phase 4)
			signedPdfStorageId: v.optional(v.id('_storage')),
			auditPdfStorageId: v.optional(v.id('_storage')),

			// Certificate of Completion
			certificateNumber: v.optional(v.string()), // e.g., "COC-2026-00047"
			certificateStorageId: v.optional(v.id('_storage')),
			certificateGeneratedAt: v.optional(v.number()),

			// Document Settings (Margins, Colors, Fonts)
			settings: v.optional(documentSettingsValidator),

			// Shared Signing Link (Phase 1: One Link Architecture)
			sharedSigningSlug: v.optional(v.string()), // Unique public slug (indexed)
			sharedSigningEnabled: v.optional(v.boolean()), // Feature toggle
			sharedSigningSettings: v.optional(
				v.object({
					allowSelfRegistration: v.boolean(), // Auto-create signers
					maxSigners: v.optional(v.number()), // Limit total signers
					requireEmailMatch: v.optional(v.boolean()) // Must match invited signer
				})
			),

			createdAt: v.number(),
			updatedAt: v.number(),
			version: v.number()
		})
			.index('by_owner', ['ownerId'])
			.index('by_owner_and_status', ['ownerId', 'status'])
			.index('by_owner_and_type', ['ownerId', 'kind']) // 2025: Added for O(1) type filtering
			.index('by_content_hash', ['contentHash'])
			.index('by_shared_slug', ['sharedSigningSlug'])
			.index('by_source_template', ['sourceTemplateId'])
			.index('by_public_template', ['isPublic', 'kind']) // Marketplace index
			.index('by_source_template_status', ['sourceTemplateId', 'status']), // Stats index

		// ═══════════════════════════════════════════════════════════════
		// TEMP INVITE LINKS - One-time or limited use expiring links
		// ═══════════════════════════════════════════════════════════════
		tempInviteLinks: defineTable({
			documentId: v.id('documents'),
			token: v.string(),
			role: v.union(v.literal('viewer'), v.literal('editor')),
			expiresAt: v.optional(v.number()),
			maxUses: v.optional(v.number()), // Default 1
			usedCount: v.number(),
			createdBy: v.id('users'),
			createdAt: v.number()
		})
			.index('by_document', ['documentId'])
			.index('by_token', ['token']),

		// ═══════════════════════════════════════════════════════════════
		// DOCUMENT MEMBERS - Collaboration & Permissions
		// ═══════════════════════════════════════════════════════════════
		documentMembers: defineTable({
			documentId: v.id('documents'),
			workosId: v.optional(v.id('users')), // Linked when user exists
			email: v.string(), // Email used for invitation
			role: v.union(v.literal('viewer'), v.literal('editor'), v.literal('admin')),
			status: v.union(v.literal('pending'), v.literal('active')),

			// Guest Access (for non-account holders)
			guestAccessToken: v.optional(v.string()),
			guestTokenExpiresAt: v.optional(v.number()),

			// One-time Invite Link
			inviteToken: v.optional(v.string()),
			inviteTokenExpiresAt: v.optional(v.number()),

			addedBy: v.id('users'),
			addedAt: v.number()
		})
			.index('by_document', ['documentId'])
			.index('by_user', ['workosId'])
			.index('by_email', ['email'])
			.index('by_guest_token', ['guestAccessToken'])
			.index('by_invite_token', ['inviteToken'])
			.index('by_document_and_user', ['documentId', 'workosId'])
			.index('by_document_and_email', ['documentId', 'email']),

		// ═══════════════════════════════════════════════════════════════
		// SLOTS - Abstract placeholders for templates (Tenant, Landlord, etc.)
		// Formerly called "Parties"
		// - Slots: Template placeholders with role/color, infinitely reusable
		// - Signers: Real people attached to an Envelope's Slots
		// ═══════════════════════════════════════════════════════════════
		slots: defineTable({
			documentId: v.id('documents'), // Parent template

			// Identity (placeholder info)
			name: v.string(), // Display name: "Tenant", "Landlord", "Artist"
			role: v.string(), // Role description (often same as name)
			color: v.string(), // Hex color for UI distinction: "#6366f1"
			order: v.number(), // Display/signing order

			// Default fields to auto-spawn when slot is added (optional feature)
			defaultFields: v.optional(
				v.array(
					v.object({
						type: v.string(),
						label: v.string(),
						required: v.boolean()
					})
				)
			),

			createdAt: v.number()
		})
			.index('by_document', ['documentId'])
			.index('by_document_order', ['documentId', 'order']),

		// ═══════════════════════════════════════════════════════════════
		// SIGNERS - Real people required to sign an Envelope
		// Created from Slots when a template is instantiated
		// ═══════════════════════════════════════════════════════════════
		signers: defineTable({
			documentId: v.id('documents'),

			// Identity (entered by document owner)
			email: v.string(),
			phone: v.string(), // Full phone number
			phoneCountryCode: v.optional(v.string()), // e.g., "+1", "+44", "+972"
			legalName: v.string(),
			role: v.string(),
			order: v.number(),
			color: v.optional(v.string()),

			// Link back to template slot this signer was created from
			// This enables traceability and slot-to-signer mapping
			sourceSlotId: v.optional(v.string()),

			// Signer's filled field values (blockId -> value)
			fieldValues: v.optional(fieldValuesValidator),
			fieldValuesUpdatedAt: v.optional(v.number()),

			// Access
			accessToken: v.string(),
			tokenExpiresAt: v.number(),

			// Verification Status
			verificationStatus: v.union(
				v.literal('pending'),
				v.literal('email_verified'),
				v.literal('phone_verified'),
				v.literal('fully_verified'),
				v.literal('expired')
			),

			// Signing Status
			status: v.union(
				v.literal('pending'),
				v.literal('viewed'),
				v.literal('signed'),
				v.literal('declined')
			),

			// Timestamps
			invitedAt: v.number(),
			viewedAt: v.optional(v.number()), // When signer first viewed the document
			emailVerifiedAt: v.optional(v.number()),
			phoneVerifiedAt: v.optional(v.number()),
			consentGivenAt: v.optional(v.number()),
			signedAt: v.optional(v.number()),
			declinedAt: v.optional(v.number()),

			// Consent record
			consentText: v.optional(v.string()),
			consentIpAddress: v.optional(v.string()),
			consentUserAgent: v.optional(v.string()),
			consentGeoLocation: v.optional(v.string()),

			// Reminder tracking (Phase 6)
			reminderCount: v.optional(v.number()),
			lastReminderAt: v.optional(v.number())
		})
			.index('by_document', ['documentId'])
			.index('by_email', ['email'])
			.index('by_phone', ['phone'])
			.index('by_access_token', ['accessToken'])
			.index('by_status_and_invited', ['status', 'invitedAt'])
			.index('by_document_and_status', ['documentId', 'status']),

		// ═══════════════════════════════════════════════════════════════
		// OTP CODES - Temporary verification codes
		// ═══════════════════════════════════════════════════════════════
		otpCodes: defineTable({
			signerId: v.optional(v.id('signers')),
			memberId: v.optional(v.id('documentMembers')), // For guest collaborators
			type: v.union(v.literal('email'), v.literal('phone')),
			code: v.string(),
			expiresAt: v.number(),
			attempts: v.number(),
			usedAt: v.optional(v.number()),

			// For audit
			sentAt: v.number(),
			sentTo: v.string(),
			ipAddress: v.optional(v.string())
		})
			.index('by_signer_and_type', ['signerId', 'type'])
			.index('by_member_and_type', ['memberId', 'type'])
			.index('by_expires', ['expiresAt']),

		// ═══════════════════════════════════════════════════════════════
		// SIGNATURES - Individual signature records
		// ═══════════════════════════════════════════════════════════════
		signatures: defineTable({
			documentId: v.id('documents'),
			signerId: v.id('signers'),
			blockId: v.string(),

			// Signature Data
			signatureType: v.union(v.literal('draw'), v.literal('type'), v.literal('upload')),
			signatureData: v.string(),
			signatureHash: v.string(),

			// The legal name used when signing
			signedAsName: v.string(),

			// Audit Data (eIDAS compliance)
			signedAt: v.number(),
			ipAddress: v.string(),
			userAgent: v.string(),
			geoLocation: v.optional(v.string()),

			// Verification proof
			emailVerificationHash: v.string(),
			phoneVerificationHash: v.string(),

			// PDF embedding coordinates (Phase 4: Signature Binding)
			pdfX: v.optional(v.number()), // X position (0-1 normalized)
			pdfY: v.optional(v.number()), // Y position (0-1 normalized)
			pdfPage: v.optional(v.number()), // Page number (0-indexed)
			pdfWidth: v.optional(v.number()), // Signature width in px
			pdfHeight: v.optional(v.number()) // Signature height in px
		})
			.index('by_document', ['documentId'])
			.index('by_signer', ['signerId'])
			.index('by_signature_hash', ['signatureHash']),

		// ═══════════════════════════════════════════════════════════════
		// AUDIT LOGS - Immutable compliance trail
		// ═══════════════════════════════════════════════════════════════
		auditLogs: defineTable({
			// Actor
			workosId: v.optional(v.id('users')),
			signerId: v.optional(v.id('signers')),
			memberId: v.optional(v.id('documentMembers')),
			actorType: v.union(
				v.literal('user'),
				v.literal('signer'),
				v.literal('system'),
				v.literal('member')
			),

			// Context
			documentId: v.optional(v.id('documents')), // Linked document for easier unified querying

			// Target
			resourceType: v.union(
				v.literal('document'),
				v.literal('template'),
				v.literal('signature'),
				v.literal('user'),
				v.literal('signer'),
				v.literal('otp')
			),
			resourceId: v.string(),

			// Action
			action: v.string(),
			level: v.union(
				v.literal('info'),
				v.literal('warn'),
				v.literal('error'),
				v.literal('security')
			),

			// Context
			timestamp: v.number(),
			ipAddress: v.optional(v.string()),
			userAgent: v.optional(v.string()),
			geoLocation: v.optional(v.string()),
			sessionId: v.optional(v.string()),

			// Details
			metadata: auditMetadataValidator,
			previousHash: v.optional(v.string()),
			entryHash: v.string()
		})
			.index('by_user', ['workosId'])
			.index('by_signer', ['signerId'])
			.index('by_member', ['memberId'])
			.index('by_document', ['documentId'])
			.index('by_resource', ['resourceType', 'resourceId'])
			.index('by_action', ['action'])
			.index('by_timestamp', ['timestamp'])
			.index('by_entry_hash', ['entryHash'])
			.index('by_document_and_timestamp', ['documentId', 'timestamp']),

		// ═══════════════════════════════════════════════════════════════
		// DOCUMENT VERSIONS - Version history for compliance
		// ═══════════════════════════════════════════════════════════════
		documentVersions: defineTable({
			documentId: v.id('documents'),
			version: v.number(),
			content: v.string(),
			blocks: blocksArrayValidator,
			contentHash: v.string(),
			createdAt: v.number(),
			createdBy: v.optional(v.id('users')),
			createdByMemberId: v.optional(v.id('documentMembers'))
		})
			.index('by_document', ['documentId'])
			.index('by_document_and_version', ['documentId', 'version']),

		// ═══════════════════════════════════════════════════════════════
		// DOCUMENT CHANGES - Track Changes / Redlining Suggestions
		// ═══════════════════════════════════════════════════════════════
		documentChanges: defineTable({
			documentId: v.id('documents'),

			// Change type
			changeType: v.union(v.literal('insertion'), v.literal('deletion'), v.literal('replacement')),

			// Content tracking
			originalContent: v.optional(v.string()), // For deletions/replacements
			newContent: v.optional(v.string()), // For insertions/replacements

			// ProseMirror position (for applying changes)
			position: v.number(),
			endPosition: v.optional(v.number()),

			// Author attribution
			authorId: v.optional(v.id('users')),
			authorMemberId: v.optional(v.id('documentMembers')),
			authorName: v.string(),
			authorColor: v.optional(v.string()),

			// Client-side unique ID for mapping
			changeId: v.string(),

			// Status
			status: v.union(v.literal('pending'), v.literal('accepted'), v.literal('rejected')),

			// Timestamps
			createdAt: v.number(),
			resolvedAt: v.optional(v.number()),
			resolvedBy: v.optional(v.id('users')),

			// Optional comment explaining the change
			comment: v.optional(v.string())
		})
			.index('by_document', ['documentId'])
			.index('by_status', ['status'])
			.index('by_document_and_status', ['documentId', 'status'])
			.index('by_author', ['authorId']),

		// ═══════════════════════════════════════════════════════════════
		// GLOSSARY - Legal dictionary and custom terms
		// ═══════════════════════════════════════════════════════════════
		glossaryTerms: defineTable({
			term: v.string(),
			termLower: v.optional(v.string()), // Normalized lowercase for efficient search
			definition: v.string(),
			category: v.string(),
			source: v.optional(v.string()), // "Black's Law Dictionary" or "User"
			workosId: v.optional(v.id('users')) // For user-specific terms
		})
			.index('by_term', ['term'])
			.index('by_term_lower', ['termLower']) // For case-insensitive prefix search
			.index('by_category', ['category'])
			.index('by_user', ['workosId']),

		// ═══════════════════════════════════════════════════════════════
		// GLOBAL VARIABLES - Template variables like {{company_name}}
		// ═══════════════════════════════════════════════════════════════
		globalVariables: defineTable({
			name: v.string(), // e.g., "company_name"
			displayName: v.optional(v.string()), // e.g., "Company Name"
			value: v.union(v.string(), v.number(), v.boolean(), v.null()),
			type: v.union(
				v.literal('text'),
				v.literal('number'),
				v.literal('date'),
				v.literal('currency'),
				v.literal('boolean')
			),
			fallback: v.optional(v.string()), // Default value when unset
			scope: v.union(v.literal('document'), v.literal('user'), v.literal('system')),
			category: v.optional(v.string()), // For grouping: "Company", "Date", "Signer"
			documentId: v.optional(v.id('documents')), // For document-scoped variables
			workosId: v.optional(v.id('users')), // For user-scoped variables
			createdAt: v.number(),
			updatedAt: v.number()
		})
			.index('by_document', ['documentId'])
			.index('by_user', ['workosId'])
			.index('by_scope', ['scope'])
			.index('by_name_and_document', ['name', 'documentId'])
			.index('by_name_and_user', ['name', 'workosId']),

		// ═══════════════════════════════════════════════════════════════
		// AI TEMPLATES - RAG-based template search for AI generation
		// ═══════════════════════════════════════════════════════════════
		aiTemplates: defineTable({
			title: v.string(),
			genre: v.string(), // "music_industry", "freelancing", "business", "legal"
			category: v.string(), // "record_label_deal", "nda", "service_agreement"
			content: v.string(), // Full template text
			embedding: v.array(v.float64()), // Vector embedding (1536 dims)
			source: v.union(
				v.literal('accord'),
				v.literal('commonaccord'),
				v.literal('user'),
				v.literal('system')
			),
			workosId: v.optional(v.id('users')), // For user-uploaded templates
			metadata: aiTemplateMetadataValidator,
			isActive: v.optional(v.boolean()),
			createdAt: v.number()
		})
			.index('by_genre', ['genre'])
			.index('by_category', ['category'])
			.index('by_user', ['workosId'])
			.index('by_source', ['source'])
			.vectorIndex('by_embedding', {
				vectorField: 'embedding',
				dimensions: 1536,
				filterFields: ['genre', 'category']
			}),

		// ═══════════════════════════════════════════════════════════════
		// HUBSPOT CONNECTIONS - OAuth tokens and account links
		// ═══════════════════════════════════════════════════════════════
		hubspotConnections: defineTable({
			workosId: v.id('users'),
			accessToken: v.string(), // Encrypted access token
			refreshToken: v.string(), // Encrypted refresh token
			expiresAt: v.number(), // Token expiration timestamp
			portalId: v.string(), // HubSpot account/portal ID
			portalName: v.optional(v.string()), // Display name for UI
			scopes: v.array(v.string()), // Granted OAuth scopes
			isActive: v.boolean(),
			lastSyncedAt: v.optional(v.number()),
			createdAt: v.number(),
			updatedAt: v.number()
		})
			.index('by_user', ['workosId'])
			.index('by_portal', ['portalId'])
			.index('by_active', ['isActive']),

		// ═══════════════════════════════════════════════════════════════
		// HUBSPOT SYNC MAPPINGS - Links between HubSpot and HyprDoc entities
		// ═══════════════════════════════════════════════════════════════
		hubspotMappings: defineTable({
			workosId: v.id('users'),
			connectionId: v.id('hubspotConnections'),
			entityType: v.union(
				v.literal('contact_signer'), // HubSpot Contact ↔ HyprDoc Signer
				v.literal('company_variables'), // HubSpot Company ↔ Global Variables
				v.literal('deal_envelope') // HubSpot Deal ↔ HyprDoc Envelope
			),
			hubspotId: v.string(), // HubSpot object ID
			hyprdocId: v.string(), // HyprDoc document/signer ID
			hubspotType: v.optional(v.string()), // "contact", "company", "deal"
			metadata: v.optional(
				v.object({
					hubspotName: v.optional(v.string()),
					hyprdocName: v.optional(v.string()),
					lastEventPushed: v.optional(v.string())
				})
			),
			lastSyncedAt: v.number(),
			createdAt: v.number()
		})
			.index('by_user', ['workosId'])
			.index('by_connection', ['connectionId'])
			.index('by_hubspot', ['hubspotId', 'entityType'])
			.index('by_hyprdoc', ['hyprdocId', 'entityType'])
			.index('by_type', ['entityType']),

		// ═══════════════════════════════════════════════════════════════
		// HUBSPOT WEBHOOK LOGS - Incoming webhook event tracking
		// ═══════════════════════════════════════════════════════════════
		hubspotWebhookLogs: defineTable({
			portalId: v.string(),
			eventType: v.string(), // "deal.propertyChange", "contact.creation", etc.
			objectType: v.string(), // "deal", "contact", "company"
			objectId: v.string(),
			propertyName: v.optional(v.string()),
			propertyValue: v.optional(v.string()),
			subscriptionId: v.optional(v.string()),
			occurredAt: v.number(), // HubSpot event timestamp
			processedAt: v.number(), // When we processed it
			status: v.union(
				v.literal('received'),
				v.literal('processed'),
				v.literal('failed'),
				v.literal('ignored')
			),
			errorMessage: v.optional(v.string()),
			rawPayload: v.optional(v.string()) // JSON stringified for debugging
		})
			.index('by_portal', ['portalId'])
			.index('by_object', ['objectType', 'objectId'])
			.index('by_status', ['status'])
			.index('by_occurred', ['occurredAt']),

		// ═══════════════════════════════════════════════════════════════
		// PENDING SUBSCRIPTIONS - Webhook data awaiting user creation
		// When Polar webhook fires before user exists in Convex, store here
		// ═══════════════════════════════════════════════════════════════
		pendingSubscriptions: defineTable({
			workosId: v.string(), // WorkOS User ID
			polarSubscriptionId: v.optional(v.string()),
			polarCustomerId: v.optional(v.string()),
			subscriptionStatus: v.union(
				v.literal('active'),
				v.literal('canceled'),
				v.literal('past_due'),
				v.literal('trialing'),
				v.literal('incomplete'),
				v.literal('none')
			),
			subscriptionTier: v.union(
				v.literal('free'),
				v.literal('pro'),
				v.literal('enterprise'),
				v.literal('custom')
			),
			subscriptionExpiresAt: v.optional(v.number()),
			productId: v.optional(v.string()),
			email: v.optional(v.string()), // Added for email-based pending sync
			attempts: v.number(),
			lastAttemptAt: v.number(),
			createdAt: v.number(),
			hasCompletedPlanSelection: v.optional(v.boolean())
		})
			.index('by_user_id', ['workosId'])
			.index('by_email', ['email'])
			.index('by_created_at', ['createdAt']),

		// ═══════════════════════════════════════════════════════════════
		// HYPRSIGN ANONYMOUS USAGE - Fingerprint-based usage tracking
		// ═══════════════════════════════════════════════════════════════
		hyprSignAnonymousUsage: defineTable({
			fingerprint: v.string(),
			usesThisMonth: v.number(),
			monthResetDate: v.string(), // ISO month "2026-01"
			lastUsedAt: v.number()
		}).index('by_fingerprint', ['fingerprint']),

		// ═══════════════════════════════════════════════════════════════
		// COUNTERS - Sequential ID generators (certificates, invoices, etc.)
		// ═══════════════════════════════════════════════════════════════
		counters: defineTable({
			name: v.string(), // e.g., "certificate", "invoice"
			year: v.number(), // e.g., 2026
			currentValue: v.number(), // Current counter value
			updatedAt: v.number()
		}).index('by_name_and_year', ['name', 'year'])
	},
	// Schema validation enabled for production
	{ schemaValidation: false }
);
