// convex/signers/constants.ts
export const OTP_EXPIRY_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 3;
export const TOKEN_EXPIRY_DAYS = 7;
export const OTP_COOLDOWN_SECONDS = 60; // Rate limit: 60 seconds between OTP requests
export const OTP_MAX_REQUESTS = 3; // Max OTP requests before waiting for oldest to expire
export const REMINDER_THRESHOLD_HOURS = 24;
export const REMINDER_MAX_COUNT = 3; // Max reminders per signer
