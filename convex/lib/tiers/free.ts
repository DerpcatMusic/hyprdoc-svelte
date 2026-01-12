import type { TierConfig } from './types';

/**
 * Free Tier Configuration
 *
 * Default tier for all users. Limited usage, no paid features.
 */
export const FREE_TIER: TierConfig = {
	id: 'free',
	name: 'Free',
	limits: {
		aiWriterPerMonth: 3,
		inlineAiPerDay: 5,
		inlineAiPerMonth: 0, // Uses daily limit instead
		envelopesPerMonth: 3
	},
	features: {
		realtimeCollaboration: false,
		prioritySupport: false,
		customBranding: false,
		apiAccess: false
	},
	isPaid: false
};
