import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

// Cleanup expired OTP codes every hour
// OTPs expire after 10-20 mins, so hourly cleanup is sufficient to keep table small
crons.interval(
	'cleanup expired otps',
	{ minutes: 60 },
	internal.signers.mutations.internal.cleanupExpiredOtps
);

// Send reminder emails to pending signers every 24 hours
// Only sends to signers who have been pending for > 24 hours and have received < 3 reminders
crons.interval(
	'send signing reminders',
	{ hours: 24 },
	internal.signers.actions.sendPendingReminders
);

// Reset daily usage counters at midnight UTC
crons.daily(
	'reset daily usage',
	{ hourUTC: 0, minuteUTC: 5 },
	internal.usage.mutations.resetDailyUsage
);

// Expire canceled subscriptions past their end date
crons.daily(
	'expire subscriptions',
	{ hourUTC: 1, minuteUTC: 0 },
	internal.polar.mutations.expireSubscriptions
);

export default crons;
