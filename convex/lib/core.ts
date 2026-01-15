/**
 * lib/core.ts - SINGLE SOURCE OF TRUTH
 * ════════════════════════════════════════════════════════════════════════════
 * Every function in the backend imports from here. Period.
 *
 * Features baked in:
 * - Authentication (WorkOS JWT)
 * - Row-Level Security (per-table rules)
 * - Triggers (auto-audit logging)
 * - Type-safe user context
 * - Zod validation (via zCustomQuery/zCustomMutation)
 *
 * Exports:
 * - query/mutation: Optional auth + RLS (Convex validators)
 * - protectedQuery/protectedMutation: Required auth + RLS (Convex validators)
 * - zQuery/zMutation: Optional auth + RLS (Zod validators)
 * - zProtectedQuery/zProtectedMutation: Required auth + RLS (Zod validators)
 * - internalQuery/internalMutation: Raw (scheduled jobs, webhooks)
 */

import { v } from "convex/values";
import {
	customQuery,
	customMutation,
	customCtx,
} from "convex-helpers/server/customFunctions";
import { zCustomQuery, zCustomMutation, zid } from "convex-helpers/server/zod";
import {
	wrapDatabaseReader,
	wrapDatabaseWriter,
} from "convex-helpers/server/rowLevelSecurity";
import type { Rules } from "convex-helpers/server/rowLevelSecurity";
import {
	query as rawQuery,
	mutation as rawMutation,
	action as rawAction,
	internalQuery as rawInternalQuery,
	internalMutation as rawInternalMutation,
} from "../_generated/server";
import type { QueryCtx, ActionCtx } from "../_generated/server";
import type { DataModel, Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { triggers } from "./triggers";

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

export interface AuthUser {
	_id: Id<"users">;
	workosId: string;
	email: string;
	name?: string;
}

export class AuthError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "AuthError";
	}
}

// ════════════════════════════════════════════════════════════════════════════
// ACTION HELPERS
// ════════════════════════════════════════════════════════════════════════════

import { customAction } from "convex-helpers/server/customFunctions";

async function getActionUser(ctx: ActionCtx): Promise<AuthUser | null> {
	const identity = await ctx.auth.getUserIdentity();
	if (!identity) return null;

	const user = await ctx.runQuery(internal.users.queries.internalGetByWorkosId, {
		workosId: identity.subject,
	});

	if (!user) return null;
	return {
		_id: user._id,
		workosId: identity.subject,
		email: user.email,
		name: user.name,
	};
}

// ════════════════════════════════════════════════════════════════════════════
// USER RESOLUTION
// ════════════════════════════════════════════════════════════════════════════

async function getUser(ctx: QueryCtx): Promise<AuthUser | null> {
	const identity = await ctx.auth.getUserIdentity();
	if (!identity) return null;

	const user = await ctx.db
		.query("users")
		.withIndex("by_workos_id", (q) => q.eq("workosId", identity.subject))
		.unique();

	if (!user) return null;
	return {
		_id: user._id,
		workosId: identity.subject,
		email: user.email,
		name: user.name,
	};
}

// ════════════════════════════════════════════════════════════════════════════
// RLS RULES - ALL TABLES
// ════════════════════════════════════════════════════════════════════════════

function rlsRules(userId: Id<"users"> | null): Rules<QueryCtx, DataModel> {
	return {
		// ─────────────────────────────────────────────────────────────────────────
		// CORE TABLES
		// ─────────────────────────────────────────────────────────────────────────
		documents: {
			read: async (_, doc) => doc.isPublic === true || doc.ownerId === userId,
			insert: async () => !!userId,
			modify: async (_, doc) => doc.ownerId === userId,
		},
		users: {
			read: async (_, user) => user._id === userId,
			insert: async () => true,
			modify: async (_, user) => user._id === userId,
		},
		auditLogs: {
			read: async () => false, // Never readable via API
			insert: async () => true, // System can insert
			modify: async () => false, // Immutable
		},
		documentVersions: {
			read: async (ctx, version) => {
				const doc = await ctx.db.get(version.documentId);
				return doc ? doc.isPublic === true || doc.ownerId === userId : false;
			},
			insert: async () => !!userId,
			modify: async () => false, // Immutable
		},

		// ─────────────────────────────────────────────────────────────────────────
		// SIGNING TABLES
		// ─────────────────────────────────────────────────────────────────────────
		slots: {
			read: async (ctx, slot) => {
				const doc = await ctx.db.get(slot.documentId);
				return doc ? doc.isPublic === true || doc.ownerId === userId : false;
			},
			insert: async (ctx, slot) => {
				const doc = await ctx.db.get(slot.documentId);
				return doc?.ownerId === userId;
			},
			modify: async (ctx, slot) => {
				const doc = await ctx.db.get(slot.documentId);
				return doc?.ownerId === userId;
			},
		},
		signers: {
			read: async (ctx, signer) => {
				const doc = await ctx.db.get(signer.documentId);
				return doc ? doc.ownerId === userId : false;
			},
			insert: async (ctx, signer) => {
				const doc = await ctx.db.get(signer.documentId);
				return doc?.ownerId === userId;
			},
			modify: async (ctx, signer) => {
				const doc = await ctx.db.get(signer.documentId);
				return doc?.ownerId === userId;
			},
		},
		signatures: {
			read: async (ctx, sig) => {
				const doc = await ctx.db.get(sig.documentId);
				return doc ? doc.ownerId === userId : false;
			},
			insert: async () => true, // Signers can insert via public signing flow
			modify: async () => false, // Immutable once created
		},

		// ─────────────────────────────────────────────────────────────────────────
		// COLLABORATION TABLES
		// ─────────────────────────────────────────────────────────────────────────
		documentMembers: {
			read: async (ctx, member) => {
				const doc = await ctx.db.get(member.documentId);
				if (doc?.ownerId === userId) return true;
				return member.workosId === userId;
			},
			insert: async (ctx, member) => {
				const doc = await ctx.db.get(member.documentId);
				return doc?.ownerId === userId;
			},
			modify: async (ctx, member) => {
				const doc = await ctx.db.get(member.documentId);
				return doc?.ownerId === userId;
			},
		},
		tempInviteLinks: {
			read: async (ctx, link) => {
				const doc = await ctx.db.get(link.documentId);
				return doc?.ownerId === userId || link.createdBy === userId;
			},
			insert: async (ctx, link) => {
				const doc = await ctx.db.get(link.documentId);
				return doc?.ownerId === userId;
			},
			modify: async (ctx, link) => {
				const doc = await ctx.db.get(link.documentId);
				return doc?.ownerId === userId;
			},
		},
		documentChanges: {
			read: async (ctx, change) => {
				const doc = await ctx.db.get(change.documentId);
				return doc ? doc.ownerId === userId || doc.isPublic === true : false;
			},
			insert: async (ctx, change) => {
				const doc = await ctx.db.get(change.documentId);
				return !!doc; // Anyone with doc access can suggest changes
			},
			modify: async (ctx, change) => {
				const doc = await ctx.db.get(change.documentId);
				return doc?.ownerId === userId; // Only owner can accept/reject
			},
		},

		// ─────────────────────────────────────────────────────────────────────────
		// AI & CONTENT TABLES
		// ─────────────────────────────────────────────────────────────────────────
		aiTemplates: {
			read: async (_, template) => template.isActive !== false,
			insert: async () => !!userId,
			modify: async (_, template) => template.workosId === userId,
		},
		glossaryTerms: {
			read: async (_, term) => !term.workosId || term.workosId === userId,
			insert: async () => !!userId,
			modify: async (_, term) => term.workosId === userId,
		},
		globalVariables: {
			read: async (ctx, variable) => {
				if (variable.scope === "system") return true;
				if (variable.scope === "user") return variable.workosId === userId;
				if (variable.scope === "document" && variable.documentId) {
					const doc = await ctx.db.get(variable.documentId);
					return doc ? doc.ownerId === userId || doc.isPublic === true : false;
				}
				return false;
			},
			insert: async () => !!userId,
			modify: async (_, variable) => {
				if (variable.scope === "system") return false;
				return variable.workosId === userId;
			},
		},

		// ─────────────────────────────────────────────────────────────────────────
		// INTEGRATION TABLES
		// ─────────────────────────────────────────────────────────────────────────
		hubspotConnections: {
			read: async (_, conn) => conn.workosId === userId,
			insert: async () => !!userId,
			modify: async (_, conn) => conn.workosId === userId,
		},
		hubspotMappings: {
			read: async (_, mapping) => mapping.workosId === userId,
			insert: async () => !!userId,
			modify: async (_, mapping) => mapping.workosId === userId,
		},
		hubspotWebhookLogs: {
			read: async () => false, // Internal only
			insert: async () => true,
			modify: async () => false,
		},

		// ─────────────────────────────────────────────────────────────────────────
		// INTERNAL/SYSTEM TABLES
		// ─────────────────────────────────────────────────────────────────────────
		pendingSubscriptions: {
			read: async () => false,
			insert: async () => true,
			modify: async () => true,
		},
		otpCodes: {
			read: async () => false, // Never readable via API
			insert: async () => true, // System can insert
			modify: async () => true, // System can modify
		},
		counters: {
			read: async () => false,
			insert: async () => true,
			modify: async () => true,
		},
		hyprSignAnonymousUsage: {
			read: async () => false,
			insert: async () => true,
			modify: async () => true,
		},
	};
}

// ════════════════════════════════════════════════════════════════════════════
// EXPORTED WRAPPERS — USE THESE EVERYWHERE
// ════════════════════════════════════════════════════════════════════════════

/**
 * query - Optional auth, RLS enforced
 * Use for: Public reads, optional user context
 */
export const query = customQuery(
	rawQuery,
	customCtx(async (ctx) => {
		const user = await getUser(ctx);
		return {
			user,
			db: wrapDatabaseReader(ctx, ctx.db, rlsRules(user?._id ?? null)),
		};
	}),
);

/**
 * mutation - Optional auth, RLS enforced, Triggers active
 * Use for: Public writes (rare), users.store
 */
export const mutation = customMutation(
	rawMutation,
	customCtx(async (ctx) => {
		const user = await getUser(ctx);
		const triggeredCtx = triggers.wrapDB(ctx);
		return {
			user,
			db: wrapDatabaseWriter(
				ctx,
				triggeredCtx.db,
				rlsRules(user?._id ?? null),
			),
		};
	}),
);

/**
 * protectedQuery - Required auth, RLS enforced
 * Use for: User-specific reads
 */
export const protectedQuery = customQuery(
	rawQuery,
	customCtx(async (ctx) => {
		const user = await getUser(ctx);
		if (!user) throw new AuthError("Authentication required");
		return {
			user,
			db: wrapDatabaseReader(ctx, ctx.db, rlsRules(user._id)),
		};
	}),
);

/**
 * protectedMutation - Required auth, RLS enforced, Triggers active
 * Use for: User-specific writes (most common)
 */
export const protectedMutation = customMutation(
	rawMutation,
	customCtx(async (ctx) => {
		const user = await getUser(ctx);
		if (!user) throw new AuthError("Authentication required");
		const triggeredCtx = triggers.wrapDB(ctx);
		return {
			user,
			db: wrapDatabaseWriter(ctx, triggeredCtx.db, rlsRules(user._id)),
		};
	}),
);

/**
 * action - Optional auth
 */
export const action = customAction(
	rawAction,
	customCtx(async (ctx) => {
		const user = await getActionUser(ctx);
		return { user };
	}),
);

/**
 * protectedAction - Required auth
 */
export const protectedAction = customAction(
	rawAction,
	customCtx(async (ctx) => {
		const user = await getActionUser(ctx);
		if (!user) throw new AuthError("Authentication required");
		return { user };
	}),
);

/**
 * internalQuery - No auth, no RLS (trusted)
 * Use for: Scheduled jobs, internal reads
 */
export const internalQuery = rawInternalQuery;

/**
 * internalMutation - No auth, no RLS, Triggers active
 * Use for: Scheduled jobs, webhooks, system writes
 */
export const internalMutation = customMutation(
	rawInternalMutation,
	customCtx(triggers.wrapDB),
);

// ════════════════════════════════════════════════════════════════════════════
// ZOD-POWERED WRAPPERS — For Zod argument validation
// ════════════════════════════════════════════════════════════════════════════

/**
 * zQuery - Optional auth, RLS enforced, Zod validation
 * Use for: Public reads with Zod schemas (z.string(), z.email(), etc.)
 */
export const zQuery = zCustomQuery(
	rawQuery,
	customCtx(async (ctx) => {
		const user = await getUser(ctx);
		return {
			user,
			db: wrapDatabaseReader(ctx, ctx.db, rlsRules(user?._id ?? null)),
		};
	}),
);

/**
 * zMutation - Optional auth, RLS enforced, Triggers active, Zod validation
 * Use for: Public writes with Zod schemas
 */
export const zMutation = zCustomMutation(
	rawMutation,
	customCtx(async (ctx) => {
		const user = await getUser(ctx);
		const triggeredCtx = triggers.wrapDB(ctx);
		return {
			user,
			db: wrapDatabaseWriter(
				ctx,
				triggeredCtx.db,
				rlsRules(user?._id ?? null),
			),
		};
	}),
);

/**
 * zProtectedQuery - Required auth, RLS enforced, Zod validation
 * Use for: User-specific reads with Zod schemas
 */
export const zProtectedQuery = zCustomQuery(
	rawQuery,
	customCtx(async (ctx) => {
		const user = await getUser(ctx);
		if (!user) throw new AuthError("Authentication required");
		return {
			user,
			db: wrapDatabaseReader(ctx, ctx.db, rlsRules(user._id)),
		};
	}),
);

/**
 * zProtectedMutation - Required auth, RLS enforced, Triggers active, Zod validation
 * Use for: User-specific writes with Zod schemas (MOST POWERFUL)
 */
export const zProtectedMutation = zCustomMutation(
	rawMutation,
	customCtx(async (ctx) => {
		const user = await getUser(ctx);
		if (!user) throw new AuthError("Authentication required");
		const triggeredCtx = triggers.wrapDB(ctx);
		return {
			user,
			db: wrapDatabaseWriter(ctx, triggeredCtx.db, rlsRules(user._id)),
		};
	}),
);

// ════════════════════════════════════════════════════════════════════════════
// RE-EXPORTS
// ════════════════════════════════════════════════════════════════════════════

export { v };
export { zid } from "convex-helpers/server/zod";
export { triggers } from "./triggers";

