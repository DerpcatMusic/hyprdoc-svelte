/**
 * globalVariables/mutations.ts - Variable CRUD Operations
 * ════════════════════════════════════════════════════════════════════════════
 * Uses protectedMutation for auth + RLS. Validates names and prevents
 * modification of system variables.
 */

import { zProtectedMutation, z, zid } from "../lib/core";
import { validateVariableName, generateDisplayName } from "./logic";

// ════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ════════════════════════════════════════════════════════════════════════════

const VariableTypeSchema = z.enum([
	"text",
	"number",
	"date",
	"currency",
	"boolean",
]);

const VariableScopeSchema = z.enum(["document", "user"]);

const VariableValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

// ════════════════════════════════════════════════════════════════════════════
// CREATE
// ════════════════════════════════════════════════════════════════════════════

/**
 * Create a new variable.
 */
export const create = zProtectedMutation({
	args: {
		name: z.string(),
		displayName: z.string().optional(),
		value: VariableValueSchema,
		type: VariableTypeSchema,
		scope: VariableScopeSchema,
		category: z.string().optional(),
		description: z.string().optional(),
		placeholder: z.string().optional(),
		fallback: z.string().optional(),
		isRequired: z.boolean().optional(),
		documentId: zid("documents").optional(),
	},
	handler: async (ctx, args) => {
		// Validate name format
		const validation = validateVariableName(args.name);
		if (!validation.valid) {
			throw new Error(validation.error);
		}

		// Check for duplicates within scope
		if (args.scope === "document" && args.documentId) {
			const existing = await ctx.db
				.query("globalVariables")
				.withIndex("by_name_and_document", (q) =>
					q.eq("name", args.name).eq("documentId", args.documentId),
				)
				.first();

			if (existing) {
				throw new Error(
					`Variable "${args.name}" already exists in this document`,
				);
			}
		} else if (args.scope === "user") {
			const existing = await ctx.db
				.query("globalVariables")
				.withIndex("by_name_and_user", (q) =>
					q.eq("name", args.name).eq("workosId", ctx.user._id),
				)
				.first();

			if (existing) {
				throw new Error(`Variable "${args.name}" already exists`);
			}
		}

		const now = Date.now();
		return ctx.db.insert("globalVariables", {
			name: args.name,
			displayName: args.displayName ?? generateDisplayName(args.name),
			value: args.value,
			type: args.type,
			scope: args.scope,
			category: args.category ?? "Custom",
			fallback: args.fallback,
			documentId: args.scope === "document" ? args.documentId : undefined,
			workosId: ctx.user._id,
			createdAt: now,
			updatedAt: now,
		});
	},
});

// ════════════════════════════════════════════════════════════════════════════
// UPDATE
// ════════════════════════════════════════════════════════════════════════════

/**
 * Update an existing variable.
 */
export const update = zProtectedMutation({
	args: {
		id: zid("globalVariables"),
		value: VariableValueSchema.optional(),
		displayName: z.string().optional(),
		category: z.string().optional(),
		description: z.string().optional(),
		placeholder: z.string().optional(),
		fallback: z.string().optional(),
		isRequired: z.boolean().optional(),
	},
	handler: async (ctx, args) => {
		const variable = await ctx.db.get(args.id);
		if (!variable) {
			throw new Error("Variable not found");
		}

		// Prevent modifying system variables
		if (variable.scope === "system") {
			throw new Error("Cannot modify system variables");
		}

		// Check ownership
		if (variable.workosId !== ctx.user._id) {
			throw new Error("You don't have permission to modify this variable");
		}

		const { id, ...updates } = args;
		await ctx.db.patch(id, {
			...updates,
			updatedAt: Date.now(),
		});
	},
});

/**
 * Quick update - just the value (for inline editing).
 */
export const quickUpdate = zProtectedMutation({
	args: {
		id: zid("globalVariables"),
		value: VariableValueSchema,
	},
	handler: async (ctx, args) => {
		const variable = await ctx.db.get(args.id);
		if (!variable) {
			throw new Error("Variable not found");
		}

		if (variable.scope === "system") {
			throw new Error("Cannot modify system variables");
		}

		if (variable.workosId !== ctx.user._id) {
			throw new Error("You don't have permission to modify this variable");
		}

		await ctx.db.patch(args.id, {
			value: args.value,
			updatedAt: Date.now(),
		});
	},
});

// ════════════════════════════════════════════════════════════════════════════
// DELETE
// ════════════════════════════════════════════════════════════════════════════

/**
 * Delete a variable.
 */
export const remove = zProtectedMutation({
	args: {
		id: zid("globalVariables"),
	},
	handler: async (ctx, args) => {
		const variable = await ctx.db.get(args.id);
		if (!variable) {
			throw new Error("Variable not found");
		}

		// Prevent deleting system variables
		if (variable.scope === "system") {
			throw new Error("Cannot delete system variables");
		}

		// Check ownership
		if (variable.workosId !== ctx.user._id) {
			throw new Error("You don't have permission to delete this variable");
		}

		await ctx.db.delete(args.id);
	},
});

// ════════════════════════════════════════════════════════════════════════════
// BULK OPERATIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Create multiple variables at once (for onboarding/templates).
 */
export const createBatch = zProtectedMutation({
	args: {
		variables: z.array(
			z.object({
				name: z.string(),
				displayName: z.string().optional(),
				value: VariableValueSchema,
				type: VariableTypeSchema,
				scope: VariableScopeSchema,
				category: z.string().optional(),
				documentId: zid("documents").optional(),
			}),
		),
	},
	handler: async (ctx, args) => {
		const now = Date.now();
		const ids: string[] = [];

		for (const variable of args.variables) {
			// Validate each name
			const validation = validateVariableName(variable.name);
			if (!validation.valid) {
				throw new Error(`${variable.name}: ${validation.error}`);
			}

			const id = await ctx.db.insert("globalVariables", {
				...variable,
				displayName: variable.displayName ?? generateDisplayName(variable.name),
				category: variable.category ?? "Custom",
				documentId:
					variable.scope === "document" ? variable.documentId : undefined,
				workosId: ctx.user._id,
				createdAt: now,
				updatedAt: now,
			});
			ids.push(id);
		}

		return ids;
	},
});
