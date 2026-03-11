/**
 * lib/triggers.ts - Auto-Audit Trigger Registry
 * ════════════════════════════════════════════════════════════════════════════
 * Registers triggers that fire on every DB change.
 * Import { triggers } from here into core.ts.
 */

import { Triggers } from "convex-helpers/server/triggers";
import type { DataModel } from "../_generated/dataModel";
import { generateAuditHash } from "./crypto";

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

	const timestamp = Date.now();
	const previousEntry = await ctx.db
		.query("auditLogs")
		.withIndex("by_timestamp")
		.order("desc")
		.first();
	const previousHash = previousEntry?.entryHash ?? null;
	const entryHash = await generateAuditHash(
		{
			action,
			timestamp,
			resourceId: String(change.id),
			metadata: {
				operation: change.operation,
				title: change.newDoc?.title ?? change.oldDoc?.title,
			},
		},
		previousHash,
	);

	await ctx.db.insert("auditLogs", {
		workosId: change.newDoc?.ownerId ?? change.oldDoc?.ownerId,
		actorType: "system",
		resourceType: "document",
		resourceId: String(change.id),
		action,
		level: "info",
		timestamp,
		previousHash: previousHash ?? undefined,
		entryHash,
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
		const timestamp = Date.now();
		const previousEntry = await ctx.db
			.query("auditLogs")
			.withIndex("by_timestamp")
			.order("desc")
			.first();
		const previousHash = previousEntry?.entryHash ?? null;
		const entryHash = await generateAuditHash(
			{
				action: "user.created",
				timestamp,
				resourceId: String(change.id),
				metadata: { email: change.newDoc?.email },
			},
			previousHash,
		);

		await ctx.db.insert("auditLogs", {
			workosId: change.id,
			actorType: "system",
			resourceType: "user",
			resourceId: String(change.id),
			action: "user.created",
			level: "info",
			timestamp,
			previousHash: previousHash ?? undefined,
			entryHash,
			metadata: { email: change.newDoc?.email },
		});
	}
});
