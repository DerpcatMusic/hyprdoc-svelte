import { v } from 'convex/values';
import { blocksArrayValidator, documentSettingsValidator, fieldValuesValidator } from './schemas';

// ═══════════════════════════════════════════════════════════════
// Status Validators
// ═══════════════════════════════════════════════════════════════

export const documentStatusValidator = v.union(
	v.literal('draft'),
	v.literal('pending_signatures'),
	v.literal('completed'),
	v.literal('expired'),
	v.literal('voided')
);

// Validator for request context (IP, User Agent, etc.)
export const requestContextValidator = v.object({
	ipAddress: v.optional(v.string()),
	userAgent: v.optional(v.string()),
	geoLocation: v.optional(v.string())
});

export const verificationStatusValidator = v.union(
	v.literal('pending'),
	v.literal('email_verified'),
	v.literal('phone_verified'),
	v.literal('fully_verified'),
	v.literal('expired')
);

export const signerStatusValidator = v.union(
	v.literal('pending'),
	v.literal('viewed'),
	v.literal('signed'),
	v.literal('declined')
);

export const otpTypeValidator = v.union(v.literal('email'), v.literal('phone'));

export const signatureTypeValidator = v.union(
	v.literal('draw'),
	v.literal('type'),
	v.literal('upload')
);

export const auditLevelValidator = v.union(
	v.literal('info'),
	v.literal('warn'),
	v.literal('error'),
	v.literal('security')
);

export const actorTypeValidator = v.union(
	v.literal('user'),
	v.literal('signer'),
	v.literal('system')
);

export const resourceTypeValidator = v.union(
	v.literal('document'),
	v.literal('template'),
	v.literal('signature'),
	v.literal('user'),
	v.literal('signer'),
	v.literal('otp')
);

// ═══════════════════════════════════════════════════════════════
// Request Context (passed from API routes)
// ═══════════════════════════════════════════════════════════════

export interface RequestContext {
	ipAddress?: string;
	userAgent?: string;
	geoLocation?: string;
	sessionId?: string;
}

// ═══════════════════════════════════════════════════════════════
// Return Shape Validators
// ═══════════════════════════════════════════════════════════════

// documentSettingsValidator is now imported from ./schemas

export const documentReturnValidator = v.object({
	_id: v.id('documents'),
	_creationTime: v.number(),
	ownerId: v.id('users'),
	title: v.string(),
	content: v.string(),
	blocks: blocksArrayValidator,
	settings: v.optional(documentSettingsValidator), // Using typed settings
	status: documentStatusValidator,
	contentHash: v.optional(v.string()),
	sealedAt: v.optional(v.number()),
	sealedVersion: v.optional(v.number()),
	completedAt: v.optional(v.number()),
	completedHash: v.optional(v.string()),
	isPublic: v.optional(v.boolean()),

	// Template-Instance Relationship (Phase 2 Unified Model)
	kind: v.optional(v.union(v.literal('template'), v.literal('envelope'))),
	sourceTemplateId: v.optional(v.id('documents')),
	instanceNumber: v.optional(v.number()),
	instanceCount: v.optional(v.number()),

	// Signed PDF Storage (Phase 4)
	signedPdfStorageId: v.optional(v.id('_storage')),
	auditPdfStorageId: v.optional(v.id('_storage')),

	// Shared Signing Link (Phase 1: One Link Architecture)
	sharedSigningSlug: v.optional(v.string()),
	sharedSigningEnabled: v.optional(v.boolean()),
	sharedSigningSettings: v.optional(
		v.object({
			allowSelfRegistration: v.boolean(),
			maxSigners: v.optional(v.number()),
			requireEmailMatch: v.optional(v.boolean())
		})
	),
	createdAt: v.number(),
	updatedAt: v.number(),
	version: v.number()
});

export const userReturnValidator = v.object({
	_id: v.id('users'),
	_creationTime: v.number(),
	workosId: v.optional(v.string()), // Optional for WorkOS users
	email: v.string(),
	name: v.optional(v.string()),
	imageUrl: v.optional(v.string()),
	createdAt: v.number(),
	lastSeenAt: v.number(),

	// Branding
	brandLogoUrl: v.optional(v.string()),
	brandLogoPosition: v.optional(
		v.union(v.literal('left'), v.literal('center'), v.literal('right'))
	),
	brandEnabled: v.optional(v.boolean()),
	brandLogoColor: v.optional(v.string()),
	corporateModeEnabled: v.optional(v.boolean()),

	// Clock Settings
	clockEnabled: v.optional(v.boolean()),
	clockOpacity: v.optional(v.number()),
	clockSize: v.optional(v.string()),
	clockPosition: v.optional(v.union(v.literal('left'), v.literal('center'), v.literal('right'))),

	// Document Default Settings
	defaultPaperTexture: v.optional(v.string()),
	defaultPaperTextureOpacity: v.optional(v.number()),
	defaultShowMargins: v.optional(v.boolean()),
	defaultMarginVertical: v.optional(v.number()),
	defaultMarginHorizontal: v.optional(v.number()),

	// AI Writer Usage Tracking
	aiGenerationsThisMonth: v.optional(v.number()),
	aiGenerationResetDate: v.optional(v.string()),

	// Inline AI Usage Tracking
	inlineAiUsesThisMonth: v.optional(v.number()),
	inlineAiUsesThisDay: v.optional(v.number()),
	inlineAiDayResetDate: v.optional(v.string()),
	inlineAiMonthResetDate: v.optional(v.string()),

	// Envelope Sending Limits
	envelopesSentThisMonth: v.optional(v.number()),
	envelopeMonthResetDate: v.optional(v.string()),

	// Subscription
	subscriptionTier: v.optional(v.string()),
	polarCustomerId: v.optional(v.string()),
	polarSubscriptionId: v.optional(v.string()),
	subscriptionStatus: v.optional(v.string()),
	subscriptionExpiresAt: v.optional(v.number()),
	subscriptionProductId: v.optional(v.string()),

	// Terms of Service
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
	hyprSignMonthResetDate: v.optional(v.string()),

	// Onboarding Flags
	autoFillOnboardingCompleted: v.optional(v.boolean()),
	hasCompletedPlanSelection: v.optional(v.boolean())
});

export const signerReturnValidator = v.object({
	_id: v.id('signers'),
	_creationTime: v.number(),
	documentId: v.id('documents'),
	email: v.string(),
	phone: v.optional(v.string()), // Optional - not all signers have phone
	phoneCountryCode: v.optional(v.string()),
	legalName: v.string(),
	role: v.string(),
	order: v.number(),
	verificationStatus: verificationStatusValidator,
	status: signerStatusValidator,
	invitedAt: v.number(),
	emailVerifiedAt: v.optional(v.number()),
	phoneVerifiedAt: v.optional(v.number()),
	consentGivenAt: v.optional(v.number()),
	signedAt: v.optional(v.number()),
	declinedAt: v.optional(v.number()),
	viewedAt: v.optional(v.number()),

	// Access
	accessToken: v.string(),
	tokenExpiresAt: v.number(),

	// Customization
	color: v.optional(v.string()),

	// Consent Details
	consentText: v.optional(v.string()),
	consentIpAddress: v.optional(v.string()),
	consentUserAgent: v.optional(v.string()),
	consentGeoLocation: v.optional(v.string()),

	// Consents & Values
	fieldValues: v.optional(fieldValuesValidator), // Map of blockId -> value
	fieldValuesUpdatedAt: v.optional(v.number()),

	// Slot/Signer Relationship
	sourceSlotId: v.optional(v.string()) // Links to slots table for traceability
});

// Note: templateReturnValidator removed - templates table deprecated in favor of documents.kind="template"
