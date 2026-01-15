/**
 * lib/triggers.ts - Auto-Audit Trigger Registry
 * ════════════════════════════════════════════════════════════════════════════
 * Registers triggers that fire on every DB change.
 * Import { triggers } from here into core.ts.
 */

import { Triggers } from "convex-helpers/server/triggers";
import type { DataModel } from "../_generated/dataModel";

// ════════════════════════════════════════════════════════════════════════════
// TRIGGER REGISTRY
// ════════════════════════════════════════════════════════════════════════════

export const triggers = new Triggers<DataModel>();

// ─────────────────────────────────────────────────────────────────────────────
// Documents → Auto-Audit
// ─────────────────────────────────────────────────────────────────────────────
triggers.register("documents", async (ctx, change) => {
	const action =
		change.operation === "insert"
			? "document.created"
			: change.operation === "update"
				? "document.updated"
				: "document.deleted";

	await ctx.db.insert("auditLogs", {
		workosId: change.newDoc?.ownerId ?? change.oldDoc?.ownerId,
		actorType: "system",
		resourceType: "document",
		resourceId: String(change.id),
		action,
		level: "info",
		timestamp: Date.now(),
		entryHash: `${change.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
		metadata: {
			operation: change.operation,
			title: change.newDoc?.title ?? change.oldDoc?.title,
		},
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// Users → Auto-Audit (creation only)
// ─────────────────────────────────────────────────────────────────────────────
triggers.register("users", async (ctx, change) => {
	if (change.operation === "insert") {
		await ctx.db.insert("auditLogs", {
			workosId: change.id,
			actorType: "system",
			resourceType: "user",
			resourceId: String(change.id),
			action: "user.created",
			level: "info",
			timestamp: Date.now(),
			entryHash: `${change.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
			metadata: { email: change.newDoc?.email },
		});
	}
});
