/**
 * globalVariables/logic.ts - Variable Resolution Logic
 * ════════════════════════════════════════════════════════════════════════════
 * Shared helper for merging variables with proper precedence:
 * document > user > signer-indexed > system
 */

import type { Id } from "@/convex/_generated/dataModel";
import type { QueryCtx } from "@/convex/_generated/server";
import { SYSTEM_VARIABLES } from "./constants";
import type { GlobalVariable, VariableFormat } from "./types";

// ════════════════════════════════════════════════════════════════════════════
// DATE FORMATTING
// ════════════════════════════════════════════════════════════════════════════

function formatDate(date: Date, format?: VariableFormat): string {
	switch (format) {
		case "short":
			return date.toLocaleDateString("en-US", {
				month: "2-digit",
				day: "2-digit",
				year: "numeric",
			});
		case "iso":
			return date.toISOString().split("T")[0];
		case "long":
		default:
			return date.toLocaleDateString("en-US", {
				month: "long",
				day: "numeric",
				year: "numeric",
			});
	}
}

// ════════════════════════════════════════════════════════════════════════════
// SYSTEM VARIABLE RESOLUTION
// ════════════════════════════════════════════════════════════════════════════

function resolveSystemVariables(
	document: { title?: string; _creationTime?: number } | null,
): GlobalVariable[] {
	const now = new Date();

	return SYSTEM_VARIABLES.map((sv) => {
		let value: string | null = null;

		switch (sv.name) {
			case "today":
				value = formatDate(now);
				break;
			case "now":
				value = now.toLocaleString("en-US", {
					month: "long",
					day: "numeric",
					year: "numeric",
					hour: "numeric",
					minute: "2-digit",
				});
				break;
			case "current_year":
				value = String(now.getFullYear());
				break;
			case "current_month":
				value = now.toLocaleDateString("en-US", { month: "long" });
				break;
			case "document_title":
				value = document?.title ?? null;
				break;
			case "document_created":
				value = document?._creationTime
					? formatDate(new Date(document._creationTime))
					: null;
				break;
			case "document_id":
				// This would be set by the caller with actual document ID
				value = null;
				break;
			default:
				value = null;
		}

		return {
			_id: `system_${sv.name}`,
			name: sv.name,
			displayName: sv.displayName,
			value,
			type: sv.type,
			scope: "system" as const,
			category: sv.category,
			description: sv.description,
			fallback: "",
			createdAt: 0,
			updatedAt: 0,
		};
	});
}

// ════════════════════════════════════════════════════════════════════════════
// SIGNER-INDEXED VARIABLES
// ════════════════════════════════════════════════════════════════════════════

interface Signer {
	legalName?: string;
	email?: string;
	role?: string;
}

function generateSignerVariables(signers: Signer[]): GlobalVariable[] {
	const variables: GlobalVariable[] = [];

	for (const [index, signer] of signers.entries()) {
		const num = String(index + 1).padStart(2, "0"); // "01", "02", etc.
		const baseProps = {
			scope: "system" as const,
			fallback: "",
			createdAt: 0,
			updatedAt: 0,
		};

		variables.push(
			{
				_id: `signer_${num}_name`,
				name: `signer_${num}_name`,
				displayName: `Signer ${num} Name`,
				value: signer.legalName ?? null,
				type: "text",
				category: `Signer ${num}`,
				description: `Name of signer #${index + 1}`,
				...baseProps,
			},
			{
				_id: `signer_${num}_email`,
				name: `signer_${num}_email`,
				displayName: `Signer ${num} Email`,
				value: signer.email ?? null,
				type: "text",
				category: `Signer ${num}`,
				description: `Email of signer #${index + 1}`,
				...baseProps,
			},
			{
				_id: `signer_${num}_role`,
				name: `signer_${num}_role`,
				displayName: `Signer ${num} Role`,
				value: signer.role ?? null,
				type: "text",
				category: `Signer ${num}`,
				description: `Role of signer #${index + 1}`,
				...baseProps,
			},
		);
	}

	return variables;
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN HELPER: List All Variables for Document
// ════════════════════════════════════════════════════════════════════════════

/**
 * Returns all variables available for a document, merged with precedence:
 * document-scoped > user-scoped > signer-indexed > system
 */
export async function listForDocumentHelper(
	ctx: QueryCtx,
	args: { documentId?: Id<"documents"> },
): Promise<GlobalVariable[]> {
	const identity = await ctx.auth.getUserIdentity();

	// 1. Get document if specified
	const document = args.documentId ? await ctx.db.get(args.documentId) : null;

	// 2. Start with system variables (always available)
	const systemVars = resolveSystemVariables(document);

	// 3. Get signer-indexed variables if document exists
	let signerVars: GlobalVariable[] = [];
	if (args.documentId) {
		const signers = await ctx.db
			.query("signers")
			.withIndex("by_document", (q) => q.eq("documentId", args.documentId!))
			.collect();
		signerVars = generateSignerVariables(signers);
	}

	// 4. Get user-scoped variables
	let userVars: GlobalVariable[] = [];
	if (identity) {
		const dbUser = await ctx.db
			.query("users")
			.withIndex("by_workos_id", (q) => q.eq("workosId", identity.subject))
			.first();

		if (dbUser) {
			const userVariables = await ctx.db
				.query("globalVariables")
				.withIndex("by_user", (q) => q.eq("workosId", dbUser._id))
				.collect();

			userVars = userVariables
				.filter((v) => v.scope === "user")
				.map((v) => ({
					...v,
					value: v.value ?? null,
				})) as GlobalVariable[];
		}
	}

	// 5. Get document-scoped variables
	let docVars: GlobalVariable[] = [];
	if (args.documentId) {
		const docVariables = await ctx.db
			.query("globalVariables")
			.withIndex("by_document", (q) => q.eq("documentId", args.documentId))
			.collect();

		docVars = docVariables
			.filter((v) => v.scope === "document")
			.map((v) => ({
				...v,
				value: v.value ?? null,
			})) as GlobalVariable[];
	}

	// 6. Merge with precedence: document > user > signer > system
	const variableMap = new Map<string, GlobalVariable>();

	for (const v of systemVars) variableMap.set(v.name, v);
	for (const v of signerVars) variableMap.set(v.name, v);
	for (const v of userVars) variableMap.set(v.name, v);
	for (const v of docVars) variableMap.set(v.name, v);

	return [...variableMap.values()];
}

// ════════════════════════════════════════════════════════════════════════════
// VARIABLE NAME VALIDATION
// ════════════════════════════════════════════════════════════════════════════

/**
 * Validates variable name format.
 * Must start with letter, contain only letters/numbers/underscores.
 */
export function validateVariableName(name: string): { valid: boolean; error?: string } {
	if (!name || name.length === 0) {
		return { valid: false, error: "Name is required" };
	}
	if (name.length > 50) {
		return { valid: false, error: "Name must be 50 characters or less" };
	}
	if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) {
		return {
			valid: false,
			error: "Name must start with a letter and contain only letters, numbers, and underscores",
		};
	}
	// Check for reserved system variable names
	if (SYSTEM_VARIABLES.some((sv) => sv.name === name)) {
		return { valid: false, error: "This name is reserved for system variables" };
	}
	return { valid: true };
}

/**
 * Generates a display name from a variable name.
 * e.g., "company_address" → "Company Address"
 */
export function generateDisplayName(name: string): string {
	return name
		.replace(/_/g, " ")
		.replace(/\b\w/g, (c) => c.toUpperCase());
}
