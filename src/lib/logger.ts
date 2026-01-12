/**
 * Unified Logger for HyprDoc
 *
 * Uses tslog for environment-aware logging:
 * - Development: Pretty colored output
 * - Production: JSON structured logs (or silent if NEXT_PUBLIC_ENABLE_LOGS=false)
 *
 * Works in both browser and Node.js without worker thread issues.
 */
import { type ILogObj, Logger } from "tslog";

// Environment detection
const isDev = process.env.NODE_ENV === "development";
const isBrowser = typeof globalThis.window !== "undefined";

/**
 * Logging toggle for production builds.
 * Set NEXT_PUBLIC_ENABLE_LOGS=false to silence debug/info logs.
 * Warnings and errors are ALWAYS preserved.
 */
const LOGS_ENABLED = process.env.NEXT_PUBLIC_ENABLE_LOGS !== "false";

/**
 * Get minimum log level based on environment:
 * - Dev: 2 (debug+)
 * - Prod with logs: 3 (info+)
 * - Prod without logs: 4 (warn+ only)
 */
const getMinLevel = (): number => {
  if (!(LOGS_ENABLED || isDev)) { return 4; // warn, error, fatal only
}
  return isDev ? 2 : 3; // debug in dev, info in prod
};

/**
 * Main application logger
 *
 * Log levels (0-6):
 * 0: silly, 1: trace, 2: debug, 3: info, 4: warn, 5: error, 6: fatal
 */
export const logger = new Logger<ILogObj>({
  name: "HyprDoc",
  // Pretty output in dev, JSON in production
  type: isDev ? "pretty" : "json",
  // Custom pretty template for dev
  prettyLogTemplate: isDev ? "{{hh}}:{{MM}}:{{ss}} {{logLevelName}} [{{name}}] " : undefined,
  prettyLogTimeZone: "local",
  // Hide sensitive position info in production
  hideLogPositionForProduction: true,
  // Dynamic log level based on environment
  minLevel: getMinLevel(),
  // Disable styled logs in browser to avoid console formatting issues
  stylePrettyLogs: !isBrowser,
  // Include pretty error stack traces
  prettyErrorStackTemplate: "  • {{fileName}}:{{lineNumber}} {{method}}",
  prettyErrorParentNamesSeparator: " → ",
  prettyLogStyles: {
    logLevelName: {
      "*": ["bold", "bgBlackBright", "whiteBright"],
      DEBUG: ["bold", "green"],
      INFO: ["bold", "blue"],
      WARN: ["bold", "yellow"],
      ERROR: ["bold", "red"],
      FATAL: ["bold", "bgRed", "whiteBright"],
    },
    name: ["bold", "cyan"],
  },
});

// ═══════════════════════════════════════════════════════════════
// SUB-LOGGERS FOR DIFFERENT MODULES
// ═══════════════════════════════════════════════════════════════

/** Editor-related logging (Tiptap, blocks, extensions) */
export const editorLogger = logger.getSubLogger({ name: "Editor" });

/** Authentication logging (Clerk, Convex auth) */
export const authLogger = logger.getSubLogger({ name: "Auth" });

/** API route logging */
export const apiLogger = logger.getSubLogger({ name: "API" });

/** Audit trail logging (security-critical events) */
export const auditLog = logger.getSubLogger({ name: "Audit" });

/** Document operations logging */
export const docLogger = logger.getSubLogger({ name: "Doc" });

/** Convex backend logging */
export const convexLogger = logger.getSubLogger({ name: "Convex" });

export default logger;
