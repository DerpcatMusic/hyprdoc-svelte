/**
 * lib/core.ts - SINGLE SOURCE OF TRUTH
 * ════════════════════════════════════════════════════════════════════════════
 * Every function in the backend imports from here. Period.
 */

import { v } from "convex/values";
import {
	customQuery,
	customMutation,
	customCtx,
	customAction,
} from "convex-helpers/server/customFunctions";
import { zCustomQuery, zCustomMutation, zCustomAction, zid } from "convex-helpers/server/zod4";
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
import type { DataModel, Id, Doc } from "../_generated/dataModel";
import { triggers } from "./triggers";
import * as zod4 from "zod/v4";

// ════════════════════════════════════════════════════════════════════════════
// TYPES & ERRORS
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
// USER RESOLUTION helper
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
// RLS RULES - ALL TABLES (Static Definitions)
// ════════════════════════════════════════════════════════════════════════════

function rlsRules(userId: Id<"users"> | null): Rules<QueryCtx, DataModel> {
	return {
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
			read: async (ctx, auditLog) => {
				if (!auditLog.documentId) return false;
				const doc = await ctx.db.get(auditLog.documentId);
				return doc ? doc.ownerId === userId : false;
			},
			insert: async () => true,
			modify: async () => false,
		},
		documentVersions: {
			read: async (ctx, version) => {
				const doc = await ctx.db.get(version.documentId);
				return doc ? doc.isPublic === true || doc.ownerId === userId : false;
			},
			insert: async () => !!userId,
			modify: async () => false,
		},
		blockLineageEvents: {
			read: async (ctx, event) => {
				const doc = await ctx.db.get(event.documentId);
				return doc ? doc.ownerId === userId : false;
			},
			insert: async (ctx, event) => {
				const doc = await ctx.db.get(event.documentId);
				return doc?.ownerId === userId;
			},
			modify: async () => false,
		},
		liveContractStates: {
			read: async (ctx, state) => {
				const doc = await ctx.db.get(state.documentId);
				return doc ? doc.ownerId === userId : false;
			},
			insert: async (ctx, state) => {
				const doc = await ctx.db.get(state.documentId);
				return doc?.ownerId === userId;
			},
			modify: async (ctx, state) => {
				const doc = await ctx.db.get(state.documentId);
				return doc?.ownerId === userId;
			},
		},
		liveContractEvents: {
			read: async (ctx, event) => {
				const doc = await ctx.db.get(event.documentId);
				return doc ? doc.ownerId === userId : false;
			},
			insert: async (ctx, event) => {
				const doc = await ctx.db.get(event.documentId);
				return doc?.ownerId === userId;
			},
			modify: async () => false,
		},
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
			insert: async () => true,
			modify: async () => false,
		},
		signingSessions: {
			read: async (ctx, session) => {
				const doc = await ctx.db.get(session.documentId);
				return doc ? doc.ownerId === userId : false;
			},
			insert: async (ctx, session) => {
				const doc = await ctx.db.get(session.documentId);
				return doc?.ownerId === userId;
			},
			modify: async (ctx, session) => {
				const doc = await ctx.db.get(session.documentId);
				return doc?.ownerId === userId;
			},
		},
		signerAssignments: {
			read: async (ctx, assignment) => {
				const doc = await ctx.db.get(assignment.documentId);
				return doc ? doc.ownerId === userId : false;
			},
			insert: async (ctx, assignment) => {
				const doc = await ctx.db.get(assignment.documentId);
				return doc?.ownerId === userId;
			},
			modify: async (ctx, assignment) => {
				const doc = await ctx.db.get(assignment.documentId);
				return doc?.ownerId === userId;
			},
		},
		documentMembers: {
			read: async (ctx, member) => {
				const doc = await ctx.db.get(member.documentId);
				if (doc?.ownerId === userId) return true;
				return member.workosId === (userId as unknown as string);
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
				return !!doc;
			},
			modify: async (ctx, change) => {
				const doc = await ctx.db.get(change.documentId);
				return doc?.ownerId === userId;
			},
		},
		aiTemplates: {
			read: async (_, template) => template.isActive !== false,
			insert: async () => !!userId,
			modify: async (_, template) => template.workosId === (userId as unknown as string),
		},
		glossaryTerms: {
			read: async (_, term) => !term.workosId || term.workosId === (userId as unknown as string),
			insert: async () => !!userId,
			modify: async (_, term) => term.workosId === (userId as unknown as string),
		},
		globalVariables: {
			read: async (ctx, variable) => {
				if (variable.scope === "system") return true;
				if (variable.scope === "user") return variable.workosId === (userId as unknown as string);
				if (variable.scope === "document" && variable.documentId) {
					const doc = await ctx.db.get(variable.documentId);
					return doc ? doc.ownerId === userId || doc.isPublic === true : false;
				}
				return false;
			},
			insert: async () => !!userId,
			modify: async (_, variable) => {
				if (variable.scope === "system") return false;
				return variable.workosId === (userId as unknown as string);
			},
		},
		hubspotConnections: {
			read: async (_, conn) => conn.workosId === (userId as unknown as string),
			insert: async () => !!userId,
			modify: async (_, conn) => conn.workosId === (userId as unknown as string),
		},
		hubspotMappings: {
			read: async (_, mapping) => mapping.workosId === (userId as unknown as string),
			insert: async () => !!userId,
			modify: async (_, mapping) => mapping.workosId === (userId as unknown as string),
		},
		hubspotWebhookLogs: {
			read: async () => false,
			insert: async () => true,
			modify: async () => false,
		},
		pendingSubscriptions: {
			read: async () => false,
			insert: async () => true,
			modify: async () => true,
		},
		otpCodes: {
			read: async () => false,
			insert: async () => true,
			modify: async () => true,
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
// WRAPPERS (ZOD) — Defined BEFORE recursive imports
// ════════════════════════════════════════════════════════════════════════════

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

export const zInternalQuery = zCustomQuery(
	rawInternalQuery,
	customCtx(async () => ({})),
);

// ═══════════════════════════════════════════════════════════════════════════
// RE-EXPORTS (ZOD)
// ═══════════════════════════════════════════════════════════════════════════

export { zod4 as z };
export { zid };
export type { Rules };
export { triggers };

// ═══════════════════════════════════════════════════════════════════════════
// WRAPPERS (MUTATIONS & ACTIONS) — Defined BEFORE recursive imports
// ═══════════════════════════════════════════════════════════════════════════

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

export const zInternalMutation = zCustomMutation(
	rawInternalMutation,
	customCtx(triggers.wrapDB),
);

// ═══════════════════════════════════════════════════════════════════════════
// ACTION HELPERS (Break Circular Dependency)
// ═══════════════════════════════════════════════════════════════════════════

// NOTE: We avoid importing from "../_generated/api" at the top level
// to prevent a circular dependency (core -> api -> mutations -> core).
// Instead, we use string-based references for internal queries in actions.

async function getActionUser(ctx: ActionCtx): Promise<AuthUser | null> {
	const identity = await ctx.auth.getUserIdentity();
	if (!identity) return null;

	// Use string reference to break the static 'api' cycle
	const user = await ctx.runQuery("users/queries:internalGetByWorkosId" as any, {
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

export const zAction = zCustomAction(
	rawAction,
	customCtx(async (ctx) => ({ user: await getActionUser(ctx) })),
);

export const zProtectedAction = zCustomAction(
	rawAction,
	customCtx(async (ctx) => {
		const user = await getActionUser(ctx);
		if (!user) throw new AuthError("Authentication required");
		return { user };
	}),
);

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY (NON-ZOD) WRAPPERS
// ─────────────────────────────────────────────────────────────────────────────

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

export const internalQuery = rawInternalQuery;

export const internalMutation = customMutation(
	rawInternalMutation,
	customCtx(triggers.wrapDB),
);

export const action = customAction(
	rawAction,
	customCtx(async (ctx) => ({ user: await getActionUser(ctx) })),
);

export const protectedAction = customAction(
	rawAction,
	customCtx(async (ctx) => {
		const user = await getActionUser(ctx);
		if (!user) throw new AuthError("Authentication required");
		return { user };
	}),
);
