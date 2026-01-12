import type { TierConfig } from './types';

/**
 * Enterprise Tier Configuration
 *
 * High-volume tier for large organizations.
 * Price: $1,500/month
 */
export const ENTERPRISE_TIER: TierConfig = {
	id: 'enterprise',
	name: 'Enterprise',
	limits: {
		aiWriterPerMonth: 200,
		inlineAiPerDay: 0, // Uses monthly limit
		inlineAiPerMonth: 300,
		envelopesPerMonth: 500
	},
	features: {
		realtimeCollaboration: true,
		prioritySupport: true,
		customBranding: true,
		apiAccess: true
	},
	isPaid: true
};
