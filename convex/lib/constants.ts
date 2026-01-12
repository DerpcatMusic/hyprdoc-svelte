/**
 * Application Constants
 * Centralized location for shared constants across the codebase.
 */

// ═══════════════════════════════════════════════════════════════════════════
// Slot/Signer Colors
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Default colors for slots/signers.
 * Used by slots/mutations.ts and components.
 */
export const PARTY_COLORS = [
	'#ef4444', // red
	'#f97316', // orange
	'#eab308', // yellow
	'#22c55e', // green
	'#3b82f6', // blue
	'#8b5cf6', // violet
	'#ec4899', // pink
	'#14b8a6' // teal
] as const;

export type PartyColor = (typeof PARTY_COLORS)[number];

// ═══════════════════════════════════════════════════════════════════════════
// Document Status Constants
// ═══════════════════════════════════════════════════════════════════════════

export const DOCUMENT_STATUSES = [
	'draft',
	'pending_signatures',
	'completed',
	'voided',
	'expired'
] as const;

export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

// ═══════════════════════════════════════════════════════════════════════════
// Signer Status Constants
// ═══════════════════════════════════════════════════════════════════════════

export const SIGNER_STATUSES = ['pending', 'viewed', 'signed', 'declined'] as const;

export type SignerStatus = (typeof SIGNER_STATUSES)[number];

// ═══════════════════════════════════════════════════════════════════════════
// Token Expiry
// ═══════════════════════════════════════════════════════════════════════════

export const TOKEN_EXPIRY_DAYS = 30;
export const OTP_EXPIRY_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;
export const SESSION_TIMEOUT_HOURS = 4;

// ═══════════════════════════════════════════════════════════════════════════
// Reminder Settings
// ═══════════════════════════════════════════════════════════════════════════

export const REMINDER_THRESHOLD_HOURS = 48;
export const REMINDER_MAX_COUNT = 3;
// ═══════════════════════════════════════════════════════════════════════════
// Document Settings Defaults
// ═══════════════════════════════════════════════════════════════════════════

export const DEFAULT_DOCUMENT_SETTINGS = {
	fontBody: 'Inter',
	fontHeading: 'Outfit',
	paperColor: '#ffffff',
	paperTexture: 'none',
	paperTextureOpacity: 0,
	paperTextureScale: 1,
	paperTextureMonochromatic: true,
	marginVertical: 40,
	marginHorizontal: 40,
	showMargins: false,
	mirrorMargins: false,
	timeFormat: '12h' as const,
	pageWidth: 794, // A4 @ 96 DPI
	pageHeight: 1123,
	measurementUnit: 'px' as const,
	authEmail: false,
	authPhone: false,
	realTimeEnabled: false
};
