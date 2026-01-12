/**
 * Convex-compatible Logger
 *
 * Environment-aware logging for Convex functions.
 * - Development: All logs enabled
 * - Production: Silent for debug/info, preserves warn/error
 *
 * Usage:
 *   import { log } from "./lib/convex_logger";
 *   log.info("Document created", { id: doc._id });
 */

// Detect if running in development (local Convex dev server)
const isDev = !process.env.CONVEX_CLOUD_URL || process.env.CONVEX_CLOUD_URL.includes('localhost');

// Enable logs explicitly in production via ENABLE_LOGS=true in Convex dashboard
const LOGS_ENABLED = process.env.ENABLE_LOGS === 'true' || isDev;

/**
 * Lightweight logger for Convex functions.
 * Respects ENABLE_LOGS environment variable.
 */
export const log = {
	/** Debug-level log (dev only, or when ENABLE_LOGS=true) */
	debug: (...args: unknown[]) => {
		if (LOGS_ENABLED) { console.log('[DEBUG]', ...args); }
	},

	/** Info-level log (dev only, or when ENABLE_LOGS=true) */
	info: (...args: unknown[]) => {
		if (LOGS_ENABLED) { console.log('[INFO]', ...args); }
	},

	/** Warning-level log (ALWAYS logged) */
	warn: (...args: unknown[]) => {
		console.warn('[WARN]', ...args);
	},

	/** Error-level log (ALWAYS logged) */
	error: (...args: unknown[]) => {
		console.error('[ERROR]', ...args);
	}
};

export default log;
