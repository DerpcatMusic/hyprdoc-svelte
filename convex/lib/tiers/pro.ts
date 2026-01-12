import type { TierConfig } from './types';

/**
 * Pro Tier Configuration
 *
 * Standard paid tier for power users.
 */
export const PRO_TIER: TierConfig = {
	id: 'pro',
	name: 'Pro',
	limits: {
		aiWriterPerMonth: 30,
		inlineAiPerDay: 250,
		inlineAiPerMonth: 0, // Uses daily limit instead
		envelopesPerMonth: 30
	},
	features: {
		realtimeCollaboration: true,
		prioritySupport: false,
		customBranding: true,
		apiAccess: false
	},
	isPaid: true
};
